export type Priority =
  | "urgent_and_important"
  | "urgent"
  | "important"
  | "not_urgent_not_important";

export type TaskList = "inbox" | "upcoming" | "completed";

export type Task = {
  id: string;
  title: string;
  dateCreated: string;
  dateCompleted: string | null;
  priority: Priority;
  notes: string;
  userId: string;
  list: TaskList;
};
