import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
  useUpdateFullTask,
} from "./mutations";
import { fetchInboxTasksQueryOptions } from "./queries";
import { Task } from "./types";

vi.mock("./server", () => ({
  completeTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  moveTaskToDate: vi.fn(),
  reorderTasks: vi.fn(),
  updateTask: vi.fn(),
}));

import {
  completeTask,
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
} from "./server";

const mockedCompleteTask = vi.mocked(completeTask);
const mockedCreateTask = vi.mocked(createTask);
const mockedDeleteTask = vi.mocked(deleteTask);
const mockedReorderTasks = vi.mocked(reorderTasks);
const mockedUpdateTask = vi.mocked(updateTask);

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "tsk_1",
    title: "Test task",
    notes: null,
    dateCreated: "2026-01-01T00:00:00Z",
    dateCompleted: null,
    startDate: "2026-04-18",
    userId: "1",
    parentTaskId: null,
    sortOrder: "a0",
    subtaskCount: 0,
    completedSubtaskCount: 0,
    tags: [],
    ...overrides,
  };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function seedInbox(tasks: Task[]) {
  queryClient.setQueryData(fetchInboxTasksQueryOptions().queryKey, tasks);
}

function getInbox(): Task[] | undefined {
  return queryClient.getQueryData<Task[]>(
    fetchInboxTasksQueryOptions().queryKey,
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  vi.clearAllMocks();
});

