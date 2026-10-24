// Paired emotes with another online player (slow dance and friends): the
// invite, answer and stop handshake over the room's game relay, and the pairUp
// store the UI reads. The asker leads and the one who accepts follows. Invites
// from muted players, or while already paired, are answered with an automatic
// pair-stop.

import type { CoupleRole } from "../../game/dance/couple.ts";
import {
  encodePair,
  parsePairMessage,
  type PairMessage,
  type TogetherId,
} from "../../game/dance/together.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Ask = { id: string; name: string; e: TogetherId };

/** An emote with another player: an invite either way, then the pose. */
export const pairUp = createStore({
  /** Someone asked you. */
  invite: null as Ask | null,
  /** You asked someone, and they haven't answered. */
  asked: null as Ask | null,
  /** Doing it now. `placed` is set once the follow has stepped into place. */
  pair: null as (Ask & { role: CoupleRole; placed: boolean }) | null,
  note: "",
});

const send = (to: string, m: PairMessage) =>
  onlineSession()?.sendGame(to, encodePair(m));

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Starts listening to the room's game relay; returns the unsubscribe. */
export function listenForPairs(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parsePairMessage(data);
      if (!m) return;
      const s = pairUp.get();
      if (m.k === "pair-invite") {
        // a muted player's invites never show; someone already with you says busy
        if (peerCard.get().mutes.includes(from) || s.pair) {
          send(from, { k: "pair-stop" });
          return;
        }
        pairUp.set({ invite: { id: from, name: nameOf(from), e: m.e } });
      } else if (m.k === "pair-accept" && s.asked?.id === from) {
        pairUp.set({
          asked: null,
          note: "",
          pair: { ...s.asked, role: "lead", placed: true },
        });
      } else if (m.k === "pair-stop") {
        if (s.asked?.id === from)
          pairUp.set({ asked: null, note: `${s.asked.name} said not now.` });
        if (s.invite?.id === from) pairUp.set({ invite: null });
        if (s.pair?.id === from) pairUp.set({ pair: null, note: "" });
      }
    }),
    session.on("leave", (id) => {
      const s = pairUp.get();
      if (s.invite?.id === id) pairUp.set({ invite: null });
      if (s.asked?.id === id) pairUp.set({ asked: null });
      if (s.pair?.id === id) pairUp.set({ pair: null });
    }),
  ];
  return () => offs.forEach((off) => off());
}

/**
 * Invites player `id` to emote `e`, ending any current pair or invite first.
 * Records the invite as `asked` only when the relay send succeeded (offline
 * sends do nothing).
 */
export function askTogether(id: string, name: string, e: TogetherId) {
  stopTogether();
  if (send(id, { k: "pair-invite", e }))
    pairUp.set({ asked: { id, name, e }, note: "" });
}

/**
 * Answers the pending invite: no sends pair-stop and clears it; yes sends pair-
 * accept and starts the pair as the follow, not yet placed. Does nothing
 * without an invite.
 */
export function answerTogether(yes: boolean) {
  const { invite } = pairUp.get();
  if (!invite) return;
  if (!yes) {
    send(invite.id, { k: "pair-stop" });
    pairUp.set({ invite: null });
    return;
  }
  send(invite.id, { k: "pair-accept", e: invite.e });
  pairUp.set({
    invite: null,
    note: "",
    pair: { ...invite, role: "follow", placed: false },
  });
}

/** Ends whatever's on: the emote, or your invite. */
export function stopTogether() {
  const { pair, asked } = pairUp.get();
  if (pair) send(pair.id, { k: "pair-stop" });
  if (asked) send(asked.id, { k: "pair-stop" });
  pairUp.set({ pair: null, asked: null, note: "" });
}
