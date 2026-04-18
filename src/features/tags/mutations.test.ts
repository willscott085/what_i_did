import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { useCreateTag, useUpdateTag, useDeleteTag } from "./mutations";
import { fetchTagsQueryOptions } from "./queries";
import { tasksQueryKeys } from "~/features/tasks/consts";
import { Tag } from "./types";

vi.mock("./server", () => ({
  fetchTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { createTag, updateTag, deleteTag } from "./server";
import { toast } from "sonner";

const mockedCreateTag = vi.mocked(createTag);
const mockedUpdateTag = vi.mocked(updateTag);
const mockedDeleteTag = vi.mocked(deleteTag);

function makeFakeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag_1",
    name: "Work",
    description: null,
    color: null,
    userId: "1",
    dateCreated: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function seedTags(tags: Tag[]) {
  queryClient.setQueryData(fetchTagsQueryOptions().queryKey, tags);
}

function getTags(): Tag[] | undefined {
  return queryClient.getQueryData<Tag[]>(fetchTagsQueryOptions().queryKey);
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

describe("useCreateTag", () => {
  it("should optimistically add a tag to the cache", async () => {
    const existing = [makeFakeTag()];
    seedTags(existing);
    mockedCreateTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useCreateTag(), { wrapper });

    act(() => {
      result.current.mutate({ name: "Personal", color: "#ff0000" });
    });

    await waitFor(() => {
      const tags = getTags();
      expect(tags).toHaveLength(2);
      expect(tags?.[1]?.name).toBe("Personal");
      expect(tags?.[1]?.color).toBe("#ff0000");
      expect(tags?.[1]?.id).toContain("tag_optimistic_");
    });
  });

  it("should use null color when not provided", async () => {
    seedTags([]);
    mockedCreateTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useCreateTag(), { wrapper });

    act(() => {
      result.current.mutate({ name: "No color" });
    });

    await waitFor(() => {
      const tags = getTags();
      expect(tags?.[0]?.color).toBeNull();
    });
  });

  it("should rollback on error", async () => {
    const existing = [makeFakeTag()];
    seedTags(existing);
    mockedCreateTag.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useCreateTag(), { wrapper });

    act(() => {
      result.current.mutate({ name: "Will fail" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const tags = getTags();
    expect(tags).toHaveLength(1);
    expect(tags?.[0]?.name).toBe("Work");
  });
});

describe("useUpdateTag", () => {
  it("should optimistically update tag name in tags cache", async () => {
    seedTags([makeFakeTag()]);
    mockedUpdateTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateTag(), { wrapper });

    act(() => {
      result.current.mutate({ id: "tag_1", name: "Updated Work" });
    });

    await waitFor(() => {
      const tags = getTags();
      expect(tags?.[0]?.name).toBe("Updated Work");
    });
  });

  it("should optimistically update tag in byTag cache", async () => {
    seedTags([makeFakeTag()]);
    const byTagKey = tasksQueryKeys.byTag("tag_1");
    queryClient.setQueryData(byTagKey, {
      tag: { name: "Work", description: null },
      tasks: [],
    });
    mockedUpdateTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateTag(), { wrapper });

    act(() => {
      result.current.mutate({
        id: "tag_1",
        name: "Renamed",
        description: "A description",
      });
    });

    await waitFor(() => {
      const byTag = queryClient.getQueryData<{
        tag: { name: string; description: string | null };
        tasks: unknown[];
      }>(byTagKey);
      expect(byTag?.tag?.name).toBe("Renamed");
      expect(byTag?.tag?.description).toBe("A description");
    });
  });

  it("should rollback both caches and show toast on error", async () => {
    seedTags([makeFakeTag({ name: "Original" })]);
    const byTagKey = tasksQueryKeys.byTag("tag_1");
    queryClient.setQueryData(byTagKey, {
      tag: { name: "Original", description: null },
      tasks: [],
    });
    mockedUpdateTag.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useUpdateTag(), { wrapper });

    act(() => {
      result.current.mutate({ id: "tag_1", name: "Changed" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const tags = getTags();
    expect(tags?.[0]?.name).toBe("Original");

    const byTag = queryClient.getQueryData<{
      tag: { name: string; description: string | null };
      tasks: unknown[];
    }>(byTagKey);
    expect(byTag?.tag?.name).toBe("Original");

    expect(toast.error).toHaveBeenCalledWith("Failed to update tag");
  });

  it("should not update byTag cache fields that are not in the patch", async () => {
    seedTags([makeFakeTag()]);
    const byTagKey = tasksQueryKeys.byTag("tag_1");
    queryClient.setQueryData(byTagKey, {
      tag: { name: "Work", description: "Original desc" },
      tasks: [],
    });
    mockedUpdateTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateTag(), { wrapper });

    act(() => {
      result.current.mutate({ id: "tag_1", color: "#00ff00" });
    });

    await waitFor(() => {
      const byTag = queryClient.getQueryData<{
        tag: { name: string; description: string | null };
        tasks: unknown[];
      }>(byTagKey);
      // name and description should be unchanged since they weren't in the patch
      expect(byTag?.tag?.name).toBe("Work");
      expect(byTag?.tag?.description).toBe("Original desc");
    });
  });
});

describe("useDeleteTag", () => {
  it("should optimistically remove tag from cache", async () => {
    const tags = [
      makeFakeTag({ id: "tag_1", name: "Work" }),
      makeFakeTag({ id: "tag_2", name: "Personal" }),
    ];
    seedTags(tags);
    mockedDeleteTag.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteTag(), { wrapper });

    act(() => {
      result.current.mutate("tag_1");
    });

    await waitFor(() => {
      const remaining = getTags();
      expect(remaining).toHaveLength(1);
      expect(remaining?.[0]?.id).toBe("tag_2");
    });
  });

  it("should rollback on error", async () => {
    const tags = [makeFakeTag()];
    seedTags(tags);
    mockedDeleteTag.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useDeleteTag(), { wrapper });

    act(() => {
      result.current.mutate("tag_1");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const remaining = getTags();
    expect(remaining).toHaveLength(1);
    expect(remaining?.[0]?.id).toBe("tag_1");
  });
});
