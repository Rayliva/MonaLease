import { useEffect, useRef } from "react";
import {
  Canvas,
  Color,
  FabricImage,
  FabricObject,
  PencilBrush,
} from "fabric";
import {
  useBroadcastEvent,
  useMutation,
  useUpdateMyPresence,
} from "../../liveblocks/room";
import { registerCanvasHistory } from "../../store/canvasHistoryRegistry";
import { useCanvasHistoryUiStore } from "../../store/canvasHistoryUiStore";
import { useUiStore } from "../../store/uiStore";
import type { PageData } from "../../types/game";
import { floodFillImageData } from "../../utils/floodFill";

if (!FabricObject.customProperties.includes("contributorId")) {
  FabricObject.customProperties.push("contributorId");
}

const MAX_HISTORY = 40;

interface Props {
  page: PageData;
  canDraw: boolean;
  width?: number;
  height?: number;
}

type ContribObject = FabricObject & { contributorId?: string };

export function CanvasBoard({
  page,
  canDraw,
  width = 800,
  height = 500,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringHistoryRef = useRef(false);

  const updatePresence = useUpdateMyPresence();
  const broadcast = useBroadcastEvent();
  const brushColor = useUiStore((s) => s.brushColor);
  const brushWidth = useUiStore((s) => s.brushWidth);
  const drawingTool = useUiStore((s) => s.drawingTool);
  const userId = useUiStore((s) => s.userId);

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
  const drawingToolRef = useRef(drawingTool);
  drawingToolRef.current = drawingTool;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const fillBusyRef = useRef(false);

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

  const bumpHistoryUi = () => useCanvasHistoryUiStore.getState().bump();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const el = document.createElement("canvas");
    wrapper.innerHTML = "";
    wrapper.appendChild(el);

    const canvas = new Canvas(el, {
      isDrawingMode: canDrawRef.current && drawingToolRef.current !== "fill",
      width,
      height,
      selection: canDrawRef.current && drawingToolRef.current !== "fill",
    });

    if (page.canvasJSON) {
      canvas
        .loadFromJSON(page.canvasJSON)
        .then(() => canvas.renderAll())
        .catch(() => {});
    }

    const captureCanvasJson = () => {
      try {
        return JSON.stringify(canvas.toJSON());
      } catch {
        return "{}";
      }
    };

    const pushUndoFromCurrent = () => {
      if (!canDrawRef.current || isRestoringHistoryRef.current) return;
      const json = captureCanvasJson();
      undoStackRef.current.push(json);
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      bumpHistoryUi();
    };

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

    const performUndo = () => {
      if (!canDrawRef.current || undoStackRef.current.length === 0) return;
      const current = captureCanvasJson();
      const prev = undoStackRef.current.pop();
      if (prev === undefined) return;
      redoStackRef.current.push(current);
      isRestoringHistoryRef.current = true;
      canvas
        .loadFromJSON(prev)
        .then(() => {
          canvas.renderAll();
          isRestoringHistoryRef.current = false;
          writeRef.current(prev);
          flushSyncImmediate();
          bumpHistoryUi();
        })
        .catch(() => {
          isRestoringHistoryRef.current = false;
        });
    };

    const performRedo = () => {
      if (!canDrawRef.current || redoStackRef.current.length === 0) return;
      const current = captureCanvasJson();
      const next = redoStackRef.current.pop();
      if (next === undefined) return;
      undoStackRef.current.push(current);
      isRestoringHistoryRef.current = true;
      canvas
        .loadFromJSON(next)
        .then(() => {
          canvas.renderAll();
          isRestoringHistoryRef.current = false;
          writeRef.current(next);
          flushSyncImmediate();
          bumpHistoryUi();
        })
        .catch(() => {
          isRestoringHistoryRef.current = false;
        });
    };

    const unregisterHistory = registerCanvasHistory(page.id, {
      undo: performUndo,
      redo: performRedo,
      canUndo: () => undoStackRef.current.length > 0,
      canRedo: () => redoStackRef.current.length > 0,
    });

    canvas.on("before:path:created", () => {
      pushUndoFromCurrent();
    });

    const applyFillAt = async (sceneX: number, sceneY: number) => {
      if (fillBusyRef.current) return;
      fillBusyRef.current = true;
      try {
        canvas.discardActiveObject();
        canvas.renderAll();
        const snapshot = canvas.toCanvasElement(1);
        const snapCtx = snapshot.getContext("2d");
        if (!snapCtx) return;

        const ix = Math.max(
          0,
          Math.min(width - 1, Math.floor(sceneX)),
        );
        const iy = Math.max(
          0,
          Math.min(height - 1, Math.floor(sceneY)),
        );

        const source = snapCtx.getImageData(0, 0, width, height);
        const work = new ImageData(
          new Uint8ClampedArray(source.data),
          width,
          height,
        );
        const filled = new Uint8Array(width * height);
        const c = new Color(brushColorRef.current);
        const [r, g, b, a1] = c.getSource();
        const fa = Math.round(a1 * 255);
        const bbox = floodFillImageData(
          work,
          ix,
          iy,
          r,
          g,
          b,
          fa,
          32,
          filled,
        );
        if (!bbox) return;

        pushUndoFromCurrent();

        const { minX, minY, maxX, maxY } = bbox;
        const pw = maxX - minX + 1;
        const ph = maxY - minY + 1;
        const patchData = new Uint8ClampedArray(pw * ph * 4);
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            const vi = py * width + px;
            if (!filled[vi]) continue;
            const si = vi * 4;
            const di = ((py - minY) * pw + (px - minX)) * 4;
            patchData[di] = work.data[si]!;
            patchData[di + 1] = work.data[si + 1]!;
            patchData[di + 2] = work.data[si + 2]!;
            patchData[di + 3] = work.data[si + 3]!;
          }
        }

        const patch = new ImageData(patchData, pw, ph);
        const patchCanvas = document.createElement("canvas");
        patchCanvas.width = pw;
        patchCanvas.height = ph;
        const pctx = patchCanvas.getContext("2d");
        if (!pctx) return;
        pctx.putImageData(patch, 0, 0);
        const dataUrl = patchCanvas.toDataURL();

        const img = await FabricImage.fromURL(dataUrl, undefined, {
          left: minX,
          top: minY,
          originX: "left",
          originY: "top",
        });
        const co = img as ContribObject;
        co.contributorId = userIdRef.current;
        canvas.add(co);
        canvas.requestRenderAll();
        flushSyncImmediate();
        syncNow();
      } finally {
        fillBusyRef.current = false;
      }
    };

    canvas.on("path:created", (opt) => {
      const path = opt.path;
      (path as ContribObject).contributorId = userIdRef.current;
      endActiveStroke();
      flushSyncImmediate();
      syncNow();
    });

    canvas.on("object:added", syncNow);
    canvas.on("object:modified", syncNow);
    canvas.on("object:removed", syncNow);

    canvas.on("mouse:down", (opt) => {
      if (!canDrawRef.current || drawingToolRef.current !== "fill") return;
      opt.e.preventDefault();
      const pointer = canvas.getScenePoint(opt.e);
      void applyFillAt(pointer.x, pointer.y);
    });

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
        if (
          now - lastPointsSyncRef.current > 30 &&
          drawingToolRef.current === "pencil"
        ) {
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
      if (drawingToolRef.current === "pencil") {
        broadcastRef.current({
          type: "stroke-update",
          strokeId,
          pageId: page.id,
          color: brushColorRef.current,
          width: brushWidthRef.current,
          points: [...drawingPointsRef.current],
        });
      }
    });

    canvas.on("mouse:up", () => {
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
      unregisterHistory();
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      canvas.dispose();
      fabricRef.current = null;
      undoStackRef.current = [];
      redoStackRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, width, height]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    const isFill = drawingTool === "fill";
    c.isDrawingMode = canDraw && !isFill;
    c.selection = canDraw && !isFill;
    if (isFill) {
      c.upperCanvasEl.style.cursor = "cell";
      return;
    }
    const b = new PencilBrush(c);
    b.color = brushColor;
    b.width = brushWidth;
    c.freeDrawingBrush = b;
    c.upperCanvasEl.style.cursor = "crosshair";
  }, [canDraw, brushColor, brushWidth, drawingTool]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c || !page.canvasJSON || canDrawRef.current) return;
    undoStackRef.current = [];
    redoStackRef.current = [];
    useCanvasHistoryUiStore.getState().bump();
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
