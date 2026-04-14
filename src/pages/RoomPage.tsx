import { useState } from "react";
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
  const setUser = useUiStore((s) => s.setUser);

  const [name, setName] = useState(userName);
  const [joined, setJoined] = useState(false);

  if (!roomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Invalid room URL
      </div>
    );
  }

  if (!joined) {
    const handleJoin = () => {
      setUser(userId, name.trim() || "Anonymous");
      setJoined(true);
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <h1 className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-4xl font-extrabold text-transparent">
          Join Room
        </h1>
        <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
          <label className="text-sm font-medium text-zinc-300">
            Your Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
          </label>
          <button
            onClick={handleJoin}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Join
          </button>
        </div>
        <p className="text-sm text-zinc-500">Room: {roomId}</p>
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
