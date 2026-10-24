import { useEffect, useRef } from "react";
import { refreshAccount } from "./account.ts";
import type { Look } from "../../game/look.ts";
import { SOLO_ROOMS, type RoomId } from "../../game/rooms.ts";
import { createApi } from "../../net/client/api.ts";
import { OnlineSession } from "../../net/client/OnlineSession.ts";
import { WebSocketTransport } from "../../net/client/WebSocketTransport.ts";

/**
 * Online play, for now behind `?online=1`: the game talks to the Worker's
 * `/api` and `/ws` on its own origin (in development, `npm run dev:server`
 * on 8787 behind Vite's proxy). Without the flag, or when the server can't
 * be reached, everything stays single-player.
 * shortcut: opt-in by URL flag; switch it on by default once the Worker is
 * deployed beside the client.
 */
export const ONLINE =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("online") === "1";

let shared: OnlineSession | null = null;
// one start per page, however many times effects run (StrictMode runs twice)
let started: Promise<unknown> | null = null;

/** The one online session, made on first use; null when offline. */
export function onlineSession(): OnlineSession | null {
  if (!ONLINE) return null;
  shared ??= new OnlineSession({
    api: createApi({ fetch: (url, init) => fetch(url, init) }),
    wsBaseUrl: location.origin.replace(/^http/, "ws"),
    openTransport: (url) => new WebSocketTransport({ url, WebSocket }),
  });
  return shared;
}

/** Going to a friend: join their copy of that room when we get there. */
export const joinCopy: { room: RoomId | null; copy: number } = {
  room: null,
  copy: 1,
};

/** Keeps the session in the room the player is in, wearing their look. */
export function useOnlineRoom(room: RoomId, look: Look) {
  const session = onlineSession();
  // the look as of now, for joining; a look change alone never rejoins
  const latestLook = useRef(look);
  useEffect(() => {
    latestLook.current = look;
  }, [look]);
  // join (and rejoin on each room change) once the session has an identity
  useEffect(() => {
    if (!session) return;
    let live = true;
    void (async () => {
      started ??= session.start();
      await started;
      refreshAccount();
      const copy = joinCopy.room === room ? joinCopy.copy : undefined;
      joinCopy.room = null;
      if (!live || !session.identity()) return;
      // your own flat or cell: nobody else's copy to join
      if (SOLO_ROOMS.has(room)) session.leaveRoom();
      else await session.joinRoom(room, latestLook.current, copy);
    })();
    return () => {
      live = false;
    };
  }, [session, room]);
  useEffect(() => {
    session?.setLook(look);
  }, [session, look]);
}
