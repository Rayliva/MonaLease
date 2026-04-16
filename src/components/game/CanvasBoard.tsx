import { useEffect, useRef } from "react";
import { Canvas, PencilBrush } from "fabric";
import {
  useBroadcastEvent,
  useMutation,
  useUpdateMyPresence,
} from "../../liveblocks/room";
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
  const broadcast = useBroadcastEvent();
  const brushColor = useUiStore((s) => s.brushColor);
  const brushWidth = useUiStore((s) => s.brushWidth);

  const canDrawRef = useRef(canDraw);
  canDrawRef.current = canDraw;
  const presenceRef = useRef(updatePresence);
  presenceRef.current = updatePresence;
  const broadcastRef = useRef(broadcast);
  broadcastRef.current = broadcast;
  const drawingPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const activeStrokeIdRef = useRef<string | null>(null);
  const isPointerDownRef = useRef(false);
  const lastPointsSyncRef = useRef(0);
  const syncPendingRef = useRef(false);
  const syncNeedsFlushRef = useRef(false);
  const brushColorRef = useRef(brushColor);
  brushColorRef.current = brushColor;
  const brushWidthRef = useRef(brushWidth);
  brushWidthRef.current = brushWidth;

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

    const flushSyncImmediate = () => {
      try {
        const json = JSON.stringify(canvas.toJSON());
        writeRef.current(json);
      } catch {
        /* canvas may have been disposed */
      }
    };

    const syncNow = () => {
      if (syncPendingRef.current) {
        syncNeedsFlushRef.current = true;
        return;
      }
      syncPendingRef.current = true;
      setTimeout(() => {
        try {
          const json = JSON.stringify(canvas.toJSON());
          writeRef.current(json);
        } catch {
          /* canvas may have been disposed */
        }
        syncPendingRef.current = false;
        if (syncNeedsFlushRef.current) {
          syncNeedsFlushRef.current = false;
          syncNow();
        }
      }, 50);
    };

    const endActiveStroke = () => {
      const strokeId = activeStrokeIdRef.current;
      isPointerDownRef.current = false;
      drawingPointsRef.current = [];
      activeStrokeIdRef.current = null;
      presenceRef.current({ isDrawing: false });
      if (strokeId) {
        broadcastRef.current({ type: "stroke-end", strokeId });
      }
    };

    canvas.on("path:created", () => {
      endActiveStroke();
      // Flush immediately so round snapshots (host) never read stale
      // canvasJSON before this stroke is committed.
      flushSyncImmediate();
      syncNow();
    });

    canvas.on("object:added", syncNow);
    canvas.on("object:modified", syncNow);

    canvas.on("mouse:move", (e) => {
      const pointer = canvas.getScenePoint(e.e);
      const strokeId = activeStrokeIdRef.current;

      if (
        isPointerDownRef.current &&
        canvas.isDrawingMode &&
        strokeId !== null
      ) {
        drawingPointsRef.current.push({ x: pointer.x, y: pointer.y });
        const now = Date.now();
        if (now - lastPointsSyncRef.current > 30) {
          lastPointsSyncRef.current = now;
          broadcastRef.current({
            type: "stroke-update",
            strokeId,
            pageId: page.id,
            color: brushColorRef.current,
            width: brushWidthRef.current,
            points: [...drawingPointsRef.current],
          });
        }
      }

      presenceRef.current({
        cursor: { x: pointer.x, y: pointer.y },
        activePageId: page.id,
        isDrawing: isPointerDownRef.current && canvas.isDrawingMode,
      });
    });

    canvas.on("mouse:down", (e) => {
      if (!canvas.isDrawingMode) return;
      const pointer = canvas.getScenePoint(e.e);
      isPointerDownRef.current = true;
      drawingPointsRef.current = [{ x: pointer.x, y: pointer.y }];
      const strokeId =
        (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
        `s-${Date.now()}-${Math.random()}`;
      activeStrokeIdRef.current = strokeId;
      lastPointsSyncRef.current = 0;
      presenceRef.current({
        cursor: { x: pointer.x, y: pointer.y },
        activePageId: page.id,
        isDrawing: true,
      });
      broadcastRef.current({
        type: "stroke-update",
        strokeId,
        pageId: page.id,
        color: brushColorRef.current,
        width: brushWidthRef.current,
        points: [...drawingPointsRef.current],
      });
    });

    canvas.on("mouse:up", () => {
      // path:created already fires on a successful stroke, but for a click
      // without movement (no Fabric path produced) we still need to clean up.
      if (activeStrokeIdRef.current !== null) {
        endActiveStroke();
      }
      isPointerDownRef.current = false;
    });

    canvas.on("mouse:out", () => {
      presenceRef.current({ cursor: null });
    });

    const handleWindowPointerUp = () => {
      if (activeStrokeIdRef.current !== null) {
        endActiveStroke();
      }
      isPointerDownRef.current = false;
    };
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    fabricRef.current = canvas;

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
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
