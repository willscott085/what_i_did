import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface DraggableListProps<T extends { id: string }> {
  items: T[];
  onDropOnDate: (itemId: string, date: string) => void;
  onDragOverDate?: (date: string | null) => void;
  children: (
    item: T,
    isDragging: boolean,
    dragAttributes: React.HTMLAttributes<HTMLElement>,
    dragListeners: React.HTMLAttributes<HTMLElement>,
  ) => React.ReactNode;
  overlay?: (item: T) => React.ReactNode;
}

export function DraggableList<T extends { id: string }>({
  items,
  onDropOnDate,
  onDragOverDate,
  children,
  overlay,
}: DraggableListProps<T>) {
  const itemMap = new Map(items.map((t) => [t.id, t]));
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
      pointerHandlerRef.current = pointerHandler;
      document.addEventListener("pointermove", pointerHandler);
    },
    [pointerHandler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = String(event.active.id);
      const calDate = hoveredDateRef.current;

      setActiveId(null);
      onDragOverDate?.(null);
      hoveredDateRef.current = null;
      document.removeEventListener("pointermove", pointerHandler);
      pointerHandlerRef.current = null;

      if (calDate && draggedId) {
        onDropOnDate(draggedId, calDate);
      }
    },
    [onDropOnDate, onDragOverDate, pointerHandler],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    onDragOverDate?.(null);
    hoveredDateRef.current = null;
    document.removeEventListener("pointermove", pointerHandler);
    pointerHandlerRef.current = null;
  }, [onDragOverDate, pointerHandler]);

  useEffect(() => {
    return () => {
      if (pointerHandlerRef.current) {
        document.removeEventListener("pointermove", pointerHandlerRef.current);
        pointerHandlerRef.current = null;
      }
    };
  }, []);

  const activeItem = activeId ? itemMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ul>
        {items.map((item) => (
          <DraggableItem key={item.id} id={item.id}>
            {({ isDragging, attributes, listeners }) =>
              children(
                item,
                isDragging || item.id === activeId,
                attributes,
                listeners,
              )
            }
          </DraggableItem>
        ))}
      </ul>

      <DragOverlay dropAnimation={null}>
        {activeItem
          ? (overlay?.(activeItem) ?? children(activeItem, true, {}, {}))
          : null}
      </DragOverlay>
    </DndContext>
  );
}

/** @deprecated Use DraggableList instead */
export const DraggableTaskList = DraggableList;

function DraggableItem({
  id,
  children,
}: {
  id: string;
  children: (props: {
    isDragging: boolean;
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: React.HTMLAttributes<HTMLElement>;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-40" : undefined}>
      {children({
        isDragging,
        attributes: attributes as React.HTMLAttributes<HTMLElement>,
        listeners: listeners as unknown as React.HTMLAttributes<HTMLElement>,
      })}
    </li>
  );
}
