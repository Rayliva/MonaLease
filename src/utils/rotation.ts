import type { LiveList, LiveObject } from "@liveblocks/client";
import type { PageData } from "../types/game";

export function getNextOwnerId(
  currentOwnerId: string,
  playerIds: string[],
): string {
  const idx = playerIds.indexOf(currentOwnerId);
  if (idx === -1) return playerIds[0];
  return playerIds[(idx + 1) % playerIds.length];
}

export function rotatePageOwners(
  pages: LiveList<LiveObject<PageData>>,
  playerIds: string[],
): void {
  for (let i = 0; i < pages.length; i++) {
    const page = pages.get(i);
    if (!page) continue;
    const next = getNextOwnerId(page.get("currentOwnerId"), playerIds);
    page.set("currentOwnerId", next);
  }
}
