"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function SubtaskChecklist({ subtasks = [], onChange }) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef(null);

  const completed = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const addSubtask = () => {
    if (!newTitle.trim()) return;
    const updated = [
      ...subtasks,
      {
        title: newTitle.trim(),
        isCompleted: false,
        assignee: null,
        order: subtasks.length,
      },
    ];
    onChange(updated);
    setNewTitle("");
    inputRef.current?.focus();
  };

  const toggleComplete = (index) => {
    const updated = subtasks.map((st, i) =>
      i === index ? { ...st, isCompleted: !st.isCompleted } : st
    );
    onChange(updated);
  };

  const removeSubtask = (index) => {
    const updated = subtasks.filter((_, i) => i !== index);
    onChange(updated);
  };

  const startEdit = (index) => {
    setEditingId(index);
    setEditTitle(subtasks[index].title);
  };

  const saveEdit = (index) => {
    if (!editTitle.trim()) return;
    const updated = subtasks.map((st, i) =>
      i === index ? { ...st, title: editTitle.trim() } : st
    );
    onChange(updated);
    setEditingId(null);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...subtasks];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated.map((st, i) => ({ ...st, order: i })));
  };

  const moveDown = (index) => {
    if (index === subtasks.length - 1) return;
    const updated = [...subtasks];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated.map((st, i) => ({ ...st, order: i })));
  };

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Subtask
        </h4>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {completed}/{total} selesai
          </span>
        )}
      </div>

      {total > 0 && (
        <Progress value={percent} className="h-1.5" />
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((st, index) => (
          <div
            key={st._id || index}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors",
              st.isCompleted && "opacity-60"
            )}
          >
            <Checkbox
              checked={st.isCompleted}
              onCheckedChange={() => toggleComplete(index)}
              className="h-4 w-4 shrink-0"
            />

            {editingId === index ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveEdit(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(index);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 text-xs flex-1"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "text-sm flex-1 cursor-pointer",
                  st.isCompleted && "line-through text-muted-foreground"
                )}
                onDoubleClick={() => startEdit(index)}
              >
                {st.title}
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveUp(index)}
                disabled={index === 0}
              >
                <GripVertical className="h-3 w-3 rotate-90" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => removeSubtask(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          placeholder="Tambah subtask..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
          className="h-8 text-xs flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs shrink-0"
          onClick={addSubtask}
          disabled={!newTitle.trim()}
        >
          <Plus className="h-3 w-3" />
          Tambah
        </Button>
      </div>
    </div>
  );
}

