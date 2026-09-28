"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskCard } from "@/components/kanban/task-card";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/pipeline-phases";
import { cn } from "@/lib/utils";

export function PipelinePhaseColumn({ phase, tasks, progress, onQuickCreate, onTaskClick }) {
  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30">
      <div
        className="h-1 rounded-t-lg"
        style={{ backgroundColor: PHASE_COLORS[phase] }}
      />
      <div className="p-3 space-y-2 border-b bg-background/60 rounded-t-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{PHASE_LABELS[phase]}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQuickCreate(phase)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground shrink-0">
            {progress.done}/{progress.total}
          </span>
        </div>
      </div>

      <Droppable droppableId={phase}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                isSelected={false}
                onToggleSelect={() => {}}
                onClick={() => onTaskClick(task)}
                isDependencyBlocked={false}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada item
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
