"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  Clock,
  MessageSquare,
  UserPlus,
  AtSign,
  ListTodo,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const getIconForType = (type) => {
  switch (type) {
    case "mention":
      return <AtSign className="h-3 w-3 text-blue-500" />;
    case "assign_task":
      return <ListTodo className="h-3 w-3 text-purple-500" />;
    case "due_date":
      return <Clock className="h-3 w-3 text-orange-500" />;
    case "new_comment":
      return <MessageSquare className="h-3 w-3 text-emerald-500" />;
    case "new_member":
      return <UserPlus className="h-3 w-3 text-teal-500" />;
    case "event_start":
    case "task_update":
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    default:
      return <Bell className="h-3 w-3 text-muted-foreground" />;
  }
};

export function NotificationPanel({ open, onOpenChange, notificationsHook }) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    filterType,
    setFilterType,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = notificationsHook;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    onOpenChange(false);
    router.push(notification.url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card/95 backdrop-blur-md border-l border-border/80 shadow-2xl"
        side="right"
      >
        <SheetHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
                <Bell className="h-4 w-4" />
              </div>
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground tabular-nums shadow-xs">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7.5 px-2 rounded-lg text-muted-foreground hover:text-foreground font-medium gap-1"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tandai semua dibaca</span>
            </Button>
          </div>

          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {[
              { id: "all", label: "Semua" },
              { id: "mention", label: "Mention" },
              { id: "assign_task", label: "Tugas" },
              { id: "new_comment", label: "Komentar" },
            ].map((tab) => {
              const active = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={cn(
                    "h-7 rounded-full px-3 text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-2">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs text-muted-foreground">Memuat notifikasi...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[50vh]">
              <div className="h-14 w-14 bg-muted/60 rounded-2xl flex items-center justify-center mb-3 text-muted-foreground/60 shadow-2xs">
                <Bell className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Belum ada notifikasi</h3>
              <p className="text-muted-foreground text-xs mt-1 max-w-xs leading-relaxed">
                Pemberitahuan aktivitas penting, mention, dan tugas tim akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "flex gap-3 p-3 rounded-2xl cursor-pointer transition-all border",
                    !notification.isRead
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-2xs"
                      : "bg-transparent border-transparent hover:bg-muted/40",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative mt-0.5 shrink-0">
                    <Avatar className="h-9 w-9 ring-1 ring-border/80">
                      <AvatarImage src={notification.actorId?.avatar} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                        {notification.actorId?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-xs border border-border/80">
                      {getIconForType(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/90 leading-snug">
                      {notification.actorId && (
                        <span className="font-bold text-foreground mr-1">
                          {notification.actorId.name}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {notification.message}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1 font-medium">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <div className="shrink-0 flex items-center justify-center pt-2">
                      <div className="h-2 w-2 bg-primary rounded-full ring-2 ring-primary/30" />
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <div className="p-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadMore();
                    }}
                    disabled={loadingMore}
                    className="w-full h-8.5 rounded-xl text-xs font-medium shadow-2xs"
                  >
                    {loadingMore ? "Memuat..." : "Muat notifikasi sebelumnya"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
