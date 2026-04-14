import { clsx } from "clsx";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  daysWithTasks?: Set<string>;
  dragOverDate?: string | null;
}

const INITIAL_RANGE = 3;
const LOAD_THRESHOLD = 2;
const LOAD_MORE_COUNT = 3;

function generateMonths(center: Date, before: number, after: number): Date[] {
  const months: Date[] = [];
  for (let i = -before; i <= after; i++) {
    months.push(startOfMonth(addMonths(center, i)));
  }
  return months;
}

function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  daysWithTasks,
  dragOverDate,
}: MiniCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const isLoadingRef = useRef(false);

  const [months, setMonths] = useState(() =>
    generateMonths(selectedDate, INITIAL_RANGE, INITIAL_RANGE),
  );

  // Scroll the selected month's month to center on mount
  useLayoutEffect(() => {
    if (hasScrolled.current) return;
    currentMonthRef.current?.scrollIntoView({
      block: "center",
    });
    hasScrolled.current = true;
  }, []);

  // When selectedDate changes month, ensure it's in the list and scroll to center
  const prevSelectedMonth = useRef(monthKey(selectedDate));
  useEffect(() => {
    const newKey = monthKey(selectedDate);
    if (newKey !== prevSelectedMonth.current) {
      prevSelectedMonth.current = newKey;

      // Ensure the month exists in the list
      const exists = months.some((m) => monthKey(m) === newKey);
      if (!exists) {
        setMonths(generateMonths(selectedDate, INITIAL_RANGE, INITIAL_RANGE));
      }

      requestAnimationFrame(() => {
        currentMonthRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    }
  }, [selectedDate, months]);

  const loadMore = useCallback((direction: "top" | "bottom") => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setMonths((prev) => {
      const scrollEl = scrollRef.current;
      const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
      const prevScrollTop = scrollEl?.scrollTop ?? 0;

      let next: Date[];
      if (direction === "top") {
        const earliest = prev[0];
        const newMonths = generateMonths(
          subMonths(earliest, 1),
          LOAD_MORE_COUNT - 1,
          0,
        );
        next = [...newMonths, ...prev];

        // Restore scroll position after prepending
        requestAnimationFrame(() => {
          if (scrollEl) {
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop =
              prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
          isLoadingRef.current = false;
        });
      } else {
        const latest = prev[prev.length - 1];
        const newMonths = generateMonths(
          addMonths(latest, 1),
          0,
          LOAD_MORE_COUNT - 1,
        );
        next = [...prev, ...newMonths];
        requestAnimationFrame(() => {
          isLoadingRef.current = false;
        });
      }

      return next;
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const nearTop = el.scrollTop < 200;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;

    if (nearTop) loadMore("top");
    if (nearBottom) loadMore("bottom");
  }, [loadMore]);

  const selectedMonthKey = monthKey(selectedDate);
  const todayMonthKey = monthKey(new Date());

  // Track whether today's month is visible (for the Today button)
  const [isTodayMonthVisible, setIsTodayMonthVisible] = useState(true);
  const todayMonthRef = useRef<HTMLDivElement | null>(null);
  const todayObserverRef = useRef<IntersectionObserver | null>(null);

  const setTodayMonthRef = useCallback(
    (node: HTMLDivElement | null) => {
      todayMonthRef.current = node;

      if (todayObserverRef.current) todayObserverRef.current.disconnect();
      if (!node) return;

      todayObserverRef.current = new IntersectionObserver(
        ([entry]) => setIsTodayMonthVisible(entry.isIntersecting),
        { root: scrollRef.current, threshold: 0.1 },
      );
      todayObserverRef.current.observe(node);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayMonthKey],
  );

  function handleTodayClick() {
    const today = new Date();
    onSelectDate(today);

    // Ensure today's month is in the list, then scroll
    const key = monthKey(today);
    const exists = months.some((m) => monthKey(m) === key);
    if (!exists) {
      setMonths(generateMonths(today, INITIAL_RANGE, INITIAL_RANGE));
    }

    requestAnimationFrame(() => {
      todayMonthRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scrollbar-hide flex h-full snap-y snap-mandatory flex-col overflow-y-auto"
      >
        {months.map((month) => {
          const key = monthKey(month);
          const isCurrent = key === selectedMonthKey;
          const isToday = key === todayMonthKey;

          return (
            <div
              key={key}
              ref={(node) => {
                if (isCurrent) {
                  (
                    currentMonthRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                }
                if (isToday) setTodayMonthRef(node);
              }}
              className="snap-center snap-always px-0 py-2"
            >
              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                daysWithTasks={daysWithTasks}
                dragOverDate={dragOverDate}
              />
            </div>
          );
        })}
      </div>

      {/* Today button — shown when scrolled away from the selected month */}
      {!isTodayMonthVisible && (
        <button
          type="button"
          onClick={handleTodayClick}
          className="bg-primary text-primary-foreground absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium shadow-md transition-opacity hover:opacity-90"
        >
          Today
        </button>
      )}
    </div>
  );
}

// ─── Month Grid ──────────────────────────────────────────────────────

interface MonthGridProps {
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  daysWithTasks?: Set<string>;
  dragOverDate?: string | null;
}

function MonthGrid({
  month,
  selectedDate,
  onSelectDate,
  daysWithTasks,
  dragOverDate,
}: MonthGridProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 0 = Sunday, offset for grid placement (Monday-start: shift Sun to 7)
  const startDayOfWeek = getDay(monthStart);
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  return (
    <div>
      <h3 className="text-foreground mb-1.5 text-center text-sm font-medium">
        {format(month, "MMMM yyyy")}
      </h3>
      <div className="grid grid-cols-7 text-center text-xs">
        {/* Day headers */}
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span
            key={d}
            className="text-muted-foreground py-1 text-[0.65rem] font-medium"
          >
            {d}
          </span>
        ))}

        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasTasks = daysWithTasks?.has(dateStr);
          const inMonth = isSameMonth(day, month);

          return (
            <button
              key={dateStr}
              type="button"
              data-calendar-date={dateStr}
              onClick={() => onSelectDate(day)}
              className={clsx(
                "relative mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors",
                inMonth ? "text-foreground" : "text-muted-foreground",
                today && "bg-purple-700 text-white",
                !today && selected && "bg-primary text-primary-foreground",
                !selected && !today && "hover:bg-accent",
                dragOverDate === dateStr && "ring-primary ring-1",
              )}
            >
              {day.getDate()}
              {hasTasks && (
                <span
                  className={clsx(
                    "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                    today || selected ? "bg-white" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
