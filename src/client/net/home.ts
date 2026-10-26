// Apartment visits online. Your own apartment is your own room copy: going
// home joins it and sends your layout (door and furniture), and again on
// every change, so friends who visit see your place as it is. Visiting a
// friend joins theirs, which the server allows only while they're home with
// the door unlocked; locked out, or sent home when they lock up or leave,
// you're taken back to the city with a note. The server side is RoomCore's
// home mode (server/src/roomCore.ts).

import { validateHome, type HomeSave } from "../../game/home/home.ts";
import type { Look } from "../../game/look.ts";
import { CLOSE_CODES } from "../../net/networkProtocol.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";

type Who = { id: string; name: string };

export const homeVisit = createStore({
  /** Whose place you're going to or at; null for your own. */
  owner: null as Who | null,
  /** Their layout, once it arrives. */
  home: null as HomeSave | null,
  /** Set when you must leave (turned away, locked out): App takes you back. */
  bounced: false,
  note: "",
});

/** Heads to a friend's place; App travels to the apartment on this. */
export function visitFriend(friend: Who): void {
  homeVisit.set({ owner: friend, home: null, bounced: false, note: "" });
}

/** Back from a visit (any room change out of the apartment). */
export function endVisit(): void {
  if (homeVisit.get().owner)
    homeVisit.set({ owner: null, home: null, bounced: false });
}

/** Turned away: the note says why, and App takes you back out. */
function bounce(note: string) {
  homeVisit.set({ owner: null, home: null, bounced: true, note });
}

/**
 * Called by useOnlineRoom in the apartment: your own place (sending your
 * layout) or the friend's you're visiting.
 */
export async function enterApartment(
  myHome: HomeSave,
  look: Look,
): Promise<void> {
  const session = onlineSession();
  const self = session?.identity();
  if (!session || !self) return;
  const owner = homeVisit.get().owner;
  if (!owner) {
    const joined = await session.enterHome(self.id, look);
    if (joined.ok) session.sendHome(myHome);
    return;
  }
  const joined = await session.enterHome(owner.id, look);
  if (!joined.ok)
    bounce(
      joined.reason === "locked"
        ? `${owner.name}'s door is locked, or they're not home.`
        : `Couldn't get to ${owner.name}'s place. Try again in a moment.`,
    );
}

/** Starts listening for a visited home's layout and for being sent out;
 * returns the unsubscribe. */
export function listenForHomes(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("home", (home) => {
      const owner = homeVisit.get().owner;
      if (owner) homeVisit.set({ home: validateHome(home) });
    }),
    session.on("closeCode", (code) => {
      const owner = homeVisit.get().owner;
      if (owner && code === CLOSE_CODES.closed)
        bounce(`${owner.name} locked up. Time to head out.`);
    }),
  ];
  return () => offs.forEach((off) => off());
}
