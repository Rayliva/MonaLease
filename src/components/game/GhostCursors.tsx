import { Fragment } from "react";
import { useOthers } from "../../liveblocks/room";

const CURSOR_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface Props {
  pageId: string;
  canvasWidth: number;
  canvasHeight: number;
}

export function GhostCursors({ pageId, canvasWidth, canvasHeight }: Props) {
  const others = useOthers();

  const relevantUsers = others.filter(
    (u) => u.presence.activePageId === pageId && u.presence.cursor !== null,
  );

  if (relevantUsers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {relevantUsers.map((user, idx) => {
        const { cursor, userName, isDrawing, drawingPoints } = user.presence;
        const color = CURSOR_COLORS[idx % CURSOR_COLORS.length];

        return (
          <Fragment key={user.connectionId}>
            {drawingPoints && drawingPoints.length > 1 && (
              <svg
                className="absolute inset-0"
                width={canvasWidth}
                height={canvasHeight}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                <polyline
                  points={drawingPoints
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.6"
                />
              </svg>
            )}

            {cursor && (
              <div
                className="absolute -translate-x-1 -translate-y-1 transition-transform duration-75"
                style={{ left: cursor.x, top: cursor.y }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  style={{
                    filter: isDrawing
                      ? "drop-shadow(0 0 4px rgba(0,0,0,.3))"
                      : undefined,
                  }}
                >
                  <path
                    d="M3 2L17 10L10 11.5L7.5 18L3 2Z"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>
                <span
                  className="absolute left-4 top-4 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {userName || "Anonymous"}
                </span>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