describe("useCompleteTask", () => {
  it("should optimistically mark task as completed in inbox cache", async () => {
    const task = makeFakeTask();
    seedInbox([task]);
    mockedCompleteTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    act(() => {
      result.current.mutate({
        taskId: "tsk_1",
        dateCompleted: "2026-04-18T12:00:00Z",
      });
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox?.[0]?.dateCompleted).toBe("2026-04-18T12:00:00Z");
    });
  });

  it("should optimistically uncomplete a task", async () => {
    const task = makeFakeTask({ dateCompleted: "2026-04-18T12:00:00Z" });
    seedInbox([task]);
    mockedCompleteTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    act(() => {
      result.current.mutate({ taskId: "tsk_1", dateCompleted: null });
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox?.[0]?.dateCompleted).toBeNull();
    });
  });

  it("should rollback on error", async () => {
    const task = makeFakeTask();
    seedInbox([task]);
    mockedCompleteTask.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    act(() => {
      result.current.mutate({
        taskId: "tsk_1",
        dateCompleted: "2026-04-18T12:00:00Z",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const inbox = getInbox();
    expect(inbox?.[0]?.dateCompleted).toBeNull();
  });
});

describe("useDeleteTask", () => {
  it("should optimistically remove task from inbox cache", async () => {
    const tasks = [
      makeFakeTask(),
      makeFakeTask({ id: "tsk_2", title: "Other task" }),
    ];
    seedInbox(tasks);
    mockedDeleteTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    act(() => {
      result.current.mutate("tsk_1");
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox).toHaveLength(1);
      expect(inbox?.[0]?.id).toBe("tsk_2");
    });
  });

  it("should optimistically remove task from byDate cache", async () => {
    const task = makeFakeTask();
    const byDateKey = ["tasks", "byDate", "2026-04-18"] as const;
    queryClient.setQueryData(byDateKey, [task]);
    seedInbox([task]);
    mockedDeleteTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    act(() => {
      result.current.mutate("tsk_1");
    });

    await waitFor(() => {
      const byDate = queryClient.getQueryData<Task[]>(byDateKey);
      expect(byDate).toHaveLength(0);
    });
  });

  it("should rollback inbox and byDate caches on error", async () => {
    const task = makeFakeTask();
    const byDateKey = ["tasks", "byDate", "2026-04-18"] as const;
    queryClient.setQueryData(byDateKey, [task]);
    seedInbox([task]);
    mockedDeleteTask.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    act(() => {
      result.current.mutate("tsk_1");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const inbox = getInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox?.[0]?.id).toBe("tsk_1");

    const byDate = queryClient.getQueryData<Task[]>(byDateKey);
    expect(byDate).toHaveLength(1);
  });
});

describe("useReorderTasks", () => {
  it("should optimistically reorder tasks in inbox cache", async () => {
    const tasks = [
      makeFakeTask({ id: "tsk_1", sortOrder: "a0" }),
      makeFakeTask({ id: "tsk_2", sortOrder: "a1" }),
      makeFakeTask({ id: "tsk_3", sortOrder: "a2" }),
    ];
    seedInbox(tasks);
    mockedReorderTasks.mockResolvedValue(undefined as never);

    const { result } = renderHook(
      () => useReorderTasks({ onError: () => {} }),
      { wrapper },
    );

    act(() => {
      result.current.mutate(["tsk_3", "tsk_1", "tsk_2"]);
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox?.map((t) => t.id)).toEqual(["tsk_3", "tsk_1", "tsk_2"]);
      // sortOrder should be string fractional keys in correct order
      const keys = inbox?.map((t) => t.sortOrder) ?? [];
      expect(keys[0] < keys[1]).toBe(true);
      expect(keys[1] < keys[2]).toBe(true);
    });
  });

  it("should rollback on error", async () => {
    const tasks = [
      makeFakeTask({ id: "tsk_1", sortOrder: "a0" }),
      makeFakeTask({ id: "tsk_2", sortOrder: "a1" }),
    ];
    seedInbox(tasks);
    mockedReorderTasks.mockRejectedValue(new Error("Server error"));

    const onError = vi.fn();
    const { result } = renderHook(() => useReorderTasks({ onError }), {
      wrapper,
    });

    act(() => {
      result.current.mutate(["tsk_2", "tsk_1"]);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const inbox = getInbox();
    expect(inbox?.map((t) => t.id)).toEqual(["tsk_1", "tsk_2"]);
    expect(onError).toHaveBeenCalled();
  });
});

describe("useUpdateFullTask", () => {
  it("should optimistically update task fields in inbox cache", async () => {
    const task = makeFakeTask();
    seedInbox([task]);
    mockedUpdateTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateFullTask(), { wrapper });

    act(() => {
      result.current.mutate({
        id: "tsk_1",
        title: "Updated title",
        notes: "Some notes",
      });
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox?.[0]?.title).toBe("Updated title");
      expect(inbox?.[0]?.notes).toBe("Some notes");
    });
  });

  it("should preserve existing tags during optimistic update", async () => {
    const task = makeFakeTask({
      tags: [{ id: "tag_1", name: "Important" }],
    });
    seedInbox([task]);
    mockedUpdateTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateFullTask(), { wrapper });

    act(() => {
      result.current.mutate({ id: "tsk_1", title: "New title" });
    });

    await waitFor(() => {
      const inbox = getInbox();
      expect(inbox?.[0]?.tags).toEqual([{ id: "tag_1", name: "Important" }]);
    });
  });

  it("should rollback on error", async () => {
    const task = makeFakeTask({ title: "Original" });
    seedInbox([task]);
    mockedUpdateTask.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useUpdateFullTask(), { wrapper });

    act(() => {
      result.current.mutate({ id: "tsk_1", title: "Changed" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const inbox = getInbox();
    expect(inbox?.[0]?.title).toBe("Original");
  });
});

describe("useCreateTask", () => {
  it("should call createTask and invalidate queries on settle", async () => {
    mockedCreateTask.mockResolvedValue(undefined as never);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    act(() => {
      result.current.mutate({ title: "New task" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedCreateTask).toHaveBeenCalledWith({
      data: { title: "New task", userId: "1" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks"],
    });
  });

  it("should pass optional fields through to server", async () => {
    mockedCreateTask.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    act(() => {
      result.current.mutate({
        title: "Tagged task",
        notes: "Some notes",
        startDate: "2026-05-01",
        tagIds: ["tag_1", "tag_2"],
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedCreateTask).toHaveBeenCalledWith({
      data: {
        title: "Tagged task",
        notes: "Some notes",
        startDate: "2026-05-01",
        tagIds: ["tag_1", "tag_2"],
        userId: "1",
      },
    });
  });
});
