import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DayView } from "~/components/DayView";
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "whatIdid - the task tracker extraordinaire" }],
  }),
  loader: async ({ context }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    await context.queryClient.ensureQueryData(
      fetchTasksForDateQueryOptions(today),
    );
    return null;
  },
  component: Home,
});

function Home() {
  const { selectedDate, setDragOverDate, setDefaultDueDate, handleOpenDialog } =
    useAppLayout();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    setDefaultDueDate(dateStr);
  }, [dateStr, setDefaultDueDate]);

  return (
    <DayView
      selectedDate={selectedDate}
      onOpenDialog={handleOpenDialog}
      onDragActiveChange={(taskId) => {
        if (!taskId) setDragOverDate(null);
      }}
      onDragOverDate={setDragOverDate}
    />
  );
}
