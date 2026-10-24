// Crazy Eights between two players over the room's game relay: invites,
// answers, numbered moves and quits, kept in the duel store. Both sides deal
// from the same seed and apply each other's moves, so only legal moves are sent
// and a move is applied only if its number is next.

import { deal, type Table, type Who } from "../../game/cards/crazyEights.ts";
import {
  applyMove,
  encodeDuel,
  otherSeat,
  parseDuel,
  type DuelMessage,
} from "../../game/cards/duel.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Who2 = { id: string; name: string };

/** Crazy Eights with another player: an invite either way, then the game. */
export const duel = createStore({
  /** Someone asked you to play. */
  invite: null as (Who2 & { seed: number }) | null,
  /** You asked someone, and they haven't answered. */
  asked: null as (Who2 & { seed: number }) | null,
  game: null as (Who2 & { seat: Who; table: Table; moves: number }) | null,
  note: "",
});

const send = (to: string, m: DuelMessage) =>
  onlineSession()?.sendGame(to, encodeDuel(m));

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Starts listening to the room's game relay; returns the unsubscribe. */
export function listenForDuels(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parseDuel(data);
      if (!m) return;
      const s = duel.get();
      const name = nameOf(from);
      if (m.k === "invite") {
        // a muted player's invites never show; a game already on says busy
        if (peerCard.get().mutes.includes(from) || s.game) {
          send(from, { k: "decline" });
          return;
        }
        duel.set({ invite: { id: from, name, seed: m.seed } });
      } else if (m.k === "accept" && s.asked?.id === from) {
        duel.set({
          asked: null,
          note: "",
          game: {
            id: from,
            name,
            seat: "you",
            table: deal(s.asked.seed),
            moves: 0,
          },
        });
      } else if (m.k === "decline" && s.asked?.id === from) {
        duel.set({ asked: null, note: `${name} can't play right now.` });
      } else if (m.k === "quit" && s.game?.id === from) {
        duel.set({ game: null, note: `${name} left the table.` });
      } else if (m.k === "quit" && s.invite?.id === from) {
        // they took the invite back
        duel.set({ invite: null });
      } else if ((m.k === "play" || m.k === "draw") && s.game?.id === from) {
        // moves come numbered: only the next one applies
        if (m.n !== s.game.moves) return;
        const table = applyMove(s.game.table, otherSeat(s.game.seat), m);
        if (table !== s.game.table)
          duel.set({ game: { ...s.game, table, moves: s.game.moves + 1 } });
      }
    }),
    session.on("leave", (id) => {
      const s = duel.get();
      if (s.game?.id === id)
        duel.set({ game: null, note: `${s.game.name} left the room.` });
      if (s.invite?.id === id) duel.set({ invite: null });
      if (s.asked?.id === id) duel.set({ asked: null });
    }),
  ];
  return () => offs.forEach((off) => off());
}

/**
 * Invites a player to Crazy Eights with a fresh seed; marked asked only if the
 * message was sent. The inviter sits as `you`.
 */
export function askToPlay(id: string, name: string) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (send(id, { k: "invite", seed }))
    duel.set({ asked: { id, name, seed }, note: "" });
}

/**
 * Answers the open invite: yes deals the table (you sit as `guard`), no
 * declines. Does nothing without an invite.
 */
export function answer(yes: boolean) {
  const { invite } = duel.get();
  if (!invite) return;
  if (!yes) {
    send(invite.id, { k: "decline" });
    duel.set({ invite: null });
    return;
  }
  send(invite.id, { k: "accept", seed: invite.seed });
  duel.set({
    invite: null,
    note: "",
    game: {
      id: invite.id,
      name: invite.name,
      seat: "guard",
      table: deal(invite.seed),
      moves: 0,
    },
  });
}

/** Your move: play card `i` of your hand (naming `suit` for an eight), or
 * draw. Sent only if it's legal and your turn. */
export function move(m: { k: "play"; i: number; s?: number } | { k: "draw" }) {
  const { game } = duel.get();
  if (!game) return;
  const numbered: DuelMessage = { ...m, n: game.moves };
  const table = applyMove(game.table, game.seat, numbered);
  if (table === game.table) return;
  send(game.id, numbered);
  duel.set({ game: { ...game, table, moves: game.moves + 1 } });
}

/**
 * Quits the game or takes back your invite, telling the other player, and
 * clears the store.
 */
export function leaveTable() {
  const { game, asked } = duel.get();
  if (game) send(game.id, { k: "quit" });
  duel.set({ game: null, asked: null, note: "" });
  if (asked && !game) send(asked.id, { k: "quit" });
}
