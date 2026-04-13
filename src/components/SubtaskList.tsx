import { useState } from "react";
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "~/utils/utils";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Task } from "~/features/tasks/types";

interface SubtaskListProps {
  subtasks: Task[];
  onAdd: (title: string) => void;
  onComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
}

export function SubtaskList({
  subtasks,
  onAdd,
  onComplete,
  onDelete,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    onAdd(title);
    setNewTitle("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  const completedCount = subtasks.filter((s) => s.dateCompleted).length;

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {completedCount}/{subtasks.length} completed
        </p>
      )}

      <ul className="space-y-1">
        {subtasks.map((subtask) => (
          <li
            key={subtask.id}
            className="group hover:bg-accent/50 flex items-center gap-2 rounded-md px-1 py-0.5"
          >
            <Checkbox
              checked={!!subtask.dateCompleted}
              onCheckedChange={(checked) =>
                onComplete(subtask.id, checked === true)
              }
              className="size-4"
            />
            <span
              className={cn(
                "flex-1 text-sm",
                subtask.dateCompleted && "text-muted-foreground line-through",
              )}
            >
              {subtask.title}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 opacity-0 group-hover:opacity-100"
              onClick={() => onDelete(subtask.id)}
              aria-label={`Delete subtask: ${subtask.title}`}
            >
              <Trash2Icon className="size-3" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <PlusIcon className="text-muted-foreground size-4" />
        <Input
          type="text"
          placeholder="Add subtask…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
        />
        {newTitle.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6"
            onClick={handleAdd}
            aria-label="Add subtask"
          >
            <CheckIcon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
