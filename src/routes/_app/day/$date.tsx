import { createFileRoute, redirect } from "@tanstack/react-router";
import { format, isValid, parseISO } from "date-fns";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DayView } from "~/components/DayView";
import { fetchNotesForDateQueryOptions } from "~/features/notes/queries";
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/_app/day/$date")({
  head: ({ params }) => ({
    meta: [{ title: `${params.date} - whatIdid` }],
  }),
  loader: async ({ context, params }) => {
    if (!DATE_REGEX.test(params.date) || !isValid(parseISO(params.date))) {
      throw redirect({
        to: "/day/$date",
        params: { date: format(new Date(), "yyyy-MM-dd") },
        replace: true,
      });
    }
    await Promise.all([
      context.queryClient.ensureQueryData(
        fetchTasksForDateQueryOptions(params.date),
      ),
      context.queryClient.ensureQueryData(
        fetchNotesForDateQueryOptions(params.date),
      ),
    ]);
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
