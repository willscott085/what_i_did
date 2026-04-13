export const DEFAULT_USER_ID = "1";

export const tasksQueryKeys = {
  all: ["tasks"] as const,
  byId: (id: string) => ["tasks", id] as const,
  subtasks: (parentId: string) => ["tasks", parentId, "subtasks"] as const,
};
