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
};

export type Storage = {
  gameState: GameState;
  timer: number;
  roundDurationSec: number;
  round: number;
  pages: LiveList<LiveObject<PageData>>;
  /** First client to enter the room claims host; stable for the session. */
  hostUserId: string | null;
};

export type LiveStrokeUpdate = {
  type: "stroke-update";
  strokeId: string;
  pageId: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

export type LiveStrokeEnd = {
  type: "stroke-end";
  strokeId: string;
};

export type RoomEvent = LiveStrokeUpdate | LiveStrokeEnd;
