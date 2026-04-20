export const DEFAULT_USER_ID = "1";

export const itemsQueryKeys = {
  all: ["items"] as const,
  byId: (id: string) => ["items", id] as const,
  subtasks: (parentId: string) => ["items", parentId, "subtasks"] as const,
  byType: (type: string) => ["items", "type", type] as const,
  byDate: (date: string) => ["items", "byDate", date] as const,
  byTag: (tagId: string) => ["items", "byTag", tagId] as const,
};
