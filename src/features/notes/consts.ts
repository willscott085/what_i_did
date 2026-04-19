export const DEFAULT_USER_ID = "1";

export const notesQueryKeys = {
  all: ["notes"] as const,
  byId: (id: string) => ["notes", id] as const,
  byDate: (date: string) => ["notes", "byDate", date] as const,
  byTag: (tagId: string) => ["notes", "byTag", tagId] as const,
  search: (query: string, tagIds?: string[]) =>
    [
      "notes",
      "search",
      query,
      ...(tagIds ? [tagIds.slice().sort()] : []),
    ] as const,
  paginated: (page: number) => ["notes", "paginated", page] as const,
};
