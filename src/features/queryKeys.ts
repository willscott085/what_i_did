import { notesQueryKeys } from "~/features/notes/consts";
import { schedulesQueryKeys } from "~/features/schedules/consts";
import { tasksQueryKeys } from "~/features/tasks/consts";

/**
 * Query-key prefixes for data whose correctness depends on the current time
 * (date rollovers, relative timestamps, scheduled firings, etc.).
 *
 * These are invalidated whenever the app regains focus / visibility — see
 * `src/routes/_app.tsx`. When adding a new feature with time-sensitive data,
 * add its `*QueryKeys.all` here.
 *
 * Do **not** add stable/reference data (tags, user settings) — it wastes
 * network on every refocus.
 */
export const TIME_SENSITIVE_QUERY_KEYS = [
  tasksQueryKeys.all,
  notesQueryKeys.all,
  schedulesQueryKeys.all,
] as const;
