import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useEventListener, useOthers } from "../../liveblocks/room";
import type { RoomEvent } from "../../types/game";

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

// Keep a ghost stroke on screen briefly after mouse-up so it overlaps with
// the real canvasJSON sync and the viewer doesn't see a blank flash.
const STROKE_FADE_MS = 450;

interface Props {
  pageId: string;
  canvasWidth: number;
  canvasHeight: number;
}

type LiveStroke = {
  strokeId: string;
  pageId: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

export function GhostCursors({ pageId, canvasWidth, canvasHeight }: Props) {
  const others = useOthers();
  const [strokes, setStrokes] = useState<Record<number, LiveStroke>>({});
  const fadeTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>(
    {},
  );

  const handleEvent = useCallback(
    ({
      connectionId,
      event,
    }: {
      connectionId: number;
      event: RoomEvent;
    }) => {
      if (event.type === "stroke-update") {
        const timer = fadeTimersRef.current[connectionId];
        if (timer) {
          clearTimeout(timer);
          delete fadeTimersRef.current[connectionId];
        }
        setStrokes((prev) => ({
          ...prev,
          [connectionId]: {
            strokeId: event.strokeId,
            pageId: event.pageId,
            color: event.color,
            width: event.width,
            points: event.points,
          },
        }));
        return;
      }

      if (event.type === "stroke-end") {
        const existingTimer = fadeTimersRef.current[connectionId];
        if (existingTimer) clearTimeout(existingTimer);
        fadeTimersRef.current[connectionId] = setTimeout(() => {
          delete fadeTimersRef.current[connectionId];
          setStrokes((prev) => {
            const current = prev[connectionId];
            if (!current || current.strokeId !== event.strokeId) return prev;
            const { [connectionId]: _removed, ...rest } = prev;
            return rest;
          });
        }, STROKE_FADE_MS);
      }
    },
    [],
  );

  useEventListener(handleEvent);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(fadeTimersRef.current)) {
        clearTimeout(fadeTimersRef.current[Number(id)]);
      }
      fadeTimersRef.current = {};
    };
  }, []);

  const relevantUsers = others.filter(
    (u) => u.presence.activePageId === pageId && u.presence.cursor !== null,
  );

  const strokesOnThisPage = others
    .map((u) => {
      const stroke = strokes[u.connectionId];
      if (!stroke || stroke.pageId !== pageId) return null;
      return { connectionId: u.connectionId, stroke };
    })
    .filter((x): x is { connectionId: number; stroke: LiveStroke } => !!x);

  if (relevantUsers.length === 0 && strokesOnThisPage.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {strokesOnThisPage.length > 0 && (
        <svg
          className="absolute inset-0"
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          {strokesOnThisPage.map(({ connectionId, stroke }) => {
            if (stroke.points.length < 1) return null;
            if (stroke.points.length === 1) {
              const p = stroke.points[0];
              return (
                <circle
                  key={connectionId}
                  cx={p.x}
                  cy={p.y}
                  r={stroke.width / 2}
                  fill={stroke.color}
                />
              );
            }
            return (
              <polyline
                key={connectionId}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      )}

      {relevantUsers.map((user, idx) => {
        const { cursor, userName, isDrawing } = user.presence;
        const color = CURSOR_COLORS[idx % CURSOR_COLORS.length];

        return (
          <Fragment key={user.connectionId}>
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
