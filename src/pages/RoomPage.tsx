import { useParams } from "react-router-dom";
import { LiveList } from "@liveblocks/client";
import { RoomProvider } from "../liveblocks/room";
import { useUiStore } from "../store/uiStore";
import { GameShell } from "./GameShell";

const DEFAULT_ROUND_SECONDS = 30;

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const userId = useUiStore((s) => s.userId);
  const userName = useUiStore((s) => s.userName);

  if (!roomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Invalid room URL
      </div>
    );
  }

  return (
    <RoomProvider
      id={`carousel-${roomId}`}
      initialPresence={{
        cursor: null,
        activePageId: null,
        isDrawing: false,
        userId,
        userName,
      }}
      initialStorage={{
        gameState: "LOBBY",
        timer: DEFAULT_ROUND_SECONDS,
        roundDurationSec: DEFAULT_ROUND_SECONDS,
        round: 0,
        pages: new LiveList([]),
        hostUserId: null,
      }}
    >
      <GameShell />
    </RoomProvider>
  );
}
