import { PriorityCategory } from "~/features/categories/types";
import { Tag } from "~/features/tags/types";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  dateCreated: string;
  dateCompleted: string | null;
  dueDate: string | null;
  dueTime: string | null;
  userId: string;
  priorityCategoryId: string | null;
  parentTaskId: string | null;
  recurrenceRule: string | null;
  sortOrder: number;
  subtaskCount: number;
  completedSubtaskCount: number;
};

export type TaskWithRelations = Task & {
  priorityCategory: PriorityCategory | null;
  tags: Tag[];
  subtasks: Task[];
};

export type CreateTaskInput = {
  title: string;
  notes?: string;
  dueDate?: string;
  dueTime?: string;
  priorityCategoryId?: string;
  parentTaskId?: string;
  recurrenceRule?: string;
  tagIds?: string[];
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  notes?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  dateCompleted?: string | null;
  priorityCategoryId?: string | null;
  parentTaskId?: string | null;
  recurrenceRule?: string | null;
  tagIds?: string[];
};
