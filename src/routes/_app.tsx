import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import { AppLayoutProvider } from "~/components/AppLayoutContext";
import { MiniCalendar } from "~/components/MiniCalendar";
import { TaskDialog } from "~/components/TaskDialog";
import { fetchDaysWithTasksQueryOptions } from "~/features/tasks/queries";
import { TaskWithRelations } from "~/features/tasks/types";

function getCalendarRange(date: Date) {
  const start = format(startOfMonth(subMonths(date, 1)), "yyyy-MM-dd");
  const end = format(endOfMonth(addMonths(date, 1)), "yyyy-MM-dd");
  return { start, end };
}

export const Route = createFileRoute("/_app")({
  loader: async ({ context }) => {
    const { start, end } = getCalendarRange(new Date());

    await context.queryClient.ensureQueryData(
      fetchDaysWithTasksQueryOptions(start, end),
    );
    return null;
  },
  component: AppLayout,
});

const navItems = [{ to: "/backlog", label: "Backlog" }] as const;

function AppLayout() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    navigate({ to: "/" });
  }

  const { start, end } = getCalendarRange(selectedDate);
  const { data: daysWithTasks = [] } = useQuery(
    fetchDaysWithTasksQueryOptions(start, end),
  );
  const daysWithTasksSet = new Set(daysWithTasks);

  // ─── Drag state ──────────────────────────────────────────────────
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ─── Default start date (child routes set this) ──────────────────
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>(
    dateStr,
  );

  // ─── Dialog state ────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(
    null,
  );

  function handleOpenDialog(task?: TaskWithRelations | null) {
    setEditingTask(task ?? null);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingTask(null);
  }

  const layoutCtx = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      dragOverDate,
      setDragOverDate,
      defaultStartDate,
      setDefaultStartDate,
      handleOpenDialog,
    }),
    [selectedDate, dragOverDate, defaultStartDate],
  );

  return (
    <AppLayoutProvider value={layoutCtx}>
      <div className="flex h-screen">
        {/* Sidebar — hidden on mobile */}
        <aside className="border-border hidden w-60 shrink-0 border-r px-4 lg:block">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            daysWithTasks={daysWithTasksSet}
            dragOverDate={dragOverDate}
          />
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top nav */}
          <nav className="flex items-center justify-end px-4 py-2">
            {navItems.map((item, i) => (
              <span key={item.to} className="flex items-center">
                {i > 0 && <span className="bg-border mx-3 h-4 w-px" />}
                <Link
                  to={item.to}
                  className="text-muted-foreground hover:text-foreground [&.active]:text-foreground text-sm transition-colors [&.active]:font-medium"
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto h-full max-w-2xl px-4">
              <Outlet />
            </div>
          </main>
        </div>

        <TaskDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          task={editingTask}
          defaultStartDate={defaultStartDate}
        />
      </div>
    </AppLayoutProvider>
  );
}
