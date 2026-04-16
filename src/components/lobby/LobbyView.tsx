import { useState } from "react";
import { useParams } from "react-router-dom";
import { useOthers, useSelf } from "../../liveblocks/room";

interface Props {
  isHost: boolean;
  hostId: string;
  roundDurationSec: number;
  onRoundDurationChange: (seconds: number) => void;
  onStart: () => void;
}

export function LobbyView({
  isHost,
  hostId,
  roundDurationSec,
  onRoundDurationChange,
  onStart,
}: Props) {
  const { roomId } = useParams<{ roomId: string }>();
  const self = useSelf();
  const others = useOthers();
  const playerCount = 1 + others.length;
  const [copied, setCopied] = useState(false);

  const roomCode = roomId ?? "";

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSelfHost = self?.presence.userId === hostId;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-4">
      <h1 className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-5xl font-extrabold text-transparent">
        Mona Lease
      </h1>

      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <div className="mb-5 rounded-lg bg-zinc-800 px-4 py-3 text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Room Code
          </p>
          <p className="font-mono text-2xl font-bold tracking-widest text-emerald-400">
            {roomCode}
          </p>
          <button
            onClick={handleCopy}
            className="mt-2 text-xs text-indigo-400 transition hover:text-indigo-300"
          >
            {copied ? "Copied link!" : "Copy invite link"}
          </button>
        </div>

        <h2 className="mb-4 text-lg font-semibold text-zinc-200">
          Players ({playerCount})
        </h2>

        <ul className="mb-6 space-y-2">
          {self && (
            <li className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {self.presence.userName || "You"}
              <div className="ml-auto flex items-center gap-2">
                {isSelfHost && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    host
                  </span>
                )}
                <span className="text-xs text-emerald-400">you</span>
              </div>
            </li>
          )}
          {others.map((user) => (
            <li
              key={user.connectionId}
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {user.presence.userName || "Anonymous"}
              {user.presence.userId === hostId && (
                <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  host
                </span>
              )}
            </li>
          ))}
        </ul>

        {isHost ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Time per round
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={300}
                  step={5}
                  value={roundDurationSec}
                  onChange={(e) =>
                    onRoundDurationChange(Number(e.target.value) || 30)
                  }
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-zinc-500">seconds</span>
              </div>
            </label>

            <button
              onClick={onStart}
              disabled={playerCount < 2}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playerCount < 2 ? "Waiting for players..." : "Start Game"}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-500">
            Waiting for the host to start the game...
          </p>
        )}
      </div>

      <p className="max-w-md text-center text-sm text-zinc-500">
        Share the room code above or this page URL with friends. Each player
        draws on a canvas, then pages rotate until everyone has contributed.
      </p>
    </div>
  );
}
