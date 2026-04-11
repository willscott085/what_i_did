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
  items: string[];
  onOrderChange?: (props: string[]) => void;
  children: (
    id: string,
    isDragging: boolean,
    dragAttributes: any,
    dragListeners: any,
  ) => React.ReactNode;
}

export function SortableList(props: SortableListProps) {
  const { items: defaultItems, onOrderChange, children } = props;
  const [items, setItems] = useState<string[]>(defaultItems);

  useEffect(() => {
    setItems(defaultItems);
  }, [defaultItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      const newOrder = arrayMove(items, oldIndex, newIndex);

      onOrderChange?.(newOrder);
      setItems(newOrder);
    },
    [items, onOrderChange],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((id) => (
          <SortableItem key={id} id={id}>
            {({ isDragging, attributes, listeners }) =>
              children(id, isDragging, attributes, listeners)
            }
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  id: string;
  children: (props: {
    isDragging: boolean;
    attributes: any;
    listeners: any;
  }) => React.ReactNode;
}
function SortableItem(props: SortableItemProps) {
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
    <div ref={setNodeRef} style={style}>
      {props.children({ isDragging, attributes, listeners })}
    </div>
  );
}
