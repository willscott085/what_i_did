import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_USER_ID, notesQueryKeys } from "./consts";
import { createNote, deleteNote, reorderNotes, updateNote } from "./server";
import { processNoteWithAI } from "./ai";
import { Note } from "./types";

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      content: string;
      title?: string;
      date?: string;
      tagIds?: string[];
    }) => createNote({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      content?: string;
      title?: string | null;
      date?: string | null;
      tagIds?: string[];
      sortOrder?: string;
    }) => updateNote({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
      if (input.id) {
        queryClient.invalidateQueries({
          queryKey: notesQueryKeys.byId(input.id),
        });
      }
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      deleteNote({ data: { noteId, userId: DEFAULT_USER_ID } }),
    onMutate: async (noteId) => {
      // Optimistically remove from all note queries
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.all });

      const allQueries = queryClient.getQueriesData<{ notes: Note[] } | Note[]>(
        { queryKey: notesQueryKeys.all },
      );

      for (const [key, data] of allQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            data.filter((n: Note) => n.id !== noteId),
          );
        } else if (data && "notes" in data) {
          queryClient.setQueryData(key, {
            ...data,
            notes: data.notes.filter((n: Note) => n.id !== noteId),
          });
        }
      }

      return { allQueries };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.allQueries) {
        for (const [key, data] of ctx.allQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to delete note");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
};

export const useReorderNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteIds: string[]) =>
      reorderNotes({ data: { noteIds, userId: DEFAULT_USER_ID } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
};

export const useProcessNoteWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      processNoteWithAI({ data: { noteId, userId: DEFAULT_USER_ID } }),
    onSuccess: (_data, noteId) => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: notesQueryKeys.byId(noteId),
      });
    },
  });
};
