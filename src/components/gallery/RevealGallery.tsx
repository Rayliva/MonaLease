import { useEffect, useRef, useState } from "react";
import { Canvas } from "fabric";
import { downloadAllAsPdf } from "../../utils/export";
import type { PageData } from "../../types/game";

interface Props {
  pages: readonly PageData[];
  userNames: Record<string, string>;
  onBackToLobby: () => void;
}

export function RevealGallery({ pages, userNames, onBackToLobby }: Props) {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (rendered) return;

    const urls: string[] = [];
    let pending = pages.length;

    pages.forEach((page) => {
      const el = canvasRefs.current.get(page.id);
      if (!el) {
        pending--;
        return;
      }

      const canvas = new Canvas(el, { width: 800, height: 500 });

      const finish = () => {
        canvas.renderAll();
        urls.push(canvas.toDataURL({ format: "png", multiplier: 2 }));
        pending--;
        if (pending <= 0) {
          setDataUrls([...urls]);
          setRendered(true);
        }
      };

      if (page.canvasJSON) {
        canvas
          .loadFromJSON(page.canvasJSON)
          .then(finish)
          .catch(finish);
      } else {
        finish();
      }
    });
  }, [pages, rendered]);

  const handleDownloadPdf = () => {
    if (dataUrls.length > 0) downloadAllAsPdf(dataUrls);
  };

  const handleDownloadPng = (idx: number) => {
    if (!dataUrls[idx]) return;
    const link = document.createElement("a");
    link.href = dataUrls[idx];
    link.download = `canvas-${idx + 1}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-3xl font-bold text-white">Gallery</h2>
      <p className="text-zinc-400">
        Every player has drawn on every page. Here are the finished masterpieces!
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleDownloadPdf}
          disabled={dataUrls.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Download All as PDF
        </button>
        <button
          onClick={onBackToLobby}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
        >
          New Game
        </button>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {pages.map((page, idx) => (
          <div
            key={page.id}
            className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
          >
            <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
              <span className="text-sm text-zinc-300">
                Started by {userNames[page.originalOwnerId] ?? page.originalOwnerId.slice(0, 8)}
              </span>
              <button
                onClick={() => handleDownloadPng(idx)}
                className="text-xs text-indigo-400 transition hover:text-indigo-300"
              >
                Download PNG
              </button>
            </div>
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(page.id, el);
              }}
              className="w-full bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
