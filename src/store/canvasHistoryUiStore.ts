import { create } from "zustand";

/** Bumped when undo/redo stacks change so toolbar can re-check canUndo/canRedo. */
export const useCanvasHistoryUiStore = create<{
  version: number;
  bump: () => void;
}>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
