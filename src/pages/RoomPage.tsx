import { useParams } from "react-router-dom";
import { LiveList } from "@liveblocks/client";
import { RoomProvider } from "../liveblocks/room";
import { useUiStore } from "../store/uiStore";
import { GameShell } from "./GameShell";

const ROUND_SECONDS = 60;

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
        drawingPoints: null,
      }}
      initialStorage={{
        gameState: "LOBBY",
        timer: ROUND_SECONDS,
        round: 0,
        pages: new LiveList([]),
      }}
    >
      <GameShell />
    </RoomProvider>
  );
}
