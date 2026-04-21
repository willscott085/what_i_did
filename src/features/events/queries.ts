import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID, eventsQueryKeys } from "./consts";
import {
  fetchEvent,
  fetchEvents,
  fetchEventsByTag,
  fetchEventsForDate,
} from "./server";

export const fetchEventsQueryOptions = () =>
  queryOptions({
    queryKey: eventsQueryKeys.all,
    queryFn: () => fetchEvents({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchEventsForDateQueryOptions = (date: string) =>
  queryOptions({
    queryKey: eventsQueryKeys.byDate(date),
    queryFn: () =>
      fetchEventsForDate({ data: { userId: DEFAULT_USER_ID, date } }),
  });

export const fetchEventsByTagQueryOptions = (tagId: string) =>
  queryOptions({
    queryKey: eventsQueryKeys.byTag(tagId),
    queryFn: () =>
      fetchEventsByTag({ data: { userId: DEFAULT_USER_ID, tagId } }),
  });

export const fetchEventQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: eventsQueryKeys.byId(eventId),
    queryFn: () => fetchEvent({ data: { eventId, userId: DEFAULT_USER_ID } }),
  });
