import { useUiStore } from "../../store/uiStore";
import { getCanvasHistory } from "../../store/canvasHistoryRegistry";
import { useCanvasHistoryUiStore } from "../../store/canvasHistoryUiStore";
import { TimerBar } from "./TimerBar";

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const BRUSH_SIZES = [2, 4, 8, 14];

interface Props {
  pageId: string;
  /** When false, undo/redo are disabled (e.g. not in drawing phase). */
  historyEnabled?: boolean;
  showTimer?: boolean;
  timerSeconds?: number;
  roundDurationSec?: number;
}

export function Toolbar({
  pageId,
  historyEnabled = true,
  showTimer = false,
  timerSeconds = 0,
  roundDurationSec = 30,
}: Props) {
  const brushColor = useUiStore((s) => s.brushColor);
  const brushWidth = useUiStore((s) => s.brushWidth);
  const drawingTool = useUiStore((s) => s.drawingTool);
  const setBrushColor = useUiStore((s) => s.setBrushColor);
  const setBrushWidth = useUiStore((s) => s.setBrushWidth);
  const setDrawingTool = useUiStore((s) => s.setDrawingTool);

  const historyVersion = useCanvasHistoryUiStore((s) => s.version);
  const history = getCanvasHistory(pageId);
  void historyVersion;

  const canUndo = historyEnabled && (history?.canUndo() ?? false);
  const canRedo = historyEnabled && (history?.canRedo() ?? false);

  const strokeTools = drawingTool === "pencil";

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setBrushColor(color)}
            className={`h-7 w-7 rounded-full border-2 transition ${
              brushColor === color
                ? "border-emerald-400 scale-110"
                : "border-zinc-600 hover:border-zinc-400"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="ml-1 h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
          title="Custom color"
        />
      </div>

      <div className="h-6 w-px bg-zinc-700" />

      <div
        className={`flex items-center gap-2 ${!strokeTools ? "pointer-events-none opacity-40" : ""}`}
      >
        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setBrushWidth(size)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              brushWidth === size
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
            title={`${size}px`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: size + 2, height: size + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-zinc-700" />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDrawingTool("pencil")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            drawingTool === "pencil"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
          title="Brush"
        >
          Brush
        </button>
        <button
          type="button"
          onClick={() => setDrawingTool("fill")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            drawingTool === "fill"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
          title="Fill a closed area (click)"
        >
          Fill
        </button>
      </div>

      <div className="h-6 w-px bg-zinc-700" />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => history?.undo()}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => history?.redo()}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Redo"
        >
          Redo
        </button>
      </div>

      {showTimer && (
        <>
          <div className="hidden h-6 w-px bg-zinc-700 sm:block" />
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end sm:max-w-xs">
            <TimerBar seconds={timerSeconds} maxSeconds={roundDurationSec} />
          </div>
        </>
      )}
    </div>
  );
}
