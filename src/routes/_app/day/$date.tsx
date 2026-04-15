import { createFileRoute } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DayView } from "~/components/DayView";
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";

export const Route = createFileRoute("/_app/day/$date")({
  head: ({ params }) => ({
    meta: [{ title: `${params.date} - whatIdid` }],
  }),
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      fetchTasksForDateQueryOptions(params.date),
    );
    return null;
  },
  component: DayRoute,
});

function DayRoute() {
  const { date } = Route.useParams();
  const { setDragOverDate, handleOpenDialog } = useAppLayout();

  const selectedDate = parseISO(date);

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
