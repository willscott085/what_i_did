import { createServerFn } from "@tanstack/react-start";
import axios from "redaxios";
import z from "zod";
import { serverEnv } from "~/config/env";
import { List } from "./types";

export const fetchLists = createServerFn({ method: "GET" }).handler(
  async () => {
    const listsUrl = serverEnv.API_URL + "/lists";
    return axios.get<List[]>(listsUrl).then((r) => r.data);
  },
);

export const updateList = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      order: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const listsUrl = serverEnv.API_URL + "/lists/" + data.id;

    return axios
      .patch<List>(listsUrl, {
        ...data,
      })
      .then((r) => r.data);
  });
