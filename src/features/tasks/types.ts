export type Task = {
  id: string;
  title: string;
  notes: string | null;
  dateCreated: string;
  dateCompleted: string | null;
  dueDate: string | null;
  userId: string;
  priorityCategoryId: string | null;
  parentTaskId: string | null;
  recurrenceRule: string | null;
  sortOrder: number;
};
