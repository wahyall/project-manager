"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import {
  History,
  UserPlus,
  Settings,
  FileEdit,
  CheckCircle2,
  Columns3,
} from "lucide-react";

// Example activities to show UI preview
const SAMPLE_ACTIVITIES = [
  {
    icon: UserPlus,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    message: "Aktivitas member dan task akan ditampilkan di sini",
    time: "Segera hadir",
  },
];

export default function ActivityPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-slate-500" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Riwayat aktivitas di workspace ini
        </p>
      </div>

      {/* Empty / Coming soon state */}
      <Card>
        <CardContent className="py-16">
          <div className="max-w-md mx-auto">
            {/* Timeline preview */}
            <div className="space-y-6">
              {[
                {
                  icon: CheckCircle2,
                  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
                  text: "Task selesai dikerjakan",
                  desc: "Lacak penyelesaian task",
                },
                {
                  icon: UserPlus,
                  color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
                  text: "Member baru bergabung",
                  desc: "Pantau aktivitas member",
                },
                {
                  icon: Columns3,
                  color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",
                  text: "Task dipindahkan ke kolom lain",
                  desc: "Lihat progress task",
                },
                {
                  icon: Settings,
                  color: "text-gray-500 bg-gray-50 dark:bg-gray-900/20",
                  text: "Pengaturan workspace diubah",
                  desc: "Audit trail lengkap",
                },
                {
                  icon: FileEdit,
                  color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
                  text: "Catatan brainstorming ditambah",
                  desc: "Dokumentasi otomatis",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.color}`}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    {i < 4 && (
                      <div className="w-px h-full bg-border absolute top-9 left-1/2 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-foreground/80">
                      {item.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground/60">
                Fitur activity log sedang dalam pengembangan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

