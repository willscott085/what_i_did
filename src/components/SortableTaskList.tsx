import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Task } from "~/features/tasks/types";

// ─── Types ───────────────────────────────────────────────────────────

interface LocalDragOrder {
  ids: string[];
  /** The serverIds snapshot when the drag happened */
  forServerIds: string[];
}

interface SortableTaskListProps {
  tasks: Task[];
  onReorder: (taskIds: string[]) => void;
  onDragActiveChange?: (taskId: string | null) => void;
  onDropOnDate?: (taskId: string, date: string) => void;
  onDragOverDate?: (date: string | null) => void;
  children: (
    task: Task,
    isDragging: boolean,
    dragAttributes: React.HTMLAttributes<HTMLElement>,
    dragListeners: DraggableSyntheticListeners,
  ) => React.ReactNode;
  completedChildren?: (task: Task) => React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────

export function SortableTaskList({
  tasks: allTasks,
  onReorder,
  onDragActiveChange,
  onDropOnDate,
  onDragOverDate,
  children,
  completedChildren,
}: SortableTaskListProps) {
  const incompleteTasks = useMemo(
    () =>
      allTasks
        .filter((t) => !t.dateCompleted)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allTasks],
  );
  const completedTasks = useMemo(
    () => allTasks.filter((t) => !!t.dateCompleted),
    [allTasks],
  );

  // Local override for ordering — set synchronously during drag
  const [localOrder, setLocalOrder] = useState<LocalDragOrder | null>(null);
  const serverIds = useMemo(
    () => incompleteTasks.map((t) => t.id),
    [incompleteTasks],
  );

  // Use local override only if server data hasn't changed since the drag
  const ids =
    localOrder && localOrder.forServerIds === serverIds
      ? localOrder.ids
      : serverIds;

  const taskMap = useMemo(
    () => new Map(allTasks.map((t) => [t.id, t])),
    [allTasks],
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  // Track pointer position during drag for drop-on-calendar detection
  const hoveredDateRef = useRef<string | null>(null);
  const pointerHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const pointerHandler = useCallback(
    (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const calEl = elements.find((el) => el.closest("[data-calendar-date]"));
      const date =
        calEl?.closest<HTMLElement>("[data-calendar-date]")?.dataset
          .calendarDate ?? null;

      if (date !== hoveredDateRef.current) {
        hoveredDateRef.current = date;
        onDragOverDate?.(date);
      }
    },
    [onDragOverDate],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
      onDragActiveChange?.(id);
      pointerHandlerRef.current = pointerHandler;
      document.addEventListener("pointermove", pointerHandler);
    },
    [onDragActiveChange, pointerHandler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = activeId;
      const calDate = hoveredDateRef.current;

      setActiveId(null);
      onDragActiveChange?.(null);
      onDragOverDate?.(null);
      hoveredDateRef.current = null;
      document.removeEventListener("pointermove", pointerHandler);
      pointerHandlerRef.current = null;

      const { active, over } = event;

      // Drop on calendar date
      if (calDate && draggedId) {
        setLocalOrder({
          ids: ids.filter((id) => id !== draggedId),
          forServerIds: serverIds,
        });
        onDropOnDate?.(draggedId, calDate);
        return;
      }

      if (!over || active.id === over.id) {
        setLocalOrder(null);
        return;
      }

      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(ids, oldIndex, newIndex);
        setLocalOrder({ ids: newOrder, forServerIds: serverIds });
        onReorder(newOrder);
      }
    },
    [
      activeId,
      ids,
      serverIds,
      onReorder,
      onDragActiveChange,
      onDropOnDate,
      onDragOverDate,
      pointerHandler,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    onDragActiveChange?.(null);
    onDragOverDate?.(null);
    hoveredDateRef.current = null;
    document.removeEventListener("pointermove", pointerHandler);
    pointerHandlerRef.current = null;
  }, [onDragActiveChange, onDragOverDate, pointerHandler]);

  // Safety cleanup: remove listener if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (pointerHandlerRef.current) {
        document.removeEventListener("pointermove", pointerHandlerRef.current);
        pointerHandlerRef.current = null;
      }
    };
  }, []);

  const activeTask = activeId ? taskMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => {
          const task = taskMap.get(id);
          if (!task) return null;
          return (
            <SortableItem key={id} id={id}>
              {({ isDragging, attributes, listeners }) =>
                children(
                  task,
                  isDragging || task.id === activeId,
                  attributes,
                  listeners,
                )
              }
            </SortableItem>
          );
        })}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeTask ? children(activeTask, true, {}, undefined) : null}
      </DragOverlay>

      {/* Completed section — not sortable */}
      {completedTasks.length > 0 && (
        <div>
          {completedTasks.map((task) =>
            completedChildren ? (
              completedChildren(task)
            ) : (
              <div key={task.id}>{children(task, false, {}, undefined)}</div>
            ),
          )}
        </div>
      )}
    </DndContext>
  );
}

// ─── Sortable Item Wrapper ───────────────────────────────────────────

interface SortableItemProps {
  id: string;
  children: (props: {
    isDragging: boolean;
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: DraggableSyntheticListeners;
  }) => React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: ({ wasDragging, ...rest }) =>
      wasDragging
        ? false
        : defaultAnimateLayoutChanges({ wasDragging, ...rest }),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ isDragging, attributes, listeners })}
    </div>
  );
}
