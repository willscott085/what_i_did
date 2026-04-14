import { Tag } from "~/features/tags/types";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  dateCreated: string;
  dateCompleted: string | null;
  startDate: string | null;
  userId: string;
  parentTaskId: string | null;
  sortOrder: number;
  subtaskCount: number;
  completedSubtaskCount: number;
};

export type TaskWithRelations = Task & {
  tags: Tag[];
  subtasks: Task[];
};

export type CreateTaskInput = {
  title: string;
  notes?: string;
  startDate?: string;
  parentTaskId?: string;
  tagIds?: string[];
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  notes?: string | null;
  startDate?: string | null;
  dateCompleted?: string | null;
  parentTaskId?: string | null;
  tagIds?: string[];
};
