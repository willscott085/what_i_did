import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesQueryKeys, DEFAULT_USER_ID } from "./consts";
import { eventsQueryKeys } from "../events/consts";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  snoozeSchedule,
  dismissSchedule,
  fireSchedule,
  createEventWithSchedule,
} from "./server";
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateEventWithScheduleInput,
  Schedule,
  ScheduleWithItem,
} from "./types";
import type { SnoozeDuration } from "./consts";

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScheduleInput) =>
      createSchedule({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateScheduleInput) =>
      updateSchedule({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulesQueryKeys.byId(variables.id),
      });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      deleteSchedule({
        data: { scheduleId, userId: DEFAULT_USER_ID },
      }),
    onMutate: async (scheduleId) => {
      await queryClient.cancelQueries({ queryKey: schedulesQueryKeys.all });

      const allQueries = queryClient.getQueriesData<
        (Schedule | ScheduleWithItem)[]
      >({
        queryKey: schedulesQueryKeys.all,
      });

      for (const [key, data] of allQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            data.filter((s) => s.id !== scheduleId),
          );
        }
      }

      return { allQueries };
    },
    onError: (_err, _id, context) => {
      if (context?.allQueries) {
        for (const [key, data] of context.allQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
    },
  });
}

export function useSnoozeSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { scheduleId: string; duration: SnoozeDuration }) =>
      snoozeSchedule({
        data: { ...input, userId: DEFAULT_USER_ID },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulesQueryKeys.byId(variables.scheduleId),
      });
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.history });
    },
  });
}

export function useDismissSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      dismissSchedule({
        data: { scheduleId, userId: DEFAULT_USER_ID },
      }),
    onSuccess: (_data, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulesQueryKeys.byId(scheduleId),
      });
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.history });
    },
  });
}

export function useFireSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      fireSchedule({
        data: { scheduleId, userId: DEFAULT_USER_ID },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.history });
    },
  });
}

export function useCreateEventWithSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventWithScheduleInput) =>
      createEventWithSchedule({
        data: { ...input, userId: DEFAULT_USER_ID },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.all });
    },
  });
}
