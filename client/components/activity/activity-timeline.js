"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Columns3,
  FileEdit,
  History,
  Loader2,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Table2,
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  Paperclip,
  Crown,
  Sprout,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ── Action config mapping ───────────────────────
const ACTION_CONFIG = {
  // Task
  "task.created": {
    icon: Plus,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    label: (a) => `membuat task`,
  },
  "task.updated": {
    icon: Pencil,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const field = a.details?.field;
      return field ? `mengubah ${field} pada task` : `mengupdate task`;
    },
  },
  "task.moved": {
    icon: Columns3,
    color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
    label: (a) => {
      const col = a.details?.newValue;
      return col ? `memindahkan task ke kolom "${col}"` : `memindahkan task`;
    },
  },
  "task.deleted": {
    icon: Trash2,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: (a) => `menghapus task`,
  },
  "task.archived": {
    icon: Archive,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    label: (a) => `mengarsipkan task`,
  },
  "task.unarchived": {
    icon: ArchiveRestore,
    color: "text-teal-600 bg-teal-500/10 border-teal-500/20",
    label: (a) => `mengembalikan task dari arsip`,
  },
  "task.assigned": {
    icon: UserPlus,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => `menugaskan anggota ke task`,
  },
  "task.unassigned": {
    icon: UserMinus,
    color: "text-gray-600 bg-gray-500/10 border-gray-500/20",
    label: (a) => `menghapus penugasan pada task`,
  },
  "task.priority_changed": {
    icon: ArrowRightLeft,
    color: "text-orange-600 bg-orange-500/10 border-orange-500/20",
    label: (a) => `mengubah prioritas task`,
  },
  "task.duedate_changed": {
    icon: FileEdit,
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
    label: (a) => `mengubah batas waktu task`,
  },
  "task.attachment_added": {
    icon: Paperclip,
    color: "text-green-600 bg-green-500/10 border-green-500/20",
    label: (a) => {
      const name = a.details?.newValue;
      return name
        ? `menambah lampiran "${name}" pada task`
        : `menambah lampiran pada task`;
    },
  },
  "task.attachment_removed": {
    icon: Paperclip,
    color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
    label: (a) => `menghapus lampiran dari task`,
  },
  // Event
  "event.created": {
    icon: Plus,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    label: (a) => `membuat agenda event`,
  },
  "event.updated": {
    icon: Pencil,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const field = a.details?.field;
      return field ? `mengubah ${field} pada event` : `mengupdate event`;
    },
  },
  "event.deleted": {
    icon: Trash2,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: (a) => `menghapus event`,
  },
  "event.participant_added": {
    icon: UserPlus,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const name = a.details?.newValue;
      return name
        ? `menambahkan "${name}" sebagai peserta event`
        : `menambahkan peserta event`;
    },
  },
  "event.participant_removed": {
    icon: UserMinus,
    color: "text-gray-600 bg-gray-500/10 border-gray-500/20",
    label: (a) => `menghapus peserta dari event`,
  },
  // Idea (Bank Ide)
  "idea.created": {
    icon: Plus,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    label: (a) => `menulis ide baru`,
  },
  "idea.updated": {
    icon: Pencil,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const field = a.details?.field;
      return field ? `mengubah ${field} pada ide` : `mengupdate ide`;
    },
  },
  "idea.status_changed": {
    icon: Sprout,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    label: (a) => {
      const value = a.details?.newValue;
      return value
        ? `mengubah status ide menjadi "${value}"`
        : `mengubah status ide`;
    },
  },
  "idea.deleted": {
    icon: Trash2,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: (a) => `menghapus ide`,
  },
  // Spreadsheet
  "spreadsheet.sheet_created": {
    icon: Table2,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    label: (a) => `menambah sheet baru`,
  },
  "spreadsheet.sheet_deleted": {
    icon: Table2,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: (a) => `menghapus sheet`,
  },
  "spreadsheet.sheet_renamed": {
    icon: Table2,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const name = a.details?.newValue;
      return name
        ? `mengubah nama sheet menjadi "${name}"`
        : `mengubah nama sheet`;
    },
  },
  // Workspace
  "workspace.updated": {
    icon: Settings,
    color: "text-gray-600 bg-gray-500/10 border-gray-500/20",
    label: (a) => `mengubah pengaturan workspace`,
  },
  "workspace.archived": {
    icon: Archive,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    label: (a) => `mengarsipkan workspace`,
  },
  "workspace.member_invited": {
    icon: UserPlus,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: (a) => {
      const email = a.details?.newValue;
      return email ? `mengundang ${email}` : `mengundang member baru`;
    },
  },
  "workspace.member_joined": {
    icon: UserPlus,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    label: (a) => `bergabung ke workspace`,
  },
  "workspace.member_left": {
    icon: UserMinus,
    color: "text-gray-600 bg-gray-500/10 border-gray-500/20",
    label: (a) => `meninggalkan workspace`,
  },
  "workspace.member_removed": {
    icon: UserMinus,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: (a) => `mengeluarkan member dari workspace`,
  },
  "workspace.role_changed": {
    icon: ArrowRightLeft,
    color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
    label: (a) => {
      const newRole = a.details?.newValue;
      return newRole
        ? `mengubah role menjadi ${newRole}`
        : `mengubah role member`;
    },
  },
  "workspace.ownership_transferred": {
    icon: Crown,
    color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20",
    label: (a) => `mentransfer kepemilikan workspace`,
  },
};

