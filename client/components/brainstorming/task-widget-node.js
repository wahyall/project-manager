"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { useWidgetTasks } from "@/hooks/use-widget-tasks";
import { TaskCard } from "@/components/kanban/task-card";
import { ListTodo, Loader2, RefreshCw, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TaskWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id;

  const selectedTaskId = widgetData?.taskId || null;

  const { allTasks, selectedTask, loading } = useWidgetTasks(
    workspaceId,
    selectedTaskId,
  );

  const [open, setOpen] = useState(false);

  const handleSelectTask = (taskId) => {
    onUpdateWidget(widgetId, { data: { ...widgetData, taskId } });
    setOpen(false);
  };

  const handleRemoveTask = () => {
    onUpdateWidget(widgetId, { data: { ...widgetData, taskId: null } });
  };

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-full min-h-[150px]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // State "Belum Dihubungkan" or Task was deleted/archived
  if (!selectedTaskId || (!selectedTask && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center p-5 h-full min-h-[150px] text-center space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <ListTodo className="h-5 w-5" />
        </div>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          {!selectedTaskId
            ? "Pilih Task dari workspace untuk disematkan di widget ini"
            : "Task tidak ditemukan atau telah diarsipkan"}
        </p>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-[210px] text-xs justify-start h-8.5 rounded-xl border-border/80 bg-background/80 shadow-2xs"
            >
              <Search className="mr-2 h-3.5 w-3.5 opacity-50" />
              Pilih task...
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[260px] p-1 rounded-xl border-border/80 shadow-xl"
            align="center"
            onClick={(e) => e.stopPropagation()}
          >
            <Command className="bg-transparent">
              <CommandInput
                placeholder="Cari judul task..."
                className="text-xs h-8"
              />
              <CommandList className="max-h-56 p-1">
                <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                  Tidak ada task ditemukan.
                </CommandEmpty>
                <CommandGroup>
                  {allTasks.map((task) => (
                    <CommandItem
                      key={task._id}
                      value={task.title}
                      onSelect={() => handleSelectTask(task._id)}
                      className="text-xs py-2 rounded-lg cursor-pointer"
                    >
                      <span className="truncate">{task.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedTaskId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveTask}
            className="text-[11px] h-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Reset Widget
          </Button>
        )}
      </div>
    );
  }

  // State "Task Terpilih"
  return (
    <div
      className="flex flex-col h-full bg-card/60 overflow-hidden relative"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="p-3 flex-1 flex flex-col pointer-events-auto">
        {selectedTask ? (
          <div className="scale-95 origin-top">
            <TaskCard
              task={selectedTask}
              index={0}
              isSelected={false}
              isDraggable={false}
              onClick={() => {}}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveTask}
            className="text-[11px] h-6 px-2.5 rounded-lg text-muted-foreground hover:text-primary gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Ganti Task
          </Button>
        </div>
      </div>
    </div>
  );
}
