import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("http://localhost:55000/tasks", () => {
    return HttpResponse.json({
      id: "1",
      title: "Initialise What I Did task manager project",
      dateCreated: "2025-10-05T16:05:00Z",
      dateCompleted: "2025-10-05T19:42:52.209Z",
      userId: "1",
      priority: "important",
    });
  }),
];
