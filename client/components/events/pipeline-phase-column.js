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
    <div className="flex flex-col w-72 shrink-0 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: PHASE_COLORS[phase] }}
      />
      <div className="p-3.5 space-y-2.5 border-b border-border/80 bg-muted/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{PHASE_LABELS[phase]}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => onQuickCreate(phase)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1 rounded-full" />
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
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
              "flex-1 p-2.5 space-y-2 min-h-[140px] overflow-y-auto soft-scrollbar",
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
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  Belum ada task pada fase ini
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}