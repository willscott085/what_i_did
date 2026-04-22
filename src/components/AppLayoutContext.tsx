import { createContext, useContext } from "react";
import { Note } from "~/features/notes/types";
import type { ScheduleWithItem } from "~/features/schedules/types";
import { Task } from "~/features/tasks/types";

interface AppLayoutContextValue {
  dragOverDate: string | null;
  setDragOverDate: (date: string | null) => void;
  handleOpenDialog: (task?: Task | null) => void;
  handleOpenNoteDialog: (note?: Note | null) => void;
  handleOpenReminderDialog: (reminder?: ScheduleWithItem | null) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export const AppLayoutProvider = AppLayoutContext.Provider;

export function useAppLayout() {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) throw new Error("useAppLayout must be used within AppLayout");
  return ctx;
}
