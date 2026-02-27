"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Online/Offline indicator dot
 *
 * @param {Object} props
 * @param {boolean} props.isOnline - Whether the user is online
 * @param {string} [props.size="sm"] - Size: "xs" | "sm" | "md"
 * @param {boolean} [props.showTooltip=true] - Show tooltip on hover
 * @param {boolean} [props.pulse=true] - Pulse animation when online
 * @param {string} [props.className] - Additional classes
 */
export function OnlineIndicator({
  isOnline,
  size = "sm",
  showTooltip = true,
  pulse = true,
  className,
}) {
  const sizeClasses = {
    xs: "h-2 w-2",
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
  };

  const pulseSizeClasses = {
    xs: "h-2 w-2",
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
  };

  const dot = (
    <span className={cn("relative inline-flex", className)}>
      {isOnline && pulse && (
        <span
          className={cn(
            "absolute inline-flex rounded-full bg-emerald-400 opacity-75 animate-ping",
            pulseSizeClasses[size],
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeClasses[size],
          isOnline
            ? "bg-emerald-500"
            : "bg-gray-300 dark:bg-gray-600",
        )}
      />
    </span>
  );

  if (!showTooltip) return dot;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{dot}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {isOnline ? "Online" : "Offline"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Avatar with online indicator overlay
 *
 * @param {Object} props
 * @param {string} [props.src] - Avatar image URL
 * @param {string} props.name - User name (for initials fallback)
 * @param {boolean} props.isOnline - Online status
 * @param {string} [props.size="md"] - Size: "sm" | "md" | "lg"
 * @param {string} [props.className] - Additional classes
 */
export function AvatarWithStatus({
  src,
  name,
  isOnline,
  size = "md",
  className,
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const indicatorPosition = {
    sm: "-bottom-0 -right-0",
    md: "-bottom-0.5 -right-0.5",
    lg: "-bottom-0.5 -right-0.5",
  };

  const indicatorSize = {
    sm: "xs",
    md: "sm",
    lg: "md",
  };

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium overflow-hidden",
          sizeClasses[size],
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className={cn("rounded-full object-cover", sizeClasses[size])}
          />
        ) : (
          name?.charAt(0).toUpperCase() || "?"
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute ring-2 ring-background rounded-full",
            indicatorPosition[size],
          )}
        >
          <OnlineIndicator
            isOnline={isOnline}
            size={indicatorSize[size]}
            showTooltip={false}
            pulse={false}
          />
        </span>
      )}
    </div>
  );
}

