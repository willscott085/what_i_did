import { createFileRoute } from "@tanstack/react-router";
import { fetchTasksQueryOptions } from "~/features/tasks/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "whatIdid - the task tracker extraordinaire" }],
  }),
  component: Home,
});

function Home() {
  return <>Yolo</>;
}
