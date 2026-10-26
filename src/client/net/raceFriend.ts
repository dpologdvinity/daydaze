// Racing a friend at the Speedway over the room's game relay (rules, codec
// and the shared start in src/game/speedway/friendRace.ts): ask from their
// card, they say yes, and the asker sends `race-go` with a start a few
// seconds ahead; both drive the same track and see each other's kart. Each
// sends their total time on finishing; the store shows who won.

import {
  encodeRace,
  LEAD_MS,
  parseRaceMessage,
  verdict,
  type FriendTrack,
  type RaceMessage,
} from "../../game/speedway/friendRace.ts";
import { createStore } from "../rooms/shared/store.ts";
import { driving } from "../world/driving.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Who = { id: string; name: string };

export const raceFriend = createStore({
  /** A friend asked you to race. */
  ask: null as (Who & { track: FriendTrack }) | null,
  /** You asked a friend, waiting on their answer. */
  asked: null as Who | null,
  /** Racing them now (or just did). */
  rival: null as Who | null,
  /** Total race times, once each of you finishes. */
  mine: null as number | null,
  theirs: null as number | null,
  note: "",
});

/** The track you asked to race on, until they answer. */
let asking: FriendTrack | null = null;
/** Who you said yes to, until their `race-go` arrives. */
let accepted: string | null = null;

const send = (to: string, m: RaceMessage) =>
  onlineSession()?.sendGame(to, encodeRace(m)) ?? false;

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Puts both of you on the grid: the Speedway starts it on its next frame. */
function begin(rival: Who, track: FriendTrack, startAt: number) {
  driving.friendRace = { track, startAt };
  driving.request = "race-friend";
  raceFriend.set({
    ask: null,
    asked: null,
    rival,
    mine: null,
    theirs: null,
    note: "",
  });
}

/** Starts listening to the room's game relay for races; returns the
 * unsubscribe. */
export function listenForRaces(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parseRaceMessage(data);
      if (!m) return;
      const s = raceFriend.get();
      if (m.k === "race-ask") {
        // a muted player's asks never show; mid-race, say no
        if (peerCard.get().mutes.includes(from) || driving.session) {
          send(from, { k: "race-no" });
          return;
        }
        raceFriend.set({
          ask: { id: from, name: nameOf(from), track: m.track },
        });
      } else if (m.k === "race-yes" && s.asked?.id === from) {
        // you asked: you set the start, a few seconds out, and send it
        const track = asking ?? "neon-oval";
        const startAt = Date.now() + LEAD_MS;
        if (send(from, { k: "race-go", track, startAt }))
          begin(s.asked, track, startAt);
      } else if (m.k === "race-go" && s.rival === null && accepted === from) {
        accepted = null;
        begin({ id: from, name: nameOf(from) }, m.track, m.startAt);
      } else if (m.k === "race-no") {
        if (s.asked?.id === from)
          raceFriend.set({
            asked: null,
            note: `${s.asked.name} said not now.`,
          });
        if (s.ask?.id === from) raceFriend.set({ ask: null });
      } else if (m.k === "race-done" && s.rival?.id === from)
        raceFriend.set({ theirs: m.ms });
    }),
    session.on("leave", (id) => {
      const s = raceFriend.get();
      if (s.ask?.id === id) raceFriend.set({ ask: null });
      if (s.asked?.id === id) raceFriend.set({ asked: null });
    }),
  ];
  return () => offs.forEach((off) => off());
}

/** Asks a friend in this room copy to race on `track`. */
export function askToRace(id: string, name: string, track: FriendTrack): void {
  if (driving.session) {
    raceFriend.set({ note: "Finish this drive first." });
    return;
  }
  if (send(id, { k: "race-ask", track })) {
    asking = track;
    raceFriend.set({ asked: { id, name }, note: "" });
  }
}

/** Answers the ask on screen. */
export function answerRace(yes: boolean): void {
  const ask = raceFriend.get().ask;
  if (!ask) return;
  raceFriend.set({ ask: null });
  if (!yes) {
    send(ask.id, { k: "race-no" });
    return;
  }
  if (send(ask.id, { k: "race-yes" })) {
    accepted = ask.id;
    raceFriend.set({ note: `Waiting for ${ask.name} to start the race…` });
  }
}

/** Called by the Speedway when you cross the line in a friend race. */
export function finishedFriendRace(ms: number): void {
  const s = raceFriend.get();
  driving.friendRace = null;
  raceFriend.set({ mine: ms });
  if (s.rival) send(s.rival.id, { k: "race-done", ms });
}

/** The result line once both of you have finished, else null. */
export function raceResult(
  s: ReturnType<typeof raceFriend.get>,
): string | null {
  if (s.mine === null || s.theirs === null || !s.rival) return null;
  const gap = (Math.abs(s.mine - s.theirs) / 1000).toFixed(2);
  const v = verdict(s.mine, s.theirs);
  return v === "won"
    ? `You beat ${s.rival.name} by ${gap} s!`
    : v === "lost"
      ? `${s.rival.name} won by ${gap} s.`
      : `A dead heat with ${s.rival.name}!`;
}
