// Karaoke duets over the room's game relay (rules and codec in
// src/game/karaokeDuet.ts): ask another singer from their card, they say
// yes, and both sing the asker's chart, trading lines; each part's score
// goes over the relay when the song ends.

import {
  encodeDuet,
  parseDuetMessage,
  type DuetMessage,
} from "../../game/karaokeDuet.ts";
import {
  duetHooks,
  karaoke,
  partnerScored,
  startDuet,
} from "../rooms/karaoke/session.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Who = { id: string; name: string };

export const duetAsk = createStore({
  /** Someone asked you to sing with them. */
  ask: null as (Who & { seed: number }) | null,
  /** You asked; waiting for an answer, with the chart's seed. */
  asked: null as (Who & { seed: number }) | null,
  note: "",
});

const send = (to: string, m: DuetMessage) =>
  onlineSession()?.sendGame(to, encodeDuet(m)) ?? false;

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Starts listening for duets; returns the unsubscribe. */
export function listenForDuets(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  // your part goes to your partner when the song ends
  duetHooks.done = (score) => {
    const partner = karaoke.get().duet?.partner;
    if (partner) send(partner.id, { k: "duet-done", score });
  };
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parseDuetMessage(data);
      if (!m) return;
      const s = duetAsk.get();
      if (m.k === "duet-ask") {
        const busy =
          karaoke.get().phase !== "off" && karaoke.get().phase !== "over";
        if (peerCard.get().mutes.includes(from) || busy) {
          send(from, { k: "duet-no" });
          return;
        }
        duetAsk.set({ ask: { id: from, name: nameOf(from), seed: m.seed } });
      } else if (m.k === "duet-yes" && s.asked?.id === from) {
        duetAsk.set({ asked: null, note: "" });
        startDuet("lead", { id: from, name: s.asked.name }, s.asked.seed);
      } else if (m.k === "duet-no") {
        if (s.asked?.id === from)
          duetAsk.set({ asked: null, note: `${s.asked.name} said not now.` });
        if (s.ask?.id === from) duetAsk.set({ ask: null });
      } else if (m.k === "duet-done" && karaoke.get().duet?.partner.id === from)
        partnerScored(m.score);
    }),
    session.on("leave", (id) => {
      const s = duetAsk.get();
      if (s.ask?.id === id) duetAsk.set({ ask: null });
      if (s.asked?.id === id) duetAsk.set({ asked: null });
    }),
  ];
  return () => {
    duetHooks.done = null;
    offs.forEach((off) => off());
  };
}

/** Asks another singer in the Karaoke Loft to sing a duet. */
export function askToDuet(id: string, name: string): void {
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (send(id, { k: "duet-ask", seed }))
    duetAsk.set({ asked: { id, name, seed }, note: "" });
}

/** Answers the ask on screen: yes starts the song, on their chart. */
export function answerDuet(yes: boolean): void {
  const ask = duetAsk.get().ask;
  if (!ask) return;
  duetAsk.set({ ask: null });
  if (!yes) {
    send(ask.id, { k: "duet-no" });
    return;
  }
  if (send(ask.id, { k: "duet-yes" }))
    startDuet("follow", { id: ask.id, name: ask.name }, ask.seed);
}
