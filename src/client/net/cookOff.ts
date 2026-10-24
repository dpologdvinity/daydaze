// The two-player cook-off over the room's game relay: invites, acceptance with
// a shared seed, and score exchange, kept in the cookOff store. A muted
// player's invite, or one during a match, is turned down automatically.

import { encodeCook, parseCook, type CookMessage } from "../../game/cookOff.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Ask = { id: string; name: string; seed: number };

/** A cook-off with another player: an invite either way, then a match both
 * cook at Kamayan Hall with the same seed, swapping final scores. */
export const cookOff = createStore({
  invite: null as Ask | null,
  asked: null as Ask | null,
  /** `theirs` is their final score, once it comes in. */
  match: null as (Ask & { theirs: number | null }) | null,
  note: "",
});

const send = (to: string, m: CookMessage) =>
  onlineSession()?.sendGame(to, encodeCook(m));

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Starts listening to the room's game relay; returns the unsubscribe. */
export function listenForCookOffs(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parseCook(data);
      if (!m) return;
      const s = cookOff.get();
      if (m.k === "cook-invite") {
        if (peerCard.get().mutes.includes(from) || s.match) {
          send(from, { k: "cook-stop" });
          return;
        }
        cookOff.set({ invite: { id: from, name: nameOf(from), seed: m.seed } });
      } else if (
        m.k === "cook-accept" &&
        s.asked?.id === from &&
        s.asked.seed === m.seed
      ) {
        cookOff.set({
          asked: null,
          note: `${s.asked.name} is in. Head to Kamayan Hall's kitchen.`,
          match: { ...s.asked, theirs: null },
        });
      } else if (m.k === "cook-score" && s.match?.id === from) {
        cookOff.set({ match: { ...s.match, theirs: m.score } });
      } else if (m.k === "cook-stop") {
        if (s.asked?.id === from)
          cookOff.set({ asked: null, note: `${s.asked.name} said not now.` });
        if (s.invite?.id === from) cookOff.set({ invite: null });
        if (s.match?.id === from)
          cookOff.set({
            match: null,
            note: `${s.match.name} left the cook-off.`,
          });
      }
    }),
    session.on("leave", (id) => {
      const s = cookOff.get();
      if (s.invite?.id === id) cookOff.set({ invite: null });
      if (s.asked?.id === id) cookOff.set({ asked: null });
      if (s.match?.id === id && s.match.theirs === null)
        cookOff.set({ match: null, note: `${s.match.name} left the room.` });
    }),
  ];
  return () => offs.forEach((off) => off());
}

/**
 * Invites a player to a cook-off with a fresh seed; marked asked only if the
 * message was sent.
 */
export function askToCook(id: string, name: string) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (send(id, { k: "cook-invite", seed }))
    cookOff.set({ asked: { id, name, seed }, note: "" });
}

/**
 * Answers the open cook-off invite: yes starts the match, no turns it down.
 * Does nothing without an invite.
 */
export function answerCook(yes: boolean) {
  const { invite } = cookOff.get();
  if (!invite) return;
  if (!yes) {
    send(invite.id, { k: "cook-stop" });
    cookOff.set({ invite: null });
    return;
  }
  send(invite.id, { k: "cook-accept", seed: invite.seed });
  cookOff.set({
    invite: null,
    note: "You're in. Head to Kamayan Hall's kitchen.",
    match: { ...invite, theirs: null },
  });
}

/** Sends your final cook-off score to your opponent, if a match is on. */
export function sendScore(score: number) {
  const { match } = cookOff.get();
  if (match) send(match.id, { k: "cook-score", score });
}

/**
 * Leaves the match or takes back your invite, telling the other player, and
 * clears the store.
 */
export function endCookOff() {
  const { match, asked } = cookOff.get();
  if (match) send(match.id, { k: "cook-stop" });
  if (asked) send(asked.id, { k: "cook-stop" });
  cookOff.set({ match: null, asked: null, note: "" });
}
