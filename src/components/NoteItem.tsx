import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVertical,
  PencilIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Markdown } from "~/components/Markdown";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useDeleteNote } from "~/features/notes/mutations";
import { useIsTruncated } from "~/hooks/useIsTruncated";
import { Note } from "~/features/notes/types";

interface NoteItemProps {
  note: Note;
  isDragging?: boolean;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  hideTags?: boolean;
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
}

export function NoteItem({
  note,
  isDragging = false,
  onEdit,
  onDelete,
  hideTags,
  dragAttributes = {},
  dragListeners = {},
}: NoteItemProps) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: deleteNoteMutation } = useDeleteNote();

  const noteTags = note.tags ?? [];
  const hasTitle = !!note.title;

  function handleDelete() {
    if (onDelete) {
      onDelete(note.id);
    } else {
      deleteNoteMutation(note.id);
    }
  }

  return (
    <div
      className={clsx(
        "group/task relative",
        "origin-left transition-transform duration-150 ease-out",
        isDragging && "z-10 scale-105 opacity-80",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {/* Drag Handle */}
        <div className="flex h-7.5 items-center">
          <button
            type="button"
            {...dragAttributes}
            {...dragListeners}
            className="-ml-2 cursor-grab touch-none p-2 text-(--task-drag-handle) opacity-0 transition-opacity group-hover/task:opacity-100 hover:text-(--task-drag-handle-hover)"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        </div>

        {/* Note icon */}
        <div className="flex h-7.5 items-center">
          <StickyNoteIcon className="text-muted-foreground/50 size-5" />
        </div>

        {/* Content area */}
        <div className="relative flex min-w-0 grow flex-col">
          {/* First line: title (if present) or content preview */}
          <div className="flex items-center gap-2">
            {!hideTags && noteTags.length > 0 && (
              <div className="flex shrink-0 items-center gap-1 overflow-hidden">
                {noteTags.map((tag) => (
                  <NoteTagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}
            {hasTitle ? (
              <span
                className="flex h-7.5 min-w-0 flex-1 items-center truncate text-sm"
                title={note.title!}
              >
                {note.title}
              </span>
            ) : (
              <span className="text-muted-foreground flex h-7.5 min-w-0 flex-1 items-center truncate text-sm">
                {note.content}
              </span>
            )}
          </div>

          {/* Content preview below title, or expanded full content */}
          {hasTitle && note.content && (
            <div>
              {expanded ? (
                <div className="text-muted-foreground mb-1 pb-2 text-xs leading-normal break-words">
                  <Markdown className="[&_p]:m-0">{note.content}</Markdown>
                </div>
              ) : (
                <div className="text-muted-foreground mb-1 line-clamp-2 text-xs leading-normal break-words">
                  <Markdown className="[&_p]:m-0">{note.content}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* When no title, expanded shows full content as markdown */}
          {!hasTitle && expanded && note.content && (
            <div className="text-muted-foreground pb-2 text-xs leading-normal break-words">
              <Markdown className="[&_p]:m-0">{note.content}</Markdown>
            </div>
          )}
        </div>

        {/* Expand/collapse toggle */}
        {note.content && (
          <div className="flex h-7.5 items-center">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground shrink-0 p-1 opacity-0 transition-opacity group-hover/task:opacity-100"
              aria-label={expanded ? "Collapse note" : "Expand note"}
            >
              {expanded ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
          </div>
        )}

        {/* Action buttons */}
        {onEdit && (
          <div className="flex h-7.5 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 opacity-0 group-hover/task:opacity-100"
              onClick={() => onEdit(note)}
              aria-label="Edit note"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          </div>
        )}
        <div className="flex h-7.5 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hover:text-destructive size-7 opacity-0 group-hover/task:opacity-100"
            onClick={handleDelete}
            aria-label="Delete note"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoteTagBadge({ tag }: { tag: { id: string; name: string } }) {
  const [ref, isTruncated] = useIsTruncated<HTMLSpanElement>();

  const link = (
    <Link
      to="/tag/$tagId"
      params={{ tagId: tag.id }}
      className="bg-muted hover:bg-muted/80 inline-flex max-w-24 rounded px-1.5 py-0.5 text-[10px] leading-tight"
      onClick={(e) => e.stopPropagation()}
    >
      <span ref={ref} className="text-muted-foreground truncate">
        {tag.name}
      </span>
    </Link>
  );

  if (!isTruncated) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent>{tag.name}</TooltipContent>
    </Tooltip>
  );
}
