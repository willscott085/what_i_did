import { createServerFn } from "@tanstack/react-start";
import axios from "redaxios";
import { serverEnv } from "~/config/env";
import { Task } from "./types";
import z, { date } from "zod";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    const tasksUrl = serverEnv.API_URL + "/tasks";
    return axios.get<Array<Task>>(tasksUrl).then((r) => r.data);
  },
);

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      dateCompleted: z.string().or(z.null()),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task with id ${data.taskId}...`);

    const taskUrl = serverEnv.API_URL + "/tasks/";

    return axios
      .patch<Task>(taskUrl + data.taskId, {
        dateCompleted: data.dateCompleted,
      })
      .then((r) => r.data);
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255),
      dateCompleted: z.string().or(z.null()),
      userId: z.string().min(1),
      list: z.enum(["inbox", "upcoming", "completed"]),
    }),
  )
  .handler(async ({ data }) => {
    const taskUrl = serverEnv.API_URL + "/tasks/";

    return axios
      .patch<Task>(taskUrl + data.id, {
        ...data,
      })
      .then((r) => r.data);
  });

export const updateTaskOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      order: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task order with id ${data.taskId}...`);

    const taskUrl = serverEnv.API_URL + "/tasks/";

    return axios
      .patch<Task>(taskUrl + data.taskId, {
        order: data.order,
      })
      .then((r) => r.data);
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      priority: z
        .enum([
          "urgent_and_important",
          "urgent",
          "important",
          "not_urgent_not_important",
        ])
        .optional(),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Creating task...`);

    const taskUrl = serverEnv.API_URL + "/tasks/";

    return axios
      .post<Task>(taskUrl, {
        ...data,
        dateCreated: new Date().toISOString(),
        dateCompleted: null,
      })
      .then((r) => r.data);
  });
