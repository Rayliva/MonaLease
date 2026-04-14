import { createRoomContext } from "@liveblocks/react";
import { liveblocksClient } from "./client";
import type { Presence, Storage } from "../types/game";

export const {
  RoomProvider,
  useOthers,
  useStorage,
  useMutation,
  useSelf,
  useUpdateMyPresence,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage>(liveblocksClient);
