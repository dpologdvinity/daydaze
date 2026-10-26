import { useEffect, useRef } from "react";
import { refreshAccount } from "./account.ts";
import type { Look } from "../../game/look.ts";
import { SOLO_ROOMS, type RoomId } from "../../game/rooms.ts";
import { createApi } from "../../net/client/api.ts";
import { OnlineSession } from "../../net/client/OnlineSession.ts";
import { WebSocketTransport } from "../../net/client/WebSocketTransport.ts";
import { readFlags } from "../flags.ts";
import { beforeTravel } from "./party.ts";
import { enterApartment, homeVisit } from "./home.ts";
import type { HomeSave } from "../../game/home/home.ts";

/**
 * Online play, for now behind `?online=1`: the game talks to the Worker's
 * `/api` and `/ws` on its own origin (in development, `npm run dev:server`
 * on 8787 behind Vite's proxy). Without the flag, or when the server can't
 * be reached, everything stays single-player.
 * shortcut: opt-in by URL flag; switch it on by default once the Worker is
 * deployed beside the client.
 */
/** An invite link (`?join=room.copy`), which also switches online play on. */
const invite =
  typeof location === "undefined" ? null : readFlags(location.search).join;

export const ONLINE =
  invite !== null ||
  (typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("online") === "1");

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

/** Going to a friend: join their copy of that room when we get there. An
 * invite link sets it before the first join. */
export const joinCopy: { room: RoomId | null; copy: number } = {
  room: invite?.room ?? null,
  copy: invite?.copy ?? 1,
};

/** Keeps the session in the room the player is in, wearing their look; at
 * home, it also keeps the apartment's layout (`home`) current online. */
export function useOnlineRoom(room: RoomId, look: Look, home: HomeSave) {
  const session = onlineSession();
  // the look as of now, for joining; a look change alone never rejoins
  const latestLook = useRef(look);
  const latestHome = useRef(home);
  // a new visit (or the end of one) while in the apartment re-enters it
  const visitingId = homeVisit.use().owner?.id ?? null;
  useEffect(() => {
    latestLook.current = look;
    latestHome.current = home;
  }, [look, home]);
  // join (and rejoin on each room change) once the session has an identity
  useEffect(() => {
    if (!session) return;
    let live = true;
    void (async () => {
      started ??= session.start();
      await started;
      refreshAccount();
      // only the live run takes the friend's copy: StrictMode's first,
      // discarded run must not use it up
      if (!live || !session.identity()) return;
      const copy = joinCopy.room === room ? joinCopy.copy : undefined;
      joinCopy.room = null;
      // still in the old copy: a party leader tells the members where to
      // follow, and a member heading off alone leaves the party
      const partyCopy = await beforeTravel(room);
      if (!live) return;
      // an apartment is its owner's own copy: yours, or a friend's you visit
      if (room === "apartment")
        await enterApartment(latestHome.current, latestLook.current);
      // the cells: nobody else's copy to join
      else if (SOLO_ROOMS.has(room)) session.leaveRoom();
      else await session.joinRoom(room, latestLook.current, partyCopy ?? copy);
    })();
    return () => {
      live = false;
    };
  }, [session, room, visitingId]);
  useEffect(() => {
    session?.setLook(look);
  }, [session, look]);
  // at your own place, every change to the layout (the door, a new chair)
  // goes out to your apartment copy
  useEffect(() => {
    if (room === "apartment" && !homeVisit.get().owner) session?.sendHome(home);
  }, [session, room, home]);
}
