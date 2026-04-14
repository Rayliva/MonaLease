import type { LiveList, LiveObject } from "@liveblocks/client";

export type GameState = "LOBBY" | "DRAWING" | "TRANSITION" | "REVEAL";

export type Snapshot = {
  contributorId: string;
  canvasJSON: string;
};

export type PageData = {
  id: string;
  originalOwnerId: string;
  currentOwnerId: string;
  canvasJSON: string;
  snapshotsJSON: string;
};

export type Presence = {
  cursor: { x: number; y: number } | null;
  activePageId: string | null;
  isDrawing: boolean;
  userId: string;
  userName: string;
  drawingPoints: Array<{ x: number; y: number }> | null;
};

export type Storage = {
  gameState: GameState;
  timer: number;
  round: number;
  pages: LiveList<LiveObject<PageData>>;
};
