import { useGameLogic } from "../hooks/useGameLogic";
import { useUiStore } from "../store/uiStore";
import { LobbyView } from "../components/lobby/LobbyView";
import { CanvasViewport } from "../components/game/CanvasViewport";
import { RoundBadge } from "../components/game/RoundBadge";
import { RevealGallery } from "../components/gallery/RevealGallery";

export function GameShell() {
  const userId = useUiStore((s) => s.userId);
  const userName = useUiStore((s) => s.userName);
  const {
    loading,
    gameState,
    timer,
    roundDurationSec,
    round,
    pages,
    isHost,
    hostId,
    allUserIds,
    userNames,
    startGame,
    setRoundDuration,
    backToLobby,
  } = useGameLogic(userId, userName);

  if (loading || gameState === "LOBBY") {
    return (
      <LobbyView
        isHost={isHost}
        hostId={hostId}
        roundDurationSec={roundDurationSec}
        onRoundDurationChange={setRoundDuration}
        onStart={startGame}
      />
    );
  }

  if (gameState === "REVEAL") {
    return (
      <RevealGallery
        pages={pages}
        userNames={userNames}
        onPlayAgain={startGame}
        onBackToLobby={backToLobby}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-6">
      <header className="flex items-center">
        <RoundBadge round={round} totalRounds={allUserIds.length} />
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto">
        <CanvasViewport
          pages={pages}
          selfUserId={userId}
          gameState={gameState ?? "DRAWING"}
          userNames={userNames}
          timerSeconds={timer}
          roundDurationSec={roundDurationSec}
        />
      </main>
    </div>
  );
}
