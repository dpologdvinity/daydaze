// The friends list as GET /api/friends sends it: mutual friends with the room
// copy they're in (null when offline), requests waiting on you, and requests
// you've sent. Shared by the Worker, which builds it, and the client, which
// validates it.
import { isRoomId, type RoomId } from "../game/rooms.ts";
import { isValidDisplayName } from "../game/save.ts";
import { isNetworkId } from "./networkProtocol.ts";

export type FriendRoom = { roomId: RoomId; copy: number };
export type Friend = { id: string; name: string; room: FriendRoom | null };
export type Friends = {
  friends: Friend[];
  incoming: { id: string; name: string }[];
  sent: { id: string; name: string }[];
};

/** At most this many of each list go out, so one reply stays small. */
export const MAX_FRIENDS = 200;

/**
 * Sorts requests into mutual friends, incoming and sent. Players without a
 * name (a guest whose session ended) are gone and drop out.
 */
export function friendLists(
  sentTo: readonly string[],
  receivedFrom: readonly string[],
  names: ReadonlyMap<string, string>,
  rooms: ReadonlyMap<string, FriendRoom>,
): Friends {
  const sent = new Set(sentTo);
  const received = new Set(receivedFrom);
  const named = (id: string) => {
    const name = names.get(id);
    return name ? [{ id, name }] : [];
  };
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  return {
    friends: [...sent]
      .filter((id) => received.has(id))
      .flatMap(named)
      .map((f) => ({ ...f, room: rooms.get(f.id) ?? null }))
      .sort(byName)
      .slice(0, MAX_FRIENDS),
    incoming: [...received]
      .filter((id) => !sent.has(id))
      .flatMap(named)
      .sort(byName)
      .slice(0, MAX_FRIENDS),
    sent: [...sent]
      .filter((id) => !received.has(id))
      .flatMap(named)
      .sort(byName)
      .slice(0, MAX_FRIENDS),
  };
}

function fields(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}

function person(value: unknown): { id: string; name: string } | null {
  const f = fields(value);
  const id = f.get("id");
  const name = f.get("name");
  return isNetworkId(id) && isValidDisplayName(name) ? { id, name } : null;
}

function room(value: unknown): FriendRoom | null | undefined {
  if (value === null) return null;
  const f = fields(value);
  const roomId = f.get("roomId");
  const copy = f.get("copy");
  return isRoomId(roomId) &&
    Number.isInteger(copy) &&
    Number(copy) >= 1 &&
    Number(copy) <= 99
    ? { roomId, copy: Number(copy) }
    : undefined;
}

function people(value: unknown): { id: string; name: string }[] | null {
  if (!Array.isArray(value) || value.length > MAX_FRIENDS) return null;
  const out = value.map(person);
  return out.every((p) => p !== null)
    ? out.flatMap((p) => (p ? [p] : []))
    : null;
}

/** A friends reply off the wire, or null if any part of it is off. */
export function parseFriends(value: unknown): Friends | null {
  const f = fields(value);
  const list = f.get("friends");
  const incoming = people(f.get("incoming"));
  const sent = people(f.get("sent"));
  if (!Array.isArray(list) || list.length > MAX_FRIENDS || !incoming || !sent)
    return null;
  const friends: Friend[] = [];
  for (const entry of list) {
    const p = person(entry);
    const at = room(fields(entry).get("room"));
    if (!p || at === undefined) return null;
    friends.push({ ...p, room: at });
  }
  return { friends, incoming, sent };
}
