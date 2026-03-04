"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

function ConnectionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  selected,
  style,
}) {
  const {
    lineStyle = "solid",
    color = "#6b7280",
    arrowType = "one-way",
    label = "",
    onDelete,
  } = data;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Map lineStyle to CSS
  const strokeDasharray =
    lineStyle === "dashed" ? "8 4" : lineStyle === "dotted" ? "2 4" : "none";

  // Arrow marker
  const markerEnd = arrowType !== "none" ? `url(#arrow-${id})` : undefined;
  const markerStart =
    arrowType === "two-way" ? `url(#arrow-start-${id})` : undefined;

  return (
    <>
      {/* SVG marker definitions for arrows */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          {arrowType !== "none" && (
            <marker
              id={`arrow-${id}`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          )}
          {arrowType === "two-way" && (
            <marker
              id={`arrow-start-${id}`}
              viewBox="0 0 10 10"
              refX="0"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill={color} />
            </marker>
          )}
        </defs>
      </svg>

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray,
        }}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />

      {/* Edge label + delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="flex items-center gap-1"
        >
          {label && (
            <span
              className="bg-background/90 backdrop-blur-sm border rounded px-2 py-0.5 text-xs font-medium shadow-sm"
              style={{ color }}
            >
              {label}
            </span>
          )}
          {selected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full"
              onClick={() => onDelete?.(id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeComponent);
