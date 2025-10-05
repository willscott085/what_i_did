import { createServerFn } from "@tanstack/react-start";
import axios from "redaxios";

export type Priority =
  | "urgent_and_important"
  | "urgent"
  | "important"
  | "not_urgent_not_important";

export type Task = {
  id: string;
  title: string;
  dateCreated: string;
  dateCompleted: string | null;
  priority: Priority;
  notes: string;
  userId: string;
};

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching tasks...");

    return axios
      .get<Array<Task>>("http://localhost:55000/tasks")
      .then((r) => r.data);
  }
);
