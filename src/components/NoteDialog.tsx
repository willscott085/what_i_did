import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import {
  useCreateNote,
  useProcessNoteWithAI,
  useUpdateNote,
} from "~/features/notes/mutations";
import { fetchNoteQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  defaultDate?: string;
  defaultTagIds?: string[];
}

export function NoteDialog({
  open,
  onOpenChange,
  note,
  defaultDate,
  defaultTagIds,
}: NoteDialogProps) {
  const {
    data: noteWithRelations,
    isLoading,
    isError,
  } = useQuery({
    ...fetchNoteQueryOptions(note?.id ?? ""),
    enabled: open && !!note?.id,
  });

  const resolvedNote = note?.id
    ? (noteWithRelations ??
      (isError
        ? {
            ...note,
            tags: note.tags.map((t) => ({
              ...t,
              description: null,
              color: null,
              userId: "1",
              dateCreated: note.dateCreated,
              updatedAt: note.dateCreated,
            })),
            metadata: null,
          }
        : null))
    : null;

  const formKey = `${open}-${note?.id ?? "new"}-${resolvedNote?.id ?? "pending"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        {isLoading && note?.id ? (
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
          </DialogHeader>
        ) : (
          <NoteDialogForm
            key={formKey}
            note={resolvedNote}
            defaultDate={defaultDate}
            defaultTagIds={defaultTagIds}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NoteDialogForm({
  note,
  defaultDate,
  defaultTagIds,
  onOpenChange,
}: {
  note?: {
    id: string;
    content: string;
    title: string | null;
    date: string | null;
    tags: { id: string; name: string }[];
  } | null;
  defaultDate?: string;
  defaultTagIds?: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!note;

  const [content, setContent] = useState(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [date, setDate] = useState(note?.date ?? defaultDate ?? "");
  const [tagIds, setTagIds] = useState<string[]>(
    note?.tags?.map((t) => t.id) ?? defaultTagIds ?? [],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote();
  const { mutateAsync: updateNote, isPending: isUpdating } = useUpdateNote();
  const { mutate: triggerAI } = useProcessNoteWithAI();

  const isPending = isCreating || isUpdating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    if (isEditing && note) {
      await updateNote({
        id: note.id,
        content: content.trim(),
        title: title.trim() || null,
        date: date || null,
        tagIds,
      });

      // Re-trigger AI if content changed and title was AI-generated (user didn't set one)
      if (content.trim() !== note.content && !title.trim()) {
        triggerAI(note.id);
      }
    } else {
      const result = await createNote({
        content: content.trim(),
        title: title.trim() || undefined,
        date: date || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      // Fire-and-forget AI processing — only when no title is set
      if (result?.id && !title.trim()) {
        triggerAI(result.id);
      }
    }

    onOpenChange(false);
  }

  function wrapSelection(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const wrapped = `${before}${selected || "text"}${after}`;
    const next = content.slice(0, start) + wrapped + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = selected
        ? start + wrapped.length
        : start + before.length;
      const selEnd = selected
        ? start + wrapped.length
        : start + before.length + 4; // select "text"
      ta.setSelectionRange(cursorPos, selEnd);
    });
  }

  function prefixLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const next =
      content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(next);
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
    const selected = content.slice(start, end);
    const linkText = selected || "link text";
    const inserted = `[${linkText}](url)`;
    const next = content.slice(0, start) + inserted + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      // Select "url" so user can type the URL immediately
      const urlStart = start + linkText.length + 3; // [text](
      const urlEnd = urlStart + 3; // url
      ta.setSelectionRange(urlStart, urlEnd);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Note" : "New Note"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="scrollbar-hide space-y-4 overflow-x-hidden overflow-y-auto pb-6">
          {/* Content */}
          <div className="space-y-1.5 px-4">
            <Label htmlFor="note-content">Content</Label>
            <div className="border-input focus-within:border-ring focus-within:ring-ring/50 rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
              {/* Formatting toolbar */}
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
                id="note-content"
                placeholder="Jot something down…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                spellCheck
                className="placeholder:text-muted-foreground dark:bg-input/30 block min-h-[200px] w-full resize-y bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5 px-4">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              type="text"
              placeholder="AI will generate a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              spellCheck
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5 px-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-date">Date</Label>
              {date && (
                <button
                  type="button"
                  className="cursor-pointer text-xs text-blue-500 hover:text-blue-600"
                  onClick={() => setDate("")}
                >
                  Clear
                </button>
              )}
            </div>
            <Input
              id="note-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5 px-4">
            <Label>Tags</Label>
            <TagMultiSelect selectedTagIds={tagIds} onChange={setTagIds} />
          </div>
        </div>

        <DialogFooter className="bg-background border-border shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !content.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </>
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