const DEFAULT_CONFIG = {
  icon: History,
  color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
  label: (a) => a.action,
};

// ── Timeline Item ───────────────────────────────
function ActivityItem({ activity, isLast }) {
  const config = ACTION_CONFIG[activity.action] || DEFAULT_CONFIG;
  const Icon = config.icon;
  const actor = activity.actorId;
  const actorName = actor?.name || "Unknown User";
  const actorInitials = actorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = activity.createdAt
    ? formatDistanceToNow(new Date(activity.createdAt), {
        addSuffix: true,
        locale: localeId,
      })
    : "";

  return (
    <div className="flex gap-3.5 group">
      {/* Timeline line + icon */}
      <div className="relative flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${config.color} shadow-2xs transition-transform group-hover:scale-105`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-5 pt-0.5 min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <Avatar className="h-5.5 w-5.5 shrink-0 mt-0.5 ring-1 ring-border/80">
            <AvatarImage src={actor?.avatar} alt={actorName} />
            <AvatarFallback className="text-[9px] bg-muted font-medium">
              {actorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-foreground/90">
              <span className="font-semibold text-foreground">{actorName}</span>{" "}
              <span className="text-muted-foreground">
                {config.label(activity)}
              </span>
              {activity.targetName && (
                <>
                  {" "}
                  <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded-md inline-block">
                    &ldquo;{activity.targetName}&rdquo;
                  </span>
                </>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────
function ActivitySkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3.5">
          <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1 pt-1">
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
            <Skeleton className="h-2.5 w-1/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ─────────────────────────────────
function ActivityEmpty({ message = "Belum ada riwayat aktivitas" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 px-6 text-center shadow-2xs backdrop-blur-xs">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60 shadow-2xs">
        <Activity className="h-6 w-6" />
      </div>
      <p className="text-xs font-semibold text-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Semua tindakan tim akan tercatat secara otomatis di sini.
      </p>
    </div>
  );
}

// ── Main Timeline Component ─────────────────────
export function ActivityTimeline({
  activities,
  loading,
  hasMore,
  onLoadMore,
  emptyMessage,
  compact = false,
}) {
  if (loading && activities.length === 0) {
    return <ActivitySkeleton count={compact ? 3 : 5} />;
  }

  if (!loading && activities.length === 0) {
    return <ActivityEmpty message={emptyMessage} />;
  }

  return (
    <div className="space-y-1">
      <div>
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity._id}
            activity={activity}
            isLast={index === activities.length - 1 && !hasMore}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="h-8.5 rounded-xl border-border/80 bg-background/80 px-4 text-xs font-medium text-muted-foreground hover:text-foreground shadow-2xs gap-2"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <History className="h-3.5 w-3.5" />
            )}
            Muat aktivitas lainnya
          </Button>
        </div>
      )}
    </div>
  );
}
