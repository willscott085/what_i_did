import { useRef } from "react";
import {
  BoldIcon,
  CodeIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  StrikethroughIcon,
} from "lucide-react";
import { cn } from "~/utils/utils";

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "default";
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  size = "default",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const wrapped = `${before}${selected || "text"}${after}`;
    const next = value.slice(0, start) + wrapped + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = selected
        ? start + wrapped.length
        : start + before.length;
      const selEnd = selected
        ? start + wrapped.length
        : start + before.length + 4;
      ta.setSelectionRange(cursorPos, selEnd);
    });
  }

  function prefixLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  function insertLink() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const linkText = selected || "link text";
    const inserted = `[${linkText}](url)`;
    const next = value.slice(0, start) + inserted + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const urlStart = start + linkText.length + 3;
      const urlEnd = urlStart + 3;
      ta.setSelectionRange(urlStart, urlEnd);
    });
  }

  return (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
      <div className="border-border flex flex-wrap gap-0.5 border-b px-1.5 py-1">
        <ToolbarButton
          icon={<BoldIcon className="size-3.5" />}
          title="Bold"
          onClick={() => wrapSelection("**", "**")}
        />
        <ToolbarButton
          icon={<ItalicIcon className="size-3.5" />}
          title="Italic"
          onClick={() => wrapSelection("_", "_")}
        />
        <ToolbarButton
          icon={<StrikethroughIcon className="size-3.5" />}
          title="Strikethrough"
          onClick={() => wrapSelection("~~", "~~")}
        />
        <ToolbarSep />
        <ToolbarButton
          icon={<HeadingIcon className="size-3.5" />}
          title="Heading"
          onClick={() => prefixLine("## ")}
        />
        <ToolbarButton
          icon={<QuoteIcon className="size-3.5" />}
          title="Quote"
          onClick={() => prefixLine("> ")}
        />
        <ToolbarSep />
        <ToolbarButton
          icon={<ListIcon className="size-3.5" />}
          title="Bullet list"
          onClick={() => prefixLine("- ")}
        />
        <ToolbarButton
          icon={<ListOrderedIcon className="size-3.5" />}
          title="Numbered list"
          onClick={() => prefixLine("1. ")}
        />
        <ToolbarButton
          icon={<CodeIcon className="size-3.5" />}
          title="Code"
          onClick={() => wrapSelection("`", "`")}
        />
        <ToolbarButton
          icon={<LinkIcon className="size-3.5" />}
          title="Link"
          onClick={() => insertLink()}
        />
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        spellCheck
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        data-form-type="other"
        className={cn(
          "placeholder:text-muted-foreground dark:bg-input/30 block w-full resize-y bg-transparent px-3 py-2 text-sm outline-none",
          size === "sm" ? "min-h-[100px]" : "min-h-[200px]",
        )}
      />
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5 transition-colors"
    >
      {icon}
    </button>
  );
}

function ToolbarSep() {
  return <div className="bg-border mx-0.5 my-1 w-px" />;
}
