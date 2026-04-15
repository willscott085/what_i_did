import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { format, isValid, parseISO } from "date-fns";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppLayoutProvider } from "~/components/AppLayoutContext";
import { MiniCalendar } from "~/components/MiniCalendar";
import { TaskDialog } from "~/components/TaskDialog";
import { TaskWithRelations } from "~/features/tasks/types";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const navItems = [{ to: "/backlog", label: "Backlog" }] as const;

function AppLayout() {
  const navigate = useNavigate();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { date: dateParam } = useParams({ strict: false });
  const parsedDate = dateParam ? parseISO(dateParam) : null;
  const selectedDate =
    parsedDate && isValid(parsedDate) ? parsedDate : new Date();

  function handleSelectDate(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    navigate({ to: "/day/$date", params: { date: dateStr } });
  }

  // ─── Drag state ──────────────────────────────────────────────────
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ─── Default start date (child routes set this) ──────────────────
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>(
    format(new Date(), "yyyy-MM-dd"),
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
      dragOverDate,
      setDragOverDate,
      defaultStartDate,
      setDefaultStartDate,
      handleOpenDialog,
    }),
    [dragOverDate, defaultStartDate],
  );

  return (
    <AppLayoutProvider value={layoutCtx}>
      <div className="flex h-screen" data-hydrated={hydrated || undefined}>
        {/* Sidebar — hidden on mobile */}
        <aside className="border-border hidden w-60 shrink-0 border-r px-4 lg:block">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
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
