// Parties: a leader and friends who travel together. The leader invites a
// friend in the same room copy over the `game` relay; the friend joins. When
// the leader heads through a door, they pick the next room's copy first and
// send `party-go` to every member while still in the old copy, so everyone
// lands in the same copy. Either side can `party-leave`. Pure: the codec and
// its rules; src/client/net/party.ts does the sending.

import { MAX_GAME_DATA } from "../net/networkProtocol.ts";
import { isRoomId, SOLO_ROOMS, type RoomId } from "./rooms.ts";

/** The leader and up to seven friends. */
export const MAX_PARTY = 8;

/** Room copies are numbered 1 to 99 (OnlineSession's MAX_COPY). */
const MAX_COPY = 99;

export type PartyMessage =
  | { k: "party-invite" }
  | { k: "party-join" }
  | { k: "party-leave" }
  /** The leader is going to `room`, copy `copy`: follow. */
  | { k: "party-go"; room: RoomId; copy: number };

export const encodeParty = (m: PartyMessage) => JSON.stringify(m);

/** Whether a party may go to `room`: anywhere but someone's own flat or cell. */
export const partyCanGo = (room: RoomId) => !SOLO_ROOMS.has(room);

/** A relayed message, if it's a party message and well formed. */
export function parsePartyMessage(data: string): PartyMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  if (k === "party-invite" || k === "party-join" || k === "party-leave")
    return { k };
  if (k !== "party-go") return null;
  const room: unknown = Reflect.get(value, "room");
  const copy: unknown = Reflect.get(value, "copy");
  if (!isRoomId(room) || !partyCanGo(room)) return null;
  if (!Number.isInteger(copy) || typeof copy !== "number") return null;
  return copy >= 1 && copy <= MAX_COPY ? { k, room, copy } : null;
}
