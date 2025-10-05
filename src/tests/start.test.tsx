import { test, expect } from "vitest";

test("requests are mocked", async () => {
  const response = await fetch("http://localhost:55000/tasks");

  await expect(response.json()).resolves.toEqual({
    id: "1",
    title: "Initialise What I Did task manager project",
    dateCreated: "2025-10-05T16:05:00Z",
    dateCompleted: "2025-10-05T19:42:52.209Z",
    userId: "1",
    priority: "important",
  });
});
