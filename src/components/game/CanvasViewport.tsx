import { useEffect, useMemo, useRef } from "react";
import { CanvasBoard } from "./CanvasBoard";
import { GhostCursors } from "./GhostCursors";
import { TransitionLayer } from "./TransitionLayer";
import { Toolbar } from "./Toolbar";
import type { PageData, GameState } from "../../types/game";

const CANVAS_W = 800;
const CANVAS_H = 500;

interface Props {
  pages: readonly PageData[];
  selfUserId: string;
  gameState: GameState;
  userNames: Record<string, string>;
  timerSeconds: number;
  roundDurationSec: number;
}

export function CanvasViewport({
  pages,
  selfUserId,
  gameState,
  userNames,
  timerSeconds,
  roundDurationSec,
}: Props) {
  const isTransitioning = gameState === "TRANSITION";
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activePageId = useMemo(
    () => pages.find((page) => page.currentOwnerId === selfUserId)?.id ?? null,
    [pages, selfUserId],
  );

  useEffect(() => {
    if (!activePageId) return;
    const activePageEl = pageRefs.current[activePageId];
    activePageEl?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [activePageId]);

  return (
    <div className="flex flex-col gap-8">
      {pages.map((page) => {
        const canDraw =
          gameState === "DRAWING" && page.currentOwnerId === selfUserId;
        const isMyActive = page.currentOwnerId === selfUserId;
        const ownerName =
          userNames[page.originalOwnerId] ??
          page.originalOwnerId.slice(0, 8);

        return (
          <div
            key={page.id}
            ref={(el) => {
              pageRefs.current[page.id] = el;
            }}
            className={`relative rounded-2xl p-2 transition-shadow ${
              isMyActive
                ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20"
                : "opacity-60"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium">Page by {ownerName}</span>
              {isMyActive && (
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-white">
                  Your turn
                </span>
              )}
            </div>

            {isMyActive && (
              <Toolbar
                pageId={page.id}
                historyEnabled={canDraw}
                showTimer={gameState === "DRAWING"}
                timerSeconds={timerSeconds}
                roundDurationSec={roundDurationSec}
              />
            )}

            <TransitionLayer isTransitioning={isTransitioning && isMyActive}>
              <div className="relative mt-2">
                <CanvasBoard
                  page={page}
                  canDraw={canDraw}
                  width={CANVAS_W}
                  height={CANVAS_H}
                />
                <GhostCursors
                  pageId={page.id}
                  canvasWidth={CANVAS_W}
                  canvasHeight={CANVAS_H}
                />
              </div>
            </TransitionLayer>
          </div>
        );
      })}
    </div>
  );
}
