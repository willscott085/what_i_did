import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useState } from "react";

interface SortableListProps {
  items?: string[];
  onOrderChange?: (props: string[]) => void;
  children: (props: { id: string; isDragging: boolean }) => React.ReactNode;
}
export function SortableList(props: SortableListProps) {
  const { items: defaultItems, onOrderChange, children } = props;

  const [items, setItems] = useState<string[]>(defaultItems ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    setItems((i) => {
      const oldIndex = i.indexOf(String(active.id));
      const newIndex = i.indexOf(String(over.id));

      return arrayMove(i, oldIndex, newIndex);
    });
  }, []);

  useEffect(() => {
    onOrderChange?.(items);
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((id) => (
          <SortableItem key={id} id={id}>
            {({ id, isDragging }) => children({ id, isDragging })}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  id: string;
  children: (props: { id: string; isDragging: boolean }) => React.ReactNode;
}
export function SortableItem(props: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children({ id: props.id, isDragging })}
    </div>
  );
}
