import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
  hasSortableData,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useMemo, useRef, useState } from "react";
import { PriorityCategory } from "~/features/categories/types";
import { Task } from "~/features/tasks/types";

// ─── Types ───────────────────────────────────────────────────────────

interface CategoryGroup {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  tasks: Task[];
}

interface CategoryGroupedListProps {
  tasks: Task[];
  categories: PriorityCategory[];
  onReorderInCategory: (taskIds: string[], categoryId: string | null) => void;
  onMoveToCategory: (
    taskId: string,
    categoryId: string | null,
    taskIdsInNewGroup: string[],
  ) => void;
  children: (
    task: Task,
    isDragging: boolean,
    dragAttributes: React.HTMLAttributes<HTMLElement>,
    dragListeners: DraggableSyntheticListeners,
    categoryColor: string | null,
  ) => React.ReactNode;
  completedChildren?: (task: Task) => React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function groupKey(categoryId: string | null) {
  return categoryId ?? "__uncategorized__";
}

function categoryIdFromGroupKey(key: string): string | null {
  return key === "__uncategorized__" ? null : key;
}

function buildGroups(
  tasks: Task[],
  categories: PriorityCategory[],
): { groups: CategoryGroup[]; completedTasks: Task[] } {
  const incompleteTasks = tasks.filter((t) => !t.dateCompleted);
  const completedTasks = tasks
    .filter((t) => !!t.dateCompleted)
    .sort(
      (a, b) =>
        new Date(b.dateCompleted!).getTime() -
        new Date(a.dateCompleted!).getTime(),
    );

  const grouped = new Map<string, Task[]>();

  for (const task of incompleteTasks) {
    const key = groupKey(task.priorityCategoryId);
    const arr = grouped.get(key) ?? [];
    arr.push(task);
    grouped.set(key, arr);
  }

  // Sort tasks within each group by sortOrder
  for (const arr of grouped.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Build groups in category sortOrder, uncategorized last
  const groups: CategoryGroup[] = [];

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const cat of sortedCats) {
    const catTasks = grouped.get(cat.id);
    if (catTasks && catTasks.length > 0) {
      groups.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        tasks: catTasks,
      });
    }
  }

  // Uncategorized group
  const uncategorized = grouped.get("__uncategorized__");
  if (uncategorized && uncategorized.length > 0) {
    groups.push({
      categoryId: null,
      categoryName: "Uncategorized",
      categoryColor: "#6b7280",
      tasks: uncategorized,
    });
  }

  return { groups, completedTasks };
}

// ─── Component ───────────────────────────────────────────────────────

