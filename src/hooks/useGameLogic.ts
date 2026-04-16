import { useEffect, useMemo, useRef } from "react";
import { LiveObject } from "@liveblocks/client";
import { useMutation, useOthers, useStorage } from "../liveblocks/room";
import { rotatePageOwners } from "../utils/rotation";
import type { GameState, PageData, Snapshot } from "../types/game";

const TRANSITION_MS = 700;
const DEFAULT_ROUND_SECONDS = 30;
const MIN_ROUND_SECONDS = 10;
const MAX_ROUND_SECONDS = 300;

function captureSnapshots(
  pages: ReturnType<ReturnType<typeof useStorage<any>>["get"]>,
) {
  for (let i = 0; i < (pages as any).length; i++) {
    const page = (pages as any).get(i);
    if (!page) continue;

    const existing: Snapshot[] = JSON.parse(
      page.get("snapshotsJSON") || "[]",
    );
    existing.push({
      contributorId: page.get("currentOwnerId"),
      canvasJSON: page.get("canvasJSON"),
    });
    page.set("snapshotsJSON", JSON.stringify(existing));
  }
}

export function useGameLogic(selfUserId: string, selfUserName: string) {
  const others = useOthers();
  const gameState = useStorage((root) => root.gameState) as GameState | null;
  const timer = useStorage((root) => root.timer) as number;
  const roundDurationSec = useStorage((root) => root.roundDurationSec) as
    | number
    | null;
  const round = useStorage((root) => root.round) as number;
  const pages = useStorage((root) => root.pages) as readonly PageData[] | null;
  const hostUserIdFromStorage = useStorage(
    (root) => root.hostUserId,
  ) as string | null | undefined;

  const loading = gameState === null;

  const allUserIds = useMemo(() => {
    const ids = [
      selfUserId,
      ...others.map((o) => o.presence.userId).filter(Boolean),
    ];
    return Array.from(new Set(ids)).sort();
  }, [others, selfUserId]);

  /** Stable host: first client to join claims `hostUserId` in storage. */
  const claimHost = useMutation(({ storage }, uid: string) => {
    const current = storage.get("hostUserId");
    if (current == null || current === "") {
      storage.set("hostUserId", uid);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    claimHost(selfUserId);
  }, [loading, selfUserId, claimHost]);

  const hostId =
    hostUserIdFromStorage != null && hostUserIdFromStorage !== ""
      ? hostUserIdFromStorage
      : (allUserIds[0] ?? selfUserId);
  const isHost = selfUserId === hostId;
  const tickingRef = useRef(false);

  const tick = useMutation(({ storage }) => {
    const current = storage.get("timer");
    if (current > 0) storage.set("timer", current - 1);
  }, []);

  const beginTransition = useMutation(({ storage }) => {
    if (storage.get("gameState") === "DRAWING") {
      storage.set("gameState", "TRANSITION");
    }
  }, []);

  const rotate = useMutation(
    ({ storage }) => {
      const livePages = storage.get("pages");
      captureSnapshots(livePages);
      rotatePageOwners(livePages, allUserIds);
      storage.set("round", storage.get("round") + 1);
      const duration = storage.get("roundDurationSec") ?? DEFAULT_ROUND_SECONDS;
      storage.set("timer", duration);
      storage.set("gameState", "DRAWING");
    },
    [allUserIds],
  );

  const setReveal = useMutation(({ storage }) => {
    const livePages = storage.get("pages");
    captureSnapshots(livePages);
    storage.set("gameState", "REVEAL");
  }, []);

  const startGame = useMutation(
    ({ storage }) => {
      const livePages = storage.get("pages");
      while (livePages.length > 0) livePages.delete(0);
      allUserIds.forEach((uid) => {
        livePages.push(
          new LiveObject<PageData>({
            id: crypto.randomUUID(),
            originalOwnerId: uid,
            currentOwnerId: uid,
            canvasJSON: "",
            snapshotsJSON: "[]",
          }),
        );
      });
      const duration = storage.get("roundDurationSec") ?? DEFAULT_ROUND_SECONDS;
      storage.set("round", 1);
      storage.set("timer", duration);
      storage.set("gameState", "DRAWING");
    },
    [allUserIds],
  );

  useEffect(() => {
    if (!isHost || gameState !== "DRAWING") return;
    if (tickingRef.current) return;
    tickingRef.current = true;

    const id = setInterval(() => tick(), 1000);
    return () => {
      clearInterval(id);
      tickingRef.current = false;
    };
  }, [isHost, gameState, tick]);

  useEffect(() => {
    if (!isHost) return;
    if (gameState === "DRAWING" && timer === 0) beginTransition();
  }, [isHost, gameState, timer, beginTransition]);

  useEffect(() => {
    if (!isHost || gameState !== "TRANSITION") return;

    const timeout = setTimeout(() => {
      if ((round ?? 0) >= allUserIds.length) {
        setReveal();
      } else {
        rotate();
      }
    }, TRANSITION_MS);

    return () => clearTimeout(timeout);
  }, [isHost, gameState, rotate, setReveal, round, allUserIds.length]);

  const myPage = useMemo(() => {
    if (!pages) return null;
    return pages.find((p) => p.currentOwnerId === selfUserId) ?? null;
  }, [pages, selfUserId]);

  const resetToLobby = useMutation(({ storage }) => {
    const duration = storage.get("roundDurationSec") ?? DEFAULT_ROUND_SECONDS;
    storage.set("gameState", "LOBBY");
    storage.set("timer", duration);
    storage.set("round", 0);
  }, []);

  const setRoundDuration = useMutation(({ storage }, seconds: number) => {
    const clamped = Math.max(
      MIN_ROUND_SECONDS,
      Math.min(MAX_ROUND_SECONDS, Math.floor(seconds || DEFAULT_ROUND_SECONDS)),
    );
    storage.set("roundDurationSec", clamped);
    if (storage.get("gameState") === "LOBBY") {
      storage.set("timer", clamped);
    }
  }, []);

  const userNames = useMemo(() => {
    const map: Record<string, string> = {};
    map[selfUserId] = selfUserName;
    others.forEach((o) => {
      if (o.presence.userId) {
        map[o.presence.userId] = o.presence.userName || "Anonymous";
      }
    });
    return map;
  }, [others, selfUserId, selfUserName]);

  return {
    loading,
    gameState,
    timer,
    roundDurationSec: roundDurationSec ?? DEFAULT_ROUND_SECONDS,
    round,
    pages: pages ?? [],
    isHost,
    hostId,
    allUserIds,
    myPage,
    userNames,
    startGame,
    setRoundDuration,
    backToLobby: resetToLobby,
  };
}
