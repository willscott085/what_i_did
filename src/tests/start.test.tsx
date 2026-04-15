import { test, expect } from "vitest";

test("requests are mocked", async () => {
  const response = await fetch("http://localhost:55001/api/tasks");

  await expect(response.json()).resolves.toEqual([
    {
      id: "tsk_001",
      title: "Initialise What I Did task manager project",
      notes: null,
      dateCreated: "2025-10-05T16:05:00Z",
      dateCompleted: "2025-10-05T19:42:52.209Z",
      startDate: null,
      userId: "1",
      parentTaskId: null,
      sortOrder: 0,
      subtaskCount: 0,
      completedSubtaskCount: 0,
      tagNames: null,
    },
  ]);
});
