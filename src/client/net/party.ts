// Parties over the room's game relay (rules and codec in src/game/party.ts):
// the store the UI reads, invites and answers, and the trip. When the leader
// goes through a door, useOnlineRoom calls `beforeTravel` while the session
// is still in the old copy: the leader picks the next copy and tells every
// member; a member who heads off alone leaves the party. Members follow with
// the same `joinCopy` a "Go to friend" uses.

import { mayEnter } from "../../game/age.ts";
import {
  encodeParty,
  MAX_PARTY,
  parsePartyMessage,
  partyCanGo,
  type PartyMessage,
} from "../../game/party.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import { ADULT_OK } from "../adult.ts";
import { createStore } from "../rooms/shared/store.ts";
import { friends, friendship, refreshFriends } from "./friends.ts";
import { joinCopy, onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Who = { id: string; name: string };

export const party = createStore({
  /** The leader's id (yours when you lead); null outside a party. */
  leader: null as string | null,
  /** Everyone else in it: the members when you lead, the leader when not. */
  members: [] as Who[],
  /** A friend asked you to join. */
  invite: null as Who | null,
  /** Friends you asked, waiting on their answer. */
  asked: [] as Who[],
  /** Where the leader just went, until you've followed. */
  going: null as { room: RoomId; copy: number } | null,
  note: "",
});

const send = (to: string, m: PartyMessage) =>
  onlineSession()?.sendGame(to, encodeParty(m)) ?? false;

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

const myId = () => onlineSession()?.identity()?.id ?? null;

/** Whether you lead a party with at least one member. */
const leading = () => {
  const s = party.get();
  return s.leader !== null && s.leader === myId();
};

const following = () => {
  const s = party.get();
  return s.leader !== null && s.leader !== myId();
};

const disband = (note: string) =>
  party.set({ leader: null, members: [], going: null, note });

async function onInvite(from: string) {
  const s = party.get();
  // a muted player's invites never show; someone in a party says no
  if (peerCard.get().mutes.includes(from) || s.leader !== null) {
    send(from, { k: "party-leave" });
    return;
  }
  // parties are for friends: check against a fresh list
  await refreshFriends();
  if (friendship(friends.get().list, from) !== "friend") {
    send(from, { k: "party-leave" });
    return;
  }
  party.set({ invite: { id: from, name: nameOf(from) } });
}

function onJoin(from: string) {
  const s = party.get();
  const asked = s.asked.find((a) => a.id === from);
  const me = myId();
  if (!asked || !me || (s.leader !== null && s.leader !== me)) {
    send(from, { k: "party-leave" });
    return;
  }
  if (s.members.length + 1 >= MAX_PARTY) {
    send(from, { k: "party-leave" });
    party.set({ asked: s.asked.filter((a) => a.id !== from) });
    return;
  }
  party.set({
    leader: me,
    members: [...s.members, asked],
    asked: s.asked.filter((a) => a.id !== from),
    note: `${asked.name} joined your party.`,
  });
}

function onLeave(from: string) {
  const s = party.get();
  if (s.invite?.id === from) party.set({ invite: null });
  const asked = s.asked.find((a) => a.id === from);
  if (asked)
    party.set({
      asked: s.asked.filter((a) => a.id !== from),
      note: `${asked.name} said not now.`,
    });
  if (leading() && s.members.some((m) => m.id === from)) {
    const left = s.members.find((m) => m.id === from)?.name ?? "Someone";
    const members = s.members.filter((m) => m.id !== from);
    party.set({
      members,
      leader: members.length ? s.leader : null,
      note: `${left} left the party.`,
    });
  } else if (following() && s.leader === from) disband("The party broke up.");
}

function onGo(
  from: string,
  room: RoomId,
  copy: number,
  go: (room: RoomId) => void,
) {
  const s = party.get();
  if (!following() || s.leader !== from) return;
  if (!mayEnter(room, ADULT_OK)) {
    send(from, { k: "party-leave" });
    disband(`You couldn't follow into ${ROOMS[room].name}.`);
    return;
  }
  party.set({ going: { room, copy } });
  const session = onlineSession();
  // the same room, another copy: no trip, just a switch
  if (session?.room()?.roomId === room) {
    party.set({ going: null });
    void session.switchCopy(copy);
    return;
  }
  joinCopy.room = room;
  joinCopy.copy = copy;
  go(room);
}

/**
 * Starts listening to the room's game relay for party messages; `go` takes
 * the player to a room (App's travel). Returns the unsubscribe.
 */
export function listenForParty(go: (room: RoomId) => void): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parsePartyMessage(data);
      if (!m) return;
      if (m.k === "party-invite") void onInvite(from);
      else if (m.k === "party-join") onJoin(from);
      else if (m.k === "party-leave") onLeave(from);
      else onGo(from, m.room, m.copy, go);
    }),
    // someone who leaves the copy is gone from the party, unless it's the
    // leader on the way to where you're following
    session.on("leave", (id) => {
      const s = party.get();
      if (following() && s.leader === id && s.going) return;
      onLeave(id);
    }),
  ];
  return () => offs.forEach((off) => off());
}

/** Asks a friend in this room copy to join your party. */
export function inviteToParty(id: string, name: string): void {
  const s = party.get();
  if (following()) {
    party.set({ note: "Only the party's leader can invite." });
    return;
  }
  if (s.members.length + 1 >= MAX_PARTY) {
    party.set({ note: "Your party is full." });
    return;
  }
  if (s.asked.some((a) => a.id === id) || s.members.some((m) => m.id === id))
    return;
  if (send(id, { k: "party-invite" }))
    party.set({ asked: [...s.asked, { id, name }], note: "" });
}

/** Answers the invite on screen. */
export function answerParty(yes: boolean): void {
  const invite = party.get().invite;
  if (!invite) return;
  if (!yes) {
    send(invite.id, { k: "party-leave" });
    party.set({ invite: null });
    return;
  }
  if (!send(invite.id, { k: "party-join" })) return;
  party.set({
    invite: null,
    leader: invite.id,
    members: [invite],
    note: `You're in ${invite.name}'s party.`,
  });
}

/** Leaves the party (a leader leaving ends it for everyone). */
export function leaveParty(): void {
  for (const m of party.get().members) send(m.id, { k: "party-leave" });
  disband("You left the party.");
}

/**
 * Called by useOnlineRoom before joining `room`, while still in the old
 * copy. Returns the copy to join, if the party decided it.
 */
export async function beforeTravel(room: RoomId): Promise<number | undefined> {
  const s = party.get();
  if (following()) {
    if (s.going?.room === room) {
      party.set({ going: null });
      return s.going.copy;
    }
    // heading off alone: leave the party on the way out
    leaveParty();
    return undefined;
  }
  if (!leading() || !s.members.length) return undefined;
  if (!partyCanGo(room)) {
    party.set({ note: "Your party waits outside." });
    return undefined;
  }
  const copy = await onlineSession()?.pickCopy(room);
  if (!copy) return undefined;
  for (const m of s.members) send(m.id, { k: "party-go", room, copy });
  return copy;
}
