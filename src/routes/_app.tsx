import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { StickyNoteIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayoutProvider } from "~/components/AppLayoutContext";
import { MiniCalendar } from "~/components/MiniCalendar";
import { NoteDialog } from "~/components/NoteDialog";
import { ReminderDialog } from "~/components/ReminderDialog";
import { TaskDialog } from "~/components/TaskDialog";
import { Note } from "~/features/notes/types";
import { TIME_SENSITIVE_QUERY_KEYS } from "~/features/queryKeys";
import type { ScheduleWithItem } from "~/features/schedules/types";
import { Task } from "~/features/tasks/types";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const navItems = [
  { to: "/reminders", label: "Reminders" },
  { to: "/notes", label: "Notes" },
  { to: "/tags", label: "Tags" },
  { to: "/backlog", label: "Backlog" },
] as const;

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

  // ─── Refresh on focus (PWA date-rollover + stale data) ───────────
  const queryClient = useQueryClient();
  const lastActiveDateRef = useRef(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    function handleFocus() {
      const today = format(new Date(), "yyyy-MM-dd");
      const wasDate = lastActiveDateRef.current;
      lastActiveDateRef.current = today;

      // If the date rolled over and we're on the old "today", navigate to the new today
      if (wasDate !== today && dateParam === wasDate) {
        navigate({ to: "/day/$date", params: { date: today } });
      }

      // Refresh only time-sensitive data. See `TIME_SENSITIVE_QUERY_KEYS`
      // for the registered list — add new feature keys there, not here.
      for (const key of TIME_SENSITIVE_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") handleFocus();
    }

    // `focus` catches desktop window/app switching; `visibilitychange` catches
    // tab backgrounding and mobile PWA resume. Listen to both.
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dateParam, navigate, queryClient]);

  // ─── Drag state ──────────────────────────────────────────────────
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ─── Default start date (child routes set this) ──────────────────
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>(
    format(new Date(), "yyyy-MM-dd"),
  );

  // ─── Default tag IDs (child routes set this) ─────────────────────
  const [defaultTagIds, setDefaultTagIds] = useState<string[] | undefined>(
    undefined,
  );

  // ─── Back link (child routes set this) ────────────────────────────
  const [backLabel, setBackLabel] = useState<string | null>(null);

  // ─── Dialog state ────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] =
    useState<ScheduleWithItem | null>(null);

  const handleOpenDialog = useCallback((task?: Task | null) => {
    setNoteDialogOpen(false);
    setEditingNote(null);
    setEditingTask(task ?? null);
    setDialogOpen(true);
  }, []);

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingTask(null);
  }

  const handleOpenNoteDialog = useCallback((note?: Note | null) => {
    setDialogOpen(false);
    setEditingTask(null);
    setEditingNote(note ?? null);
    setNoteDialogOpen(true);
  }, []);

  function handleNoteDialogClose(open: boolean) {
    setNoteDialogOpen(open);
    if (!open) setEditingNote(null);
  }

  const handleOpenReminderDialog = useCallback(
    (reminder?: ScheduleWithItem | null) => {
      setDialogOpen(false);
      setEditingTask(null);
      setNoteDialogOpen(false);
      setEditingNote(null);
      setEditingReminder(reminder ?? null);
      setReminderDialogOpen(true);
    },
    [],
  );

  function handleReminderDialogClose(open: boolean) {
    setReminderDialogOpen(open);
    if (!open) setEditingReminder(null);
  }

  // ─── Keyboard shortcut: Cmd/Ctrl+N → toggle note drawer ────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        if (noteDialogOpen) {
          handleNoteDialogClose(false);
        } else {
          handleOpenNoteDialog(null);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenNoteDialog, noteDialogOpen]);

  // ─── Keyboard shortcut: Cmd/Ctrl+T → toggle task drawer ────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        if (dialogOpen) {
          handleDialogClose(false);
        } else {
          handleOpenDialog(null);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenDialog, dialogOpen]);

  const layoutCtx = useMemo(
    () => ({
      dragOverDate,
      setDragOverDate,
      defaultStartDate,
      setDefaultStartDate,
      defaultTagIds,
      setDefaultTagIds,
      backLabel,
      setBackLabel,
      handleOpenDialog,
      handleOpenNoteDialog,
      handleOpenReminderDialog,
    }),
    [
      dragOverDate,
      defaultStartDate,
      defaultTagIds,
      backLabel,
      handleOpenDialog,
      handleOpenNoteDialog,
      handleOpenReminderDialog,
    ],
  );

  return (
    <AppLayoutProvider value={layoutCtx}>
      <div
        className="flex h-screen"
        data-app-root
        data-hydrated={hydrated || undefined}
      >
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
          <nav className="flex items-center justify-between px-4 py-2">
            <div>
              {backLabel && (
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-sm transition-colors"
                >
                  <ArrowLeftIcon className="size-4" />
                  {backLabel}
                </button>
              )}
            </div>
            <div className="flex items-center">
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
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto h-full max-w-2xl px-4 pb-24">
              <Outlet />
            </div>
          </main>
        </div>

        <TaskDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          task={editingTask}
          defaultStartDate={defaultStartDate}
          defaultTagIds={defaultTagIds}
        />

        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={handleNoteDialogClose}
          note={editingNote}
          defaultDate={defaultStartDate}
          defaultTagIds={defaultTagIds}
        />

        <ReminderDialog
          open={reminderDialogOpen}
          onOpenChange={handleReminderDialogClose}
          reminder={editingReminder}
        />

        {/* Hot corner — fixed bottom-right note button */}
        <button
          type="button"
          onClick={() => handleOpenNoteDialog(null)}
          className="bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground fixed right-4 bottom-4 z-40 flex size-10 items-center justify-center rounded-full shadow-md transition-all hover:scale-110"
          aria-label="New note (Ctrl+N)"
          title="New note (Ctrl+N)"
        >
          <StickyNoteIcon className="size-5" />
        </button>
      </div>
    </AppLayoutProvider>
  );
}
