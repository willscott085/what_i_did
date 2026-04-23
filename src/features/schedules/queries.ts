import { queryOptions } from "@tanstack/react-query";
import { schedulesQueryKeys, DEFAULT_USER_ID } from "./consts";
import {
  fetchSchedule,
  fetchScheduleHistory,
  fetchSchedules,
  fetchSchedulesForItem,
  fetchUpcomingSchedules,
} from "./server";

export function schedulesQueryOptions() {
  return queryOptions({
    queryKey: schedulesQueryKeys.all,
    queryFn: () => fetchSchedules({ data: { userId: DEFAULT_USER_ID } }),
  });
}

export function scheduleQueryOptions(scheduleId: string) {
  return queryOptions({
    queryKey: schedulesQueryKeys.byId(scheduleId),
    queryFn: () =>
      fetchSchedule({ data: { scheduleId, userId: DEFAULT_USER_ID } }),
  });
}

export function schedulesForItemQueryOptions(itemId: string) {
  return queryOptions({
    queryKey: schedulesQueryKeys.byItem(itemId),
    queryFn: () =>
      fetchSchedulesForItem({
        data: { itemId, userId: DEFAULT_USER_ID },
      }),
  });
}

export function upcomingSchedulesQueryOptions() {
  return queryOptions({
    queryKey: schedulesQueryKeys.upcoming,
    queryFn: () =>
      fetchUpcomingSchedules({ data: { userId: DEFAULT_USER_ID } }),
  });
}

export function scheduleHistoryQueryOptions(limit = 50) {
  return queryOptions({
    queryKey: [...schedulesQueryKeys.history, { limit }],
    queryFn: () =>
      fetchScheduleHistory({ data: { userId: DEFAULT_USER_ID, limit } }),
  });
}
