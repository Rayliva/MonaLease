import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../store/uiStore";

export function HomePage() {
  const navigate = useNavigate();
  const setUser = useUiStore((s) => s.setUser);
  const userId = useUiStore((s) => s.userId);
  const [name, setName] = useState(useUiStore.getState().userName);
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = () => {
    const code = roomCode.trim() || crypto.randomUUID().slice(0, 8);
    setUser(userId, name.trim() || "Anonymous");
    navigate(`/room/${code}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-4">
      <h1 className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-6xl font-extrabold text-transparent">
        Mona Lease
      </h1>
      <p className="max-w-md text-center text-zinc-400">
        A collaborative art leasing experience. Create or join a room, lease
        the artworks as they rotate between players.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <label className="text-sm font-medium text-zinc-300">
          Your Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-zinc-300">
          Room Code
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Leave blank to create a new room"
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          />
        </label>

        <button
          onClick={handleJoin}
          className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {roomCode.trim() ? "Join Room" : "Create Room"}
        </button>
      </div>
    </div>
  );
}
