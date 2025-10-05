import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import axios from "redaxios";
import { serverEnv } from "~/config/env";
import { notFound } from "@tanstack/react-router";

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

export const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

export const fetchTask = createServerFn({ method: "GET" })
  .inputValidator((d: string) => d)
  .handler(async ({ data }) => {
    console.info(`Fetching task with id ${data}...`);

    const taskUrl = serverEnv.API_URL + "/tasks";

    const task = await axios
      .get<Task>(taskUrl + data)
      .then((r) => r.data)
      .catch((err) => {
        console.error(err);

        if (err.status === 404) {
          throw notFound();
        }

        throw err;
      });

    return task;
  });

export const taskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask({ data: taskId }),
  });
