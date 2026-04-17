export type CanvasHistoryApi = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

const registry = new Map<string, CanvasHistoryApi>();

export function registerCanvasHistory(
  pageId: string,
  api: CanvasHistoryApi,
): () => void {
  registry.set(pageId, api);
  return () => {
    registry.delete(pageId);
  };
}

export function getCanvasHistory(pageId: string): CanvasHistoryApi | undefined {
  return registry.get(pageId);
}
