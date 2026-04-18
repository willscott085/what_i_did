import { createContext, useContext } from "react";
import { Task } from "~/features/tasks/types";

interface AppLayoutContextValue {
  dragOverDate: string | null;
  setDragOverDate: (date: string | null) => void;
  defaultStartDate: string | undefined;
  setDefaultStartDate: (date: string | undefined) => void;
  defaultTagIds: string[] | undefined;
  setDefaultTagIds: (tagIds: string[] | undefined) => void;
  handleOpenDialog: (task?: Task | null) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export const AppLayoutProvider = AppLayoutContext.Provider;

export function useAppLayout() {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) throw new Error("useAppLayout must be used within AppLayout");
  return ctx;
}