export function CategoryGroupedList({
  tasks: allTasks,
  categories,
  onReorderInCategory,
  onMoveToCategory,
  children,
  completedChildren,
}: CategoryGroupedListProps) {
  // Derive groups from server data
  const serverGroups = useMemo(
    () => buildGroups(allTasks, categories),
    [allTasks, categories],
  );

  // Local override for group ordering — set synchronously during drag,
  // cleared when server data catches up (reference equality changes)
  const [localOverride, setLocalOverride] = useState<{
    groups: CategoryGroup[];
    serverRef: typeof serverGroups;
  } | null>(null);

  // Use local override if it exists and server data hasn't changed yet
  const groups =
    localOverride && localOverride.serverRef === serverGroups
      ? localOverride.groups
      : serverGroups.groups;
  const completedTasks = serverGroups.completedTasks;

  // Track the container the dragged item started in
  const dragSourceContainerRef = useRef<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);

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

      // Track where this drag started
      const task = allTasks.find((t) => t.id === id);
      dragSourceContainerRef.current = task
        ? groupKey(task.priorityCategoryId)
        : null;
    },
    [allTasks],
  );

  // Live cross-container movement during drag
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeContainerId = hasSortableData(active)
        ? String(active.data.current.sortable.containerId)
        : null;
      const overContainerId = hasSortableData(over)
        ? String(over.data.current.sortable.containerId)
        : null;

      // Only handle cross-container moves
      if (
        !activeContainerId ||
        !overContainerId ||
        activeContainerId === overContainerId
      )
        return;

      const activeTaskId = String(active.id);
      const overTaskId = String(over.id);

      setLocalOverride((prev) => {
        const currentGroups =
          prev && prev.serverRef === serverGroups
            ? prev.groups
            : serverGroups.groups;

        // Find source and target group indices
        const sourceIdx = currentGroups.findIndex(
          (g) => groupKey(g.categoryId) === activeContainerId,
        );
        const targetIdx = currentGroups.findIndex(
          (g) => groupKey(g.categoryId) === overContainerId,
        );
        if (sourceIdx === -1 || targetIdx === -1) return prev;

        const sourceGroup = currentGroups[sourceIdx];
        const targetGroup = currentGroups[targetIdx];

        // Find the task in the source group
        const taskIndex = sourceGroup.tasks.findIndex(
          (t) => t.id === activeTaskId,
        );
        if (taskIndex === -1) return prev;

        const task = sourceGroup.tasks[taskIndex];

        // Remove from source
        const newSourceTasks = sourceGroup.tasks.filter(
          (t) => t.id !== activeTaskId,
        );

        // Insert into target at the position of the item being hovered over
        const newTargetTasks = [...targetGroup.tasks];
        const overIndex = newTargetTasks.findIndex((t) => t.id === overTaskId);
        if (overIndex === -1) {
          newTargetTasks.push(task);
        } else {
          newTargetTasks.splice(overIndex, 0, task);
        }

        const newGroups = currentGroups.map((g, i) => {
          if (i === sourceIdx) return { ...g, tasks: newSourceTasks };
          if (i === targetIdx) return { ...g, tasks: newTargetTasks };
          return g;
        });

        return { groups: newGroups, serverRef: serverGroups };
      });
    },
    [serverGroups],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = activeId;
      setActiveId(null);

      const { active, over } = event;
      if (!over) {
        // Cancelled — reset local override
        setLocalOverride(null);
        dragSourceContainerRef.current = null;
        return;
      }

      // Find the group the item is currently in (from local state)
      const currentGroup = groups.find((g) =>
        g.tasks.some((t) => t.id === String(active.id)),
      );

      if (!currentGroup) {
        setLocalOverride(null);
        dragSourceContainerRef.current = null;
        return;
      }

      const currentContainerKey = groupKey(currentGroup.categoryId);
      const originalContainerKey = dragSourceContainerRef.current;

      if (
        currentContainerKey === originalContainerKey ||
        !originalContainerKey
      ) {
        // Same-group reorder (or dragged back to original group)
        if (active.id === over.id) {
          dragSourceContainerRef.current = null;
          return;
        }

        const ids = currentGroup.tasks.map((t) => t.id);
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = arrayMove(ids, oldIndex, newIndex);

          setLocalOverride({
            groups: groups.map((g) => {
              if (groupKey(g.categoryId) !== currentContainerKey) return g;
              const taskMap = new Map(g.tasks.map((t) => [t.id, t]));
              return {
                ...g,
                tasks: newOrder
                  .map((id) => taskMap.get(id))
                  .filter((t): t is Task => t !== undefined),
              };
            }),
            serverRef: serverGroups,
          });

          onReorderInCategory(newOrder, currentGroup.categoryId);
        }
      } else {
        // Cross-group move — persist category change + position atomically
        if (draggedId) {
          const targetCategoryId = categoryIdFromGroupKey(currentContainerKey);
          let targetTaskIds = currentGroup.tasks.map((t) => t.id);

          // onDragOver placed the task at the initial hover position, but the
          // user may have continued dragging within the target group. Use the
          // final over.id to determine the actual drop position.
          const activeIdx = targetTaskIds.indexOf(String(active.id));
          const overIdx = targetTaskIds.indexOf(String(over.id));
          if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
            targetTaskIds = arrayMove(targetTaskIds, activeIdx, overIdx);
          }

          setLocalOverride({
            groups: groups.map((g) => {
              if (groupKey(g.categoryId) !== currentContainerKey) return g;
              const taskMap = new Map(g.tasks.map((t) => [t.id, t]));
              return {
                ...g,
                tasks: targetTaskIds
                  .map((id) => taskMap.get(id))
                  .filter((t): t is Task => t !== undefined),
              };
            }),
            serverRef: serverGroups,
          });

          onMoveToCategory(draggedId, targetCategoryId, targetTaskIds);
        }
      }

      dragSourceContainerRef.current = null;
    },
    [activeId, groups, serverGroups, onReorderInCategory, onMoveToCategory],
  );

  const activeTask = activeId ? allTasks.find((t) => t.id === activeId) : null;

  // Find which group the active task is currently in (may differ from original during drag)
  const activeTaskColor = useMemo(() => {
    if (!activeId) return null;
    const currentGroup = groups.find((g) =>
      g.tasks.some((t) => t.id === activeId),
    );
    return currentGroup?.categoryColor ?? null;
  }, [activeId, groups]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {groups.map((group) => (
        <CategoryGroupSection
          key={groupKey(group.categoryId)}
          group={group}
          activeId={activeId}
        >
          {(task, isDragging, attrs, listeners) =>
            children(task, isDragging, attrs, listeners, group.categoryColor)
          }
        </CategoryGroupSection>
      ))}

      <DragOverlay dropAnimation={null}>
        {activeTask
          ? children(activeTask, true, {}, undefined, activeTaskColor)
          : null}
      </DragOverlay>

      {/* Completed section — not sortable */}
      {completedTasks.length > 0 && (
        <div className="pl-4">
          {completedTasks.map((task) =>
            completedChildren ? (
              completedChildren(task)
            ) : (
              <div key={task.id}>
                {children(task, false, {}, undefined, null)}
              </div>
            ),
          )}
        </div>
      )}
    </DndContext>
  );
}

// ─── Category Group Section ──────────────────────────────────────────

interface CategoryGroupSectionProps {
  group: CategoryGroup;
  activeId: string | null;
  children: (
    task: Task,
    isDragging: boolean,
    dragAttributes: React.HTMLAttributes<HTMLElement>,
    dragListeners: DraggableSyntheticListeners,
  ) => React.ReactNode;
}

function CategoryGroupSection({
  group,
  activeId,
  children,
}: CategoryGroupSectionProps) {
  const ids = useMemo(() => group.tasks.map((t) => t.id), [group.tasks]);

  return (
    <SortableContext
      id={groupKey(group.categoryId)}
      items={ids}
      strategy={verticalListSortingStrategy}
    >
      {group.tasks.map((task) => (
        <SortableItem key={task.id} id={task.id}>
          {({ isDragging, attributes, listeners }) =>
            children(
              task,
              isDragging || task.id === activeId,
              attributes,
              listeners,
            )
          }
        </SortableItem>
      ))}
    </SortableContext>
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
    // Skip layout animation for the item that was just dragged
    // so it appears instantly at the new position
    animateLayoutChanges: ({ wasDragging, ...rest }) =>
      wasDragging
        ? false
        : defaultAnimateLayoutChanges({ wasDragging, ...rest }),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Keep the space but hide the content while the DragOverlay shows the copy
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ isDragging, attributes, listeners })}
    </div>
  );
}
