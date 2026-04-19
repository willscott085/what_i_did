import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID, notesQueryKeys } from "./consts";
import {
  fetchNote,
  fetchNotes,
  fetchNotesByTag,
  fetchNotesForDate,
  searchNotes,
} from "./server";

export const fetchNotesQueryOptions = (page = 1) =>
  queryOptions({
    queryKey: notesQueryKeys.paginated(page),
    queryFn: () =>
      fetchNotes({ data: { userId: DEFAULT_USER_ID, page, limit: 50 } }),
  });

export const fetchNotesForDateQueryOptions = (date: string) =>
  queryOptions({
    queryKey: notesQueryKeys.byDate(date),
    queryFn: () =>
      fetchNotesForDate({ data: { userId: DEFAULT_USER_ID, date } }),
  });

export const fetchNotesByTagQueryOptions = (tagId: string) =>
  queryOptions({
    queryKey: notesQueryKeys.byTag(tagId),
    queryFn: () =>
      fetchNotesByTag({ data: { userId: DEFAULT_USER_ID, tagId } }),
  });

export const fetchNoteQueryOptions = (noteId: string) =>
  queryOptions({
    queryKey: notesQueryKeys.byId(noteId),
    queryFn: () => fetchNote({ data: { noteId, userId: DEFAULT_USER_ID } }),
  });

export const searchNotesQueryOptions = (query: string, tagIds?: string[]) =>
  queryOptions({
    queryKey: notesQueryKeys.search(query),
    queryFn: () =>
      searchNotes({ data: { userId: DEFAULT_USER_ID, query, tagIds } }),
    enabled: query.length > 0,
  });
