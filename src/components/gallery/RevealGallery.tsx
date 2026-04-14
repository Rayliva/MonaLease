import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, util, type FabricObject } from "fabric";
import { downloadAllAsPdf } from "../../utils/export";
import type { PageData, Snapshot } from "../../types/game";

const CANVAS_W = 800;
const CANVAS_H = 500;
const TARGET_PLAYER_MS = 6000;
const MIN_STROKE_DELAY = 80;
const MAX_STROKE_DELAY = 400;
const PAUSE_BETWEEN_PLAYERS = 1200;
const PAUSE_BETWEEN_PAGES = 2000;

type Phase = "timelapse" | "finished";

interface Props {
  pages: readonly PageData[];
  userNames: Record<string, string>;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

function parseSnapshots(page: PageData): Snapshot[] {
  try {
    const snaps: Snapshot[] = JSON.parse(page.snapshotsJSON || "[]");
    if (snaps.length > 0) return snaps;
  } catch {
    /* fall through to fallback */
  }
  if (page.canvasJSON) {
    return [
      { contributorId: page.originalOwnerId, canvasJSON: page.canvasJSON },
    ];
  }
  return [];
}

function getObjectsFromJSON(canvasJSON: string): any[] {
  if (!canvasJSON) return [];
  try {
    const parsed = JSON.parse(canvasJSON);
    return parsed.objects ?? [];
  } catch {
    return [];
  }
}

export function RevealGallery({
  pages,
  userNames,
  onPlayAgain,
  onBackToLobby,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const cancelRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("timelapse");
  const [pageIdx, setPageIdx] = useState(0);
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [activeContributor, setActiveContributor] = useState<string | null>(
    null,
  );
  const [finishedImages, setFinishedImages] = useState<string[]>([]);

  const allSnapshots = useMemo(
    () => pages.map((page) => parseSnapshots(page)),
    [pages],
  );
  const revealDataReady = useMemo(() => {
    if (pages.length === 0) return false;
    // In a complete round-robin game each page should have one snapshot per player.
    return allSnapshots.every((snaps) => snaps.length >= pages.length);
  }, [allSnapshots, pages.length]);

  const currentPageSnapshots = allSnapshots[pageIdx] ?? [];
  const currentPage = pages[pageIdx];
  const collectedImages = useRef<string[]>([]);

  const initCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;

    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    const el = document.createElement("canvas");
    wrapper.innerHTML = "";
    wrapper.appendChild(el);

    const canvas = new Canvas(el, {
      width: CANVAS_W,
      height: CANVAS_H,
      selection: false,
      interactive: false,
    });
    fabricRef.current = canvas;
    return canvas;
  }, []);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(resolve, ms);
      const check = setInterval(() => {
        if (cancelRef.current) {
          clearTimeout(id);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

  const replayPage = useCallback(
    async (pgIdx: number) => {
      const canvas = initCanvas();
      if (!canvas) {
        collectedImages.current.push("");
        return;
      }

      const snapshots = allSnapshots[pgIdx] ?? [];
      let prevObjectCount = 0;

      for (let sIdx = 0; sIdx < snapshots.length; sIdx++) {
        if (cancelRef.current) break;

        const snap = snapshots[sIdx];
        setSnapshotIdx(sIdx);
        setActiveContributor(snap.contributorId);

        const allObjects = getObjectsFromJSON(snap.canvasJSON);
        const newObjects = allObjects.slice(prevObjectCount);

        if (newObjects.length === 0) {
          await sleep(PAUSE_BETWEEN_PLAYERS);
          prevObjectCount = allObjects.length;
          continue;
        }

        const strokeDelay = Math.min(
          MAX_STROKE_DELAY,
          Math.max(MIN_STROKE_DELAY, TARGET_PLAYER_MS / newObjects.length),
        );

        for (const objData of newObjects) {
          if (cancelRef.current) break;

          const enlivened = await util.enlivenObjects([objData]);
          const fabricObj = enlivened[0] as FabricObject | undefined;
          if (fabricObj) {
            canvas.add(fabricObj);
            canvas.renderAll();
          }
          await sleep(strokeDelay);
        }

        prevObjectCount = allObjects.length;

        if (sIdx < snapshots.length - 1 && !cancelRef.current) {
          await sleep(PAUSE_BETWEEN_PLAYERS);
        }
      }

      try {
        collectedImages.current.push(
          canvas.toDataURL({ format: "png", multiplier: 2 }),
        );
      } catch {
        collectedImages.current.push("");
      }
    },
    [allSnapshots, initCanvas],
  );

  const generateSkippedImages = useCallback(async () => {
    const imgs: string[] = [];
    for (const page of pages) {
      if (!page.canvasJSON) {
        imgs.push("");
        continue;
      }
      const offscreen = document.createElement("canvas");
      const c = new Canvas(offscreen, {
        width: CANVAS_W,
        height: CANVAS_H,
      });
      try {
        await c.loadFromJSON(page.canvasJSON);
        c.renderAll();
        imgs.push(c.toDataURL({ format: "png", multiplier: 2 }));
      } catch {
        imgs.push("");
      }
      c.dispose();
    }
    return imgs;
  }, [pages]);

  const runTimelapse = useCallback(async () => {
    if (!revealDataReady) return;
    cancelRef.current = false;
    collectedImages.current = [];

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      if (cancelRef.current) break;
      setPageIdx(pIdx);
      await replayPage(pIdx);

      if (pIdx < pages.length - 1 && !cancelRef.current) {
        await sleep(PAUSE_BETWEEN_PAGES);
      }
    }

    if (cancelRef.current) {
      const imgs = await generateSkippedImages();
      setFinishedImages(imgs);
    } else {
      setFinishedImages([...collectedImages.current]);
    }

    setActiveContributor(null);
    setPhase("finished");
  }, [pages, replayPage, generateSkippedImages, revealDataReady]);

  useEffect(() => {
    if (!revealDataReady) return;
    setPhase("timelapse");
    setPageIdx(0);
    setSnapshotIdx(0);
    setActiveContributor(null);
    setFinishedImages([]);
    runTimelapse();
    return () => {
      cancelRef.current = true;
    };
  }, [runTimelapse, revealDataReady]);

  const handleDownloadPdf = () => {
    const urls = finishedImages.filter(Boolean);
    if (urls.length > 0) downloadAllAsPdf(urls);
  };

  const handleDownloadPng = (idx: number) => {
    const url = finishedImages[idx];
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `canvas-${idx + 1}.png`;
    link.click();
  };

  // --- Timelapse view ---
  if (!revealDataReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Preparing reveal...</p>
      </div>
    );
  }

  if (phase === "timelapse") {
    const snapshots = currentPageSnapshots;
    const ownerName =
      userNames[currentPage?.originalOwnerId] ??
      currentPage?.originalOwnerId?.slice(0, 8) ??
      "";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Page {pageIdx + 1} of {pages.length}
          </p>
          <h2 className="text-2xl font-bold text-white">
            Started by {ownerName}
          </h2>
        </div>

        <div className="flex gap-6">
          <div
            ref={wrapperRef}
            className="overflow-hidden rounded-xl border border-zinc-700 bg-white"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          />

          <div className="flex w-48 flex-col gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Contributors
            </h3>
            {snapshots.map((snap, idx) => {
              const name =
                userNames[snap.contributorId] ??
                snap.contributorId.slice(0, 8);
              const isActive =
                activeContributor === snap.contributorId &&
                snapshotIdx === idx;

              return (
                <div
                  key={`${snap.contributorId}-${idx}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : idx <= snapshotIdx
                        ? "text-zinc-300"
                        : "text-zinc-600"
                  }`}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          {pages.map((_, idx) => (
            <div
              key={idx}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === pageIdx
                  ? "bg-emerald-500"
                  : idx < pageIdx
                    ? "bg-emerald-800"
                    : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            cancelRef.current = true;
          }}
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Skip to results
        </button>
      </div>
    );
  }

  // --- Finished view ---
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-zinc-950 px-4 py-12">
      <h2 className="text-3xl font-bold text-white">Masterpieces Complete</h2>
      <p className="text-zinc-400">
        Every player has drawn on every page!
      </p>

      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Play Again
        </button>
        <button
          onClick={onBackToLobby}
          className="rounded-lg bg-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
        >
          Back to Lobby
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={finishedImages.filter(Boolean).length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Download PDF
        </button>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {pages.map((page, idx) => {
          const ownerName =
            userNames[page.originalOwnerId] ??
            page.originalOwnerId.slice(0, 8);
          const imgSrc = finishedImages[idx];

          return (
            <div
              key={page.id}
              className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
            >
              <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
                <span className="text-sm text-zinc-300">
                  Started by {ownerName}
                </span>
                <button
                  onClick={() => handleDownloadPng(idx)}
                  className="text-xs text-indigo-400 transition hover:text-indigo-300"
                >
                  Download PNG
                </button>
              </div>
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={`Canvas by ${ownerName}`}
                  className="w-full bg-white"
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-white text-zinc-400"
                  style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
                >
                  No drawing
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
