import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getInitials } from "@/components/kanban/task-card";

export function MentionHoverCard({ user, children }) {
  if (!user) return <>{children}</>;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-0 rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3.5">
            <Avatar className="h-12 w-12 rounded-2xl border-2 border-background shadow-2xs">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-sm">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                {user.name}
                {user.isOnline && (
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20"
                    title="Online"
                  />
                )}
              </h4>
              <Badge
                variant="outline"
                className="w-fit text-[10px] h-5 rounded-md px-1.5 uppercase font-semibold tracking-wider border-border/80"
              >
                {user.role || "Member"}
              </Badge>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
