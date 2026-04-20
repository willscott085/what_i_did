import { Tag } from "~/features/tags/types";

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
  tags: { id: string; name: string }[];
};

export type ItemWithRelations = Item & {
  tags: Tag[];
  subtasks: Item[];
  metadata: {
    keywords: string | null;
  } | null;
};
