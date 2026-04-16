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
  const generationRef = useRef(0);

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
    return allSnapshots.every((snaps) => snaps.length >= pages.length);
  }, [allSnapshots, pages.length]);

  const currentPageSnapshots = allSnapshots[pageIdx] ?? [];
  const currentPage = pages[pageIdx];

  // Keep latest snapshots accessible to the effect without re-triggering it.
  const allSnapshotsRef = useRef(allSnapshots);
  allSnapshotsRef.current = allSnapshots;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

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

  const generateFinalImages = useCallback(async () => {
    const imgs: string[] = [];
    for (const page of pagesRef.current) {
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
  }, []);

  // ---- Timelapse effect ----
  // Uses a generation counter so that StrictMode double-mounts (or
  // dependency-triggered re-runs) cleanly abandon previous async work
  // instead of corrupting shared state.
  useEffect(() => {
    if (!revealDataReady) return;

    const gen = ++generationRef.current;
    const isCurrent = () => generationRef.current === gen;

    const snapData = allSnapshotsRef.current;
    const pageCount = snapData.length;

    setPhase("timelapse");
    setPageIdx(0);
    setSnapshotIdx(0);
    setActiveContributor(null);
    setFinishedImages([]);

    const localSleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        const check = setInterval(() => {
          if (!isCurrent()) {
            clearTimeout(id);
            clearInterval(check);
            resolve();
          }
        }, 100);
      });

    (async () => {
      const localImages: string[] = [];

      for (let pIdx = 0; pIdx < pageCount; pIdx++) {
        if (!isCurrent()) return;
        setPageIdx(pIdx);

        const canvas = initCanvas();
        if (!canvas) {
          localImages.push("");
          continue;
        }

        const snapshots = snapData[pIdx] ?? [];
        let prevObjectCount = 0;

        for (let sIdx = 0; sIdx < snapshots.length; sIdx++) {
          if (!isCurrent()) return;

          const snap = snapshots[sIdx];
          setSnapshotIdx(sIdx);
          setActiveContributor(snap.contributorId);

          const allObjects = getObjectsFromJSON(snap.canvasJSON);
          const newObjects = allObjects.slice(prevObjectCount);

          if (newObjects.length === 0) {
            await localSleep(PAUSE_BETWEEN_PLAYERS);
            prevObjectCount = allObjects.length;
            continue;
          }

          const strokeDelay = Math.min(
            MAX_STROKE_DELAY,
            Math.max(MIN_STROKE_DELAY, TARGET_PLAYER_MS / newObjects.length),
          );

          for (const objData of newObjects) {
            if (!isCurrent()) return;

            const enlivened = await util.enlivenObjects([objData]);
            const fabricObj = enlivened[0] as FabricObject | undefined;
            if (fabricObj) {
              canvas.add(fabricObj);
              canvas.renderAll();
            }
            await localSleep(strokeDelay);
          }

          prevObjectCount = allObjects.length;

          if (sIdx < snapshots.length - 1 && isCurrent()) {
            await localSleep(PAUSE_BETWEEN_PLAYERS);
          }
        }

        if (!isCurrent()) return;

        try {
          localImages.push(
            canvas.toDataURL({ format: "png", multiplier: 2 }),
          );
        } catch {
          localImages.push("");
        }

        if (pIdx < pageCount - 1 && isCurrent()) {
          await localSleep(PAUSE_BETWEEN_PAGES);
        }
      }

      if (!isCurrent()) return;

      setFinishedImages(localImages);
      setActiveContributor(null);
      setPhase("finished");
    })();

    return () => {
      generationRef.current++;
    };
    // We intentionally depend only on revealDataReady (and the stable
    // initCanvas). Snapshot data is captured via ref at the moment the
    // effect fires so that late Liveblocks storage updates don't restart
    // the timelapse mid-replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealDataReady, initCanvas]);

  const handleSkip = useCallback(async () => {
    const gen = ++generationRef.current;
    const imgs = await generateFinalImages();
    if (generationRef.current !== gen) return;
    setFinishedImages(imgs);
    setActiveContributor(null);
    setPhase("finished");
  }, [generateFinalImages]);

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
          onClick={handleSkip}
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
