import { useGameLogic } from "../hooks/useGameLogic";
import { useUiStore } from "../store/uiStore";
import { LobbyView } from "../components/lobby/LobbyView";
import { CanvasViewport } from "../components/game/CanvasViewport";
import { TimerBar } from "../components/game/TimerBar";
import { RoundBadge } from "../components/game/RoundBadge";
import { RevealGallery } from "../components/gallery/RevealGallery";

const ROUND_SECONDS = 60;

export function GameShell() {
  const userId = useUiStore((s) => s.userId);
  const userName = useUiStore((s) => s.userName);
  const {
    loading,
    gameState,
    timer,
    round,
    pages,
    isHost,
    allUserIds,
    userNames,
    startGame,
    backToLobby,
  } = useGameLogic(userId, userName);

  if (loading || gameState === "LOBBY") {
    return <LobbyView isHost={isHost} onStart={startGame} />;
  }

  if (gameState === "REVEAL") {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <RevealGallery
          pages={pages}
          userNames={userNames}
          onBackToLobby={backToLobby}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-6">
      <header className="flex items-center justify-between">
        <RoundBadge round={round} totalRounds={allUserIds.length} />
        <div className="w-64">
          <TimerBar seconds={timer} maxSeconds={ROUND_SECONDS} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto">
        <CanvasViewport
          pages={pages}
          selfUserId={userId}
          gameState={gameState ?? "DRAWING"}
          userNames={userNames}
        />
      </main>
    </div>
  );
}
