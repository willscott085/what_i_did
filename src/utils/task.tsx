import { createServerFn } from "@tanstack/react-start";
import axios from "redaxios";
import { serverEnv } from "~/config/env";

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

    const tasksUrl = serverEnv.API_URL + "/tasks";

    return axios.get<Array<Task>>(tasksUrl).then((r) => r.data);
  }
);
