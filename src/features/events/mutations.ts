import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_USER_ID, eventsQueryKeys } from "./consts";
import { createEvent, deleteEvent, updateEvent } from "./server";
import { CreateEventInput, Event, UpdateEventInput } from "./types";

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      createEvent({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.all });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEventInput) =>
      updateEvent({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.all });
      if (input.id) {
        queryClient.invalidateQueries({
          queryKey: eventsQueryKeys.byId(input.id),
        });
      }
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) =>
      deleteEvent({ data: { eventId, userId: DEFAULT_USER_ID } }),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: eventsQueryKeys.all });

      const allQueries = queryClient.getQueriesData<Event[]>({
        queryKey: eventsQueryKeys.all,
      });

      for (const [key, data] of allQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            data.filter((e: Event) => e.id !== eventId),
          );
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.all });
    },
  });
};
