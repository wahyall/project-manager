"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lightbulb,
  Plus,
  StickyNote,
  MessageSquare,
  Palette,
} from "lucide-react";

export default function BrainstormingPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Brainstorming
          </h1>
          <p className="text-muted-foreground mt-1">
            Catat ide, diskusi, dan rencana bersama tim
          </p>
        </div>
        <Button className="gap-2 shadow-sm" disabled>
          <Plus className="h-4 w-4" />
          Buat Board Baru
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 mb-6">
            <Lightbulb className="h-10 w-10 text-amber-500/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Brainstorming Board
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-1">
            Fitur brainstorming sedang dalam pengembangan. Kamu akan bisa membuat board kolaboratif untuk mengumpulkan ide bersama tim.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <StickyNote className="h-3.5 w-3.5" />
              Sticky notes
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <MessageSquare className="h-3.5 w-3.5" />
              Diskusi & komentar
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Palette className="h-3.5 w-3.5" />
              Canvas kolaboratif
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
        {["Ide Fitur Baru", "Rencana Sprint Q1", "Desain UI Revamp"].map(
          (title, i) => (
            <Card
              key={i}
              className="overflow-hidden border-dashed hover:border-primary/30 transition-colors cursor-not-allowed"
            >
              <div
                className={`h-1.5 ${
                  i === 0
                    ? "bg-amber-400"
                    : i === 1
                      ? "bg-blue-400"
                      : "bg-pink-400"
                }`}
              />
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">
                  Contoh board — segera hadir
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <StickyNote className="h-3 w-3" />
                  <span>0 catatan</span>
                  <span className="text-muted-foreground/30">·</span>
                  <MessageSquare className="h-3 w-3" />
                  <span>0 komentar</span>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

