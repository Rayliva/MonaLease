import { createRoomContext } from "@liveblocks/react";
import type { BaseUserMeta } from "@liveblocks/client";
import { liveblocksClient } from "./client";
import type { Presence, RoomEvent, Storage } from "../types/game";

export const {
  RoomProvider,
  useOthers,
  useStorage,
  useMutation,
  useSelf,
  useUpdateMyPresence,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage, BaseUserMeta, RoomEvent>(
  liveblocksClient,
);
