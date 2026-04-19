import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DraggableList } from "~/components/DraggableTaskList";
import { NoteItem } from "~/components/NoteItem";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useDeleteNote, useUpdateNote } from "~/features/notes/mutations";
import {
  fetchNotesQueryOptions,
  searchNotesQueryOptions,
} from "~/features/notes/queries";
import { Note } from "~/features/notes/types";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({
    meta: [{ title: "Notes - whatIdid" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(fetchNotesQueryOptions(1));
    return null;
  },
  component: NotesView,
});

function NotesView() {
  const { setDefaultStartDate, setDefaultTagIds, handleOpenNoteDialog } =
    useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
    setDefaultTagIds(undefined);
  }, [setDefaultStartDate, setDefaultTagIds]);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearching = debouncedQuery.length > 0;

  const { data: paginatedData } = useQuery({
    ...fetchNotesQueryOptions(page),
    enabled: !isSearching,
  });

  const { data: searchResults } = useQuery({
    ...searchNotesQueryOptions(debouncedQuery),
    enabled: isSearching,
  });

  const notes: Note[] = isSearching
    ? ((searchResults as Note[]) ?? [])
    : (paginatedData?.notes ?? []);
  const totalPages = paginatedData?.totalPages ?? 1;

  const { mutate: deleteNoteMutation } = useDeleteNote();
  const { mutate: updateNoteMutation } = useUpdateNote();

  function handleEdit(note: Note) {
    handleOpenNoteDialog(note);
  }

  function handleDelete(noteId: string) {
    deleteNoteMutation(noteId);
  }

  function handleDropOnDate(noteId: string, date: string) {
    updateNoteMutation({ id: noteId, date });
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center gap-2 pl-8">
          <h2 className="text-lg font-medium">Notes</h2>
        </header>

        {/* Search bar */}
        <div className="mt-4 pr-4 pl-8">
          <Input
            type="search"
            placeholder="Search notes…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>

        {/* Notes list */}
        <div className="mt-4">
          {notes.length > 0 ? (
            <DraggableList items={notes} onDropOnDate={handleDropOnDate}>
              {(note, isDragging, dragAttributes, dragListeners) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={isDragging}
                  dragAttributes={dragAttributes}
                  dragListeners={dragListeners}
                />
              )}
            </DraggableList>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {isSearching ? "No matching notes." : "No notes yet."}
            </p>
          )}
        </div>

        {/* Pagination */}
        {!isSearching && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 pb-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
