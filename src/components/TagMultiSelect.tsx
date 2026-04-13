import { useRef, useState } from "react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "~/utils/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { fetchTagsQueryOptions } from "~/features/tags/queries";
import { useCreateTag } from "~/features/tags/mutations";
import { Tag } from "~/features/tags/types";

interface TagMultiSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagMultiSelect({
  selectedTagIds,
  onChange,
}: TagMultiSelectProps) {
  const { data: allTags = [] } = useQuery(fetchTagsQueryOptions());
  const { mutateAsync: createNewTag } = useCreateTag();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const showCreate =
    filter.trim() &&
    !allTags.some((t) => t.name.toLowerCase() === filter.trim().toLowerCase());

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  function removeTag(tagId: string) {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  }

  async function handleCreate() {
    const name = filter.trim();
    if (!name) return;

    const newTag = await createNewTag({ name });
    if (newTag) {
      onChange([...selectedTagIds, newTag.id]);
    }
    setFilter("");
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {/* Selected tags chips */}
      <div
        className="border-input flex min-h-9 cursor-pointer flex-wrap items-center gap-1 rounded-md border px-2 py-1"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
      >
        {selectedTags.length === 0 && (
          <span className="text-muted-foreground text-sm">Select tags…</span>
        )}
        {selectedTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
        ))}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md">
          <div className="border-b p-2">
            <Input
              type="text"
              placeholder="Search or create…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreate) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>

          <ul className="max-h-48 overflow-y-auto p-1">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  onClick={() => toggleTag(tag.id)}
                >
                  <Checkbox
                    checked={selectedTagIds.includes(tag.id)}
                    tabIndex={-1}
                    className="pointer-events-none size-4"
                  />
                  {tag.color && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  <span>{tag.name}</span>
                </button>
              </li>
            ))}

            {showCreate && (
              <li>
                <button
                  type="button"
                  className="hover:bg-accent text-primary flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  onClick={handleCreate}
                >
                  <PlusIcon className="size-4" />
                  <span>Create &ldquo;{filter.trim()}&rdquo;</span>
                </button>
              </li>
            )}

            {filtered.length === 0 && !showCreate && (
              <li className="text-muted-foreground px-2 py-1.5 text-sm">
                No tags found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function TagChip({ tag, onRemove }: { tag: Tag; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "bg-secondary text-secondary-foreground",
      )}
    >
      {tag.color && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
      )}
      {tag.name}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:text-foreground text-muted-foreground ml-0.5"
        aria-label={`Remove tag: ${tag.name}`}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}
