import { useUiStore } from "../../store/uiStore";

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

export function Toolbar() {
  const brushColor = useUiStore((s) => s.brushColor);
  const brushWidth = useUiStore((s) => s.brushWidth);
  const setBrushColor = useUiStore((s) => s.setBrushColor);
  const setBrushWidth = useUiStore((s) => s.setBrushWidth);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
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

      <div className="flex items-center gap-2">
        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
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
    </div>
  );
}
