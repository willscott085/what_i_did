import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_USER_ID, categoriesQueryKeys } from "./consts";
import { fetchCategoriesQueryOptions } from "./queries";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "./server";
import { PriorityCategory } from "./types";

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchCategoriesQueryOptions().queryKey;

  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      color: string;
    }) => createCategory({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<PriorityCategory[]>(queryKey);

      if (prev) {
        const optimistic: PriorityCategory = {
          id: `cat_optimistic_${Date.now()}`,
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          sortOrder: prev.length,
          userId: DEFAULT_USER_ID,
        };
        queryClient.setQueryData<PriorityCategory[]>(queryKey, [
          ...prev,
          optimistic,
        ]);
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchCategoriesQueryOptions().queryKey;

  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
    }) => updateCategory({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<PriorityCategory[]>(queryKey);

      if (prev) {
        queryClient.setQueryData<PriorityCategory[]>(
          queryKey,
          prev.map((c) => (c.id === input.id ? { ...c, ...input } : c)),
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
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchCategoriesQueryOptions().queryKey;

  return useMutation({
    mutationFn: (id: string) =>
      deleteCategory({ data: { id, userId: DEFAULT_USER_ID } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<PriorityCategory[]>(queryKey);

      if (prev) {
        queryClient.setQueryData<PriorityCategory[]>(
          queryKey,
          prev.filter((c) => c.id !== id),
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
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
    },
  });
};

export const useReorderCategories = () => {
  const queryClient = useQueryClient();
  const queryKey = fetchCategoriesQueryOptions().queryKey;

  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      reorderCategories({
        data: { categoryIds, userId: DEFAULT_USER_ID },
      }),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<PriorityCategory[]>(queryKey);

      if (prev) {
        const byId = new Map(prev.map((c) => [c.id, c]));
        queryClient.setQueryData<PriorityCategory[]>(
          queryKey,
          categoryIds
            .map((id, i) => {
              const cat = byId.get(id);
              return cat ? { ...cat, sortOrder: i } : undefined;
            })
            .filter((c): c is PriorityCategory => c !== undefined),
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
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
    },
  });
};
