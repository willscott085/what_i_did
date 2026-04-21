import { Tag } from "~/features/tags/types";

/** Lightweight tag reference returned by SQL tag aggregation subqueries */
export type TagSummary = { id: string; name: string };

export type ItemType = "task" | "note" | "event";

export type Item = {
  id: string;
  type: ItemType;
  title: string;
  content: string | null;
  date: string | null;
  dateCompleted: string | null;
  parentItemId: string | null;
  sortOrder: string;
  userId: string;
  dateCreated: string;
  dateUpdated: string;
  subtaskCount: number;
  completedSubtaskCount: number;
  tags: TagSummary[];
};

export type ItemWithRelations = Item & {
  tags: Tag[];
  subtasks: Item[];
  metadata: {
    keywords: string | null;
  } | null;
};
