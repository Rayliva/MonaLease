import { useCallback, useRef } from "react";
import type { Canvas } from "fabric";
import { useMutation } from "../liveblocks/room";

const DEBOUNCE_MS = 150;

export function useFabricSync(pageId: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeToStorage = useMutation(
    ({ storage }, json: string) => {
      const pages = storage.get("pages");
      for (let i = 0; i < pages.length; i++) {
        const page = pages.get(i);
        if (page?.get("id") === pageId) {
          page.set("canvasJSON", json);
          break;
        }
      }
    },
    [pageId],
  );

  const scheduleSync = useCallback(
    (canvas: Canvas) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const json = JSON.stringify(canvas.toJSON());
        writeToStorage(json);
      }, DEBOUNCE_MS);
    },
    [writeToStorage],
  );

  return { scheduleSync };
}
