export const DEFAULT_USER_ID = "1";

export const eventsQueryKeys = {
  all: ["events"] as const,
  byId: (id: string) => ["events", id] as const,
  byDate: (date: string) => ["events", "byDate", date] as const,
  byTag: (tagId: string) => ["events", "byTag", tagId] as const,
};
