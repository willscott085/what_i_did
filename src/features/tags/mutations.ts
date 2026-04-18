import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_USER_ID, tagsQueryKeys } from "./consts";
import { fetchTagsQueryOptions } from "./queries";
import { createTag, deleteTag, updateTag } from "./server";
import { Tag } from "./types";
import { tasksQueryKeys } from "~/features/tasks/consts";

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
          description: null,
          color: input.color ?? null,
          userId: DEFAULT_USER_ID,
          dateCreated: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
    mutationFn: (input: {
      id: string;
      name?: string;
      description?: string | null;
      color?: string;
    }) => updateTag({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      const byTagKey = tasksQueryKeys.byTag(input.id);
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: byTagKey });

      const prev = queryClient.getQueryData<Tag[]>(queryKey);
      const prevByTag = queryClient.getQueryData<{
        tag: { name: string; description: string | null } | null;
        tasks: unknown[];
      }>(byTagKey);

      if (prev) {
        queryClient.setQueryData<Tag[]>(
          queryKey,
          prev.map((t) => (t.id === input.id ? { ...t, ...input } : t)),
        );
      }

      if (prevByTag?.tag) {
        queryClient.setQueryData(byTagKey, {
          ...prevByTag,
          tag: { ...prevByTag.tag, ...input },
        });
      }

      return { prev, prevByTag, byTagKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
      if (ctx?.prevByTag) {
        queryClient.setQueryData(ctx.byTagKey, ctx.prevByTag);
      }
      toast.error("Failed to update tag");
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: tasksQueryKeys.byTag(input.id),
      });
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
