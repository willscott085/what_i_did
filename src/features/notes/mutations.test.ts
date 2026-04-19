import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { useCreateNote, useUpdateNote, useDeleteNote } from "./mutations";
import { notesQueryKeys } from "./consts";
import { Note, PaginatedNotes } from "./types";

vi.mock("./server", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  reorderNotes: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { createNote, updateNote, deleteNote } from "./server";
import { toast } from "sonner";

const mockedCreateNote = vi.mocked(createNote);
const mockedUpdateNote = vi.mocked(updateNote);
const mockedDeleteNote = vi.mocked(deleteNote);

function makeFakeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "nte_1",
    content: "Some note content",
    title: "Test Note",
    date: "2026-04-19",
    sortOrder: 0,
    userId: "1",
    dateCreated: "2026-01-01T00:00:00Z",
    dateUpdated: "2026-01-01T00:00:00Z",
    tags: [],
    ...overrides,
  };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function seedPaginatedNotes(notes: Note[]) {
  const data: PaginatedNotes = {
    notes,
    total: notes.length,
    page: 1,
    totalPages: 1,
  };
  queryClient.setQueryData(notesQueryKeys.paginated(1), data);
}

function seedDateNotes(date: string, notes: Note[]) {
  queryClient.setQueryData(notesQueryKeys.byDate(date), notes);
}

function getPaginatedNotes(): PaginatedNotes | undefined {
  return queryClient.getQueryData<PaginatedNotes>(notesQueryKeys.paginated(1));
}

function getDateNotes(date: string): Note[] | undefined {
  return queryClient.getQueryData<Note[]>(notesQueryKeys.byDate(date));
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

// ─── useCreateNote ───────────────────────────────────────────────────

describe("useCreateNote", () => {
  it("should call createNote with correct input", async () => {
    mockedCreateNote.mockResolvedValue({ id: "nte_new" } as never);

    const { result } = renderHook(() => useCreateNote(), { wrapper });

    act(() => {
      result.current.mutate({ content: "New note", title: "Title" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedCreateNote).toHaveBeenCalledWith({
      data: { content: "New note", title: "Title", userId: "1" },
    });
  });

  it("should invalidate note queries on success", async () => {
    seedPaginatedNotes([makeFakeNote()]);
    mockedCreateNote.mockResolvedValue({ id: "nte_new" } as never);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateNote(), { wrapper });

    act(() => {
      result.current.mutate({ content: "New note" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all,
    });
  });
});

// ─── useUpdateNote ───────────────────────────────────────────────────

describe("useUpdateNote", () => {
  it("should call updateNote with correct input", async () => {
    mockedUpdateNote.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    act(() => {
      result.current.mutate({ id: "nte_1", content: "Updated content" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedUpdateNote).toHaveBeenCalledWith({
      data: { id: "nte_1", content: "Updated content", userId: "1" },
    });
  });

  it("should invalidate all notes and byId queries on settle", async () => {
    mockedUpdateNote.mockResolvedValue(undefined as never);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    act(() => {
      result.current.mutate({ id: "nte_1", title: "New title" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.byId("nte_1"),
    });
  });

  it("should support updating date to null", async () => {
    mockedUpdateNote.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useUpdateNote(), { wrapper });

    act(() => {
      result.current.mutate({ id: "nte_1", date: null });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedUpdateNote).toHaveBeenCalledWith({
      data: { id: "nte_1", date: null, userId: "1" },
    });
  });
});

// ─── useDeleteNote ───────────────────────────────────────────────────

describe("useDeleteNote", () => {
  it("should optimistically remove note from paginated cache", async () => {
    const notes = [
      makeFakeNote(),
      makeFakeNote({ id: "nte_2", title: "Second" }),
    ];
    seedPaginatedNotes(notes);
    mockedDeleteNote.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteNote(), { wrapper });

    act(() => {
      result.current.mutate("nte_1");
    });

    await waitFor(() => {
      const data = getPaginatedNotes();
      expect(data?.notes).toHaveLength(1);
      expect(data?.notes[0]?.id).toBe("nte_2");
    });
  });

  it("should optimistically remove note from date cache", async () => {
    const notes = [makeFakeNote({ date: "2026-04-19" })];
    seedDateNotes("2026-04-19", notes);
    mockedDeleteNote.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteNote(), { wrapper });

    act(() => {
      result.current.mutate("nte_1");
    });

    await waitFor(() => {
      const data = getDateNotes("2026-04-19");
      expect(data).toHaveLength(0);
    });
  });

  it("should rollback on error and show toast", async () => {
    const notes = [makeFakeNote()];
    seedPaginatedNotes(notes);
    mockedDeleteNote.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useDeleteNote(), { wrapper });

    act(() => {
      result.current.mutate("nte_1");
    });

    // After error, data rolls back
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const data = getPaginatedNotes();
    expect(data?.notes).toHaveLength(1);
    expect(data?.notes[0]?.id).toBe("nte_1");

    expect(toast.error).toHaveBeenCalledWith("Failed to delete note");
  });

  it("should call deleteNote with correct input", async () => {
    seedPaginatedNotes([]);
    mockedDeleteNote.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteNote(), { wrapper });

    act(() => {
      result.current.mutate("nte_1");
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedDeleteNote).toHaveBeenCalledWith({
      data: { noteId: "nte_1", userId: "1" },
    });
  });
});
