import { useEffect, useRef } from "react";
import { Canvas, PencilBrush } from "fabric";
import { useMutation, useUpdateMyPresence } from "../../liveblocks/room";
import { useUiStore } from "../../store/uiStore";
import type { PageData } from "../../types/game";

interface Props {
  page: PageData;
  canDraw: boolean;
  width?: number;
  height?: number;
}

export function CanvasBoard({
  page,
  canDraw,
  width = 800,
  height = 500,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const updatePresence = useUpdateMyPresence();
  const brushColor = useUiStore((s) => s.brushColor);
  const brushWidth = useUiStore((s) => s.brushWidth);

  const canDrawRef = useRef(canDraw);
  canDrawRef.current = canDraw;
  const presenceRef = useRef(updatePresence);
  presenceRef.current = updatePresence;
  const drawingPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const lastPointsSyncRef = useRef(0);
  const syncPendingRef = useRef(false);

  const writeCanvasJSON = useMutation(
    ({ storage }, json: string) => {
      const pages = storage.get("pages");
      for (let i = 0; i < pages.length; i++) {
        const p = pages.get(i);
        if (p?.get("id") === page.id) {
          p.set("canvasJSON", json);
          break;
        }
      }
    },
    [page.id],
  );

  const writeRef = useRef(writeCanvasJSON);
  writeRef.current = writeCanvasJSON;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const el = document.createElement("canvas");
    wrapper.innerHTML = "";
    wrapper.appendChild(el);

    const canvas = new Canvas(el, {
      isDrawingMode: canDrawRef.current,
      width,
      height,
      selection: canDrawRef.current,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushWidth;

    if (page.canvasJSON) {
      canvas
        .loadFromJSON(page.canvasJSON)
        .then(() => canvas.renderAll())
        .catch(() => {});
    }

    const syncNow = () => {
      if (syncPendingRef.current) return;
      syncPendingRef.current = true;
      setTimeout(() => {
        try {
          const json = JSON.stringify(canvas.toJSON());
          writeRef.current(json);
        } catch {
          /* canvas may have been disposed */
        }
        syncPendingRef.current = false;
      }, 50);
    };

    canvas.on("path:created", () => {
      drawingPointsRef.current = [];
      presenceRef.current({ drawingPoints: null, isDrawing: false });
      syncNow();
    });

    canvas.on("object:added", syncNow);
    canvas.on("object:modified", syncNow);

    canvas.on("mouse:move", (e) => {
      const pointer = canvas.getScenePoint(e.e);
      const pe = e.e as PointerEvent;
      const activelyDrawing = canvas.isDrawingMode && pe.buttons > 0;

      if (activelyDrawing) {
        drawingPointsRef.current.push({ x: pointer.x, y: pointer.y });
        const now = Date.now();
        if (now - lastPointsSyncRef.current > 60) {
          lastPointsSyncRef.current = now;
          presenceRef.current({
            cursor: { x: pointer.x, y: pointer.y },
            activePageId: page.id,
            isDrawing: true,
            drawingPoints: [...drawingPointsRef.current],
          });
          return;
        }
      }

      presenceRef.current({
        cursor: { x: pointer.x, y: pointer.y },
        activePageId: page.id,
        isDrawing: activelyDrawing,
      });
    });

    canvas.on("mouse:down", () => {
      if (canvas.isDrawingMode) {
        drawingPointsRef.current = [];
      }
    });

    canvas.on("mouse:out", () => {
      presenceRef.current({ cursor: null });
    });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, width, height]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.isDrawingMode = canDraw;
    c.selection = canDraw;
    if (c.freeDrawingBrush) {
      c.freeDrawingBrush.color = brushColor;
      c.freeDrawingBrush.width = brushWidth;
    }
  }, [canDraw, brushColor, brushWidth]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c || !page.canvasJSON || canDrawRef.current) return;
    c.loadFromJSON(page.canvasJSON)
      .then(() => c.renderAll())
      .catch(() => {});
  }, [page.canvasJSON]);

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden rounded-xl border border-zinc-700 bg-white"
      style={{ width, height }}
    />
  );
}
