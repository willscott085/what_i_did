import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_USER_ID, tagsQueryKeys } from "./consts";
import { fetchTagsQueryOptions } from "./queries";
import { createTag, deleteTag, updateTag } from "./server";
import { Tag } from "./types";

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchTagsQueryOptions().queryKey;

  return useMutation({
    mutationFn: (input: { name: string; color?: string }) =>
      createTag({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<Tag[]>(queryKey);

      if (prev) {
        const optimistic: Tag = {
          id: `tag_optimistic_${Date.now()}`,
          name: input.name,
          color: input.color ?? null,
          userId: DEFAULT_USER_ID,
        };
        queryClient.setQueryData<Tag[]>(queryKey, [...prev, optimistic]);
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.all });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchTagsQueryOptions().queryKey;

  return useMutation({
    mutationFn: (input: { id: string; name?: string; color?: string }) =>
      updateTag({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<Tag[]>(queryKey);

      if (prev) {
        queryClient.setQueryData<Tag[]>(
          queryKey,
          prev.map((t) => (t.id === input.id ? { ...t, ...input } : t)),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.all });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchTagsQueryOptions().queryKey;

  return useMutation({
    mutationFn: (id: string) =>
      deleteTag({ data: { id, userId: DEFAULT_USER_ID } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<Tag[]>(queryKey);

      if (prev) {
        queryClient.setQueryData<Tag[]>(
          queryKey,
          prev.filter((t) => t.id !== id),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.all });
    },
  });
};
