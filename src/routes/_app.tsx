import {
  Link,
  Outlet,
  createFileRoute,
  useMatches,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PlusIcon,
  StickyNoteIcon,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { BottomNav } from "~/components/BottomNav";
import { Drawer, DrawerContent, DrawerTitle } from "~/components/ui/drawer";
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
import { schedulesQueryKeys } from "~/features/schedules/consts";
import { initForegroundReminderListener } from "~/features/schedules/sw-registration";
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
  const { date: dateParam, tagId } = useParams({ strict: false });
  const parsedDate = dateParam ? parseISO(dateParam) : null;
  const selectedDate =
    parsedDate && isValid(parsedDate) ? parsedDate : new Date();

  // ─── Route-derived defaults (source of truth: URL) ─────────────
  // Previously these were useState + useEffect(setX) in each child route,
  // which raced against user interaction — clicks that opened the create
  // dialog before the effect committed would read stale defaults.
  const defaultStartDate = dateParam;
  const defaultTagIds = tagId ? [tagId] : undefined;
  const backLabel = tagId ? "Back" : null;

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

  // ─── Foreground reminder listener ────────────────────────────────
  // When the notification SW receives a push while the app is visible it
  // posts a message instead of showing a system notification. We translate
  // that into a sonner toast (inside the listener) and invalidate schedule
  // queries so the UI reflects the newly-fired schedule.
  useEffect(() => {
    return initForegroundReminderListener(() => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKeys.all });
    });
  }, [queryClient]);

  // ─── Drag state ──────────────────────────────────────────────────
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

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

  // ─── Mobile top bar context ──────────────────────────────────
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "";

  const mobilePageTitle = useMemo(() => {
    if (currentPath.startsWith("/day/") && parsedDate && isValid(parsedDate)) {
      return format(parsedDate, "EEE, d MMM yyyy");
    }
    if (currentPath.startsWith("/backlog")) return "Backlog";
    if (currentPath.startsWith("/notes")) return "Notes";
    if (currentPath.startsWith("/reminders")) return "Reminders";
    if (currentPath.startsWith("/tags")) return "Tags";
    if (currentPath.startsWith("/tag/")) return "Tag";
    return "whatIdid";
  }, [currentPath, parsedDate]);

  // ─── Mobile "+" create handler (per-page primary type) ────────
  const handleMobileCreate = useCallback(() => {
    if (currentPath.startsWith("/day/") || currentPath.startsWith("/backlog")) {
      handleOpenDialog(null);
    } else if (currentPath.startsWith("/notes")) {
      handleOpenNoteDialog(null);
    } else if (currentPath.startsWith("/reminders")) {
      handleOpenReminderDialog(null);
    }
    // Tags page uses inline creation — no dialog
  }, [
    currentPath,
    handleOpenDialog,
    handleOpenNoteDialog,
    handleOpenReminderDialog,
  ]);

  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false);

  function handleMobileSelectDate(date: Date) {
    handleSelectDate(date);
    setCalendarDrawerOpen(false);
  }

  const layoutCtx = useMemo(
    () => ({
      dragOverDate,
      setDragOverDate,
      handleOpenDialog,
      handleOpenNoteDialog,
      handleOpenReminderDialog,
    }),
    [
      dragOverDate,
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
            {/* Left: back button */}
            <div className="min-w-0 flex-1">
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

            {/* Center: page title (mobile only) */}
            <span className="text-foreground truncate text-sm font-medium lg:hidden">
              {mobilePageTitle}
            </span>

            {/* Right: desktop nav links + mobile action icons */}
            <div className="flex flex-1 items-center justify-end gap-1">
              {/* Desktop nav links */}
              <div className="hidden items-center lg:flex">
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

              {/* Mobile: create + calendar buttons */}
              {!currentPath.startsWith("/tags") &&
                !currentPath.startsWith("/tag/") && (
                  <button
                    type="button"
                    onClick={handleMobileCreate}
                    className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
                    aria-label="Create new item"
                  >
                    <PlusIcon className="size-5" />
                  </button>
                )}
              <button
                type="button"
                onClick={() => setCalendarDrawerOpen(true)}
                className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
                aria-label="Open calendar"
              >
                <CalendarIcon className="size-5" />
              </button>
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto h-full max-w-2xl px-4 pb-20">
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

        {/* Hot corner — fixed bottom-right note button (desktop only) */}
        <button
          type="button"
          onClick={() => handleOpenNoteDialog(null)}
          className="bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground fixed right-4 bottom-4 z-40 hidden size-10 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 lg:flex"
          aria-label="New note (Ctrl+N)"
          title="New note (Ctrl+N)"
        >
          <StickyNoteIcon className="size-5" />
        </button>

        {/* Bottom nav — mobile only */}
        <BottomNav />

        {/* Calendar drawer — mobile only */}
        <Drawer open={calendarDrawerOpen} onOpenChange={setCalendarDrawerOpen}>
          <DrawerContent showCloseButton={false}>
            <DrawerTitle className="sr-only">Calendar</DrawerTitle>
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={handleMobileSelectDate}
              hideTodayButton
            />
          </DrawerContent>
        </Drawer>
      </div>
    </AppLayoutProvider>
  );
}
