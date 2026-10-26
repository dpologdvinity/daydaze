// Validates every request body, socket attachment and query parameter the
// Worker reads, returning typed values or null. Anything from the network
// passes through here before use.

import { validateLook, DEFAULT_LOOK, type Look } from "../../src/game/look.ts";
import { isRoomId, type RoomId } from "../../src/game/rooms.ts";
import {
  isValidDisplayName,
  loadSave,
  type SaveV1,
} from "../../src/game/save.ts";
import { parseIdentity, type Identity } from "../../src/net/identity.ts";
import { isNetworkId } from "../../src/net/networkProtocol.ts";
import { isAllowedUsername } from "./chatFilter.ts";
import { isValidPassword } from "./passwords.ts";
import { parseCopy } from "./routes.ts";

export { parseIdentity, type Identity };

/** One copy of a room, such as Downtown #2. */
export type RoomCopy = { roomId: RoomId; copy: number };
/**
 * What a hibernating room socket keeps: where it is, who it is and their look.
 */
export type Attachment = RoomCopy & {
  identity: Identity;
  look: Look;
  /** An apartment copy's owner (their player id); absent in other rooms. */
  owner?: string;
};

/** Largest save upload accepted, in UTF-8 bytes (64 KiB). */
export const MAX_SAVE_BYTES = 65_536;
const MAX_REASON_LENGTH = 200;

function fields(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}

function parseRoomCopy(f: Map<string, unknown>): RoomCopy | null {
  const roomId = f.get("roomId");
  const copy = parseCopy(f.get("copy"));
  return isRoomId(roomId) && copy ? { roomId, copy } : null;
}

/** What a room socket remembers across hibernation. */
export function parseAttachment(value: unknown): Attachment | null {
  const f = fields(value);
  const identity = parseIdentity(f.get("identity"));
  const look = f.get("look");
  const room = parseRoomCopy(f);
  const owner = f.get("owner");
  // absent, or a player id as the home route accepts it
  const ownerOk =
    owner === undefined ||
    (typeof owner === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(owner));
  if (!identity || !validateLook(look) || !room || !ownerOk) return null;
  return typeof owner === "string"
    ? { ...room, identity, look: { ...look }, owner }
    : { ...room, identity, look: { ...look } };
}

/**
 * Username and password from a signup or login body, or null if either is
 * malformed or the username is not allowed.
 */
export function parseCredentials(
  body: unknown,
): { username: string; password: string } | null {
  const f = fields(body);
  const username = f.get("username");
  const password = f.get("password");
  return isValidDisplayName(username) &&
    isAllowedUsername(username) &&
    typeof password === "string" &&
    isValidPassword(password)
    ? { username, password }
    : null;
}

// Sorted keys, so field order never decides whether a save changed.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "object" && item !== null && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : item,
  );
}

/**
 * The save, when loadSave keeps every field exactly as sent. Anything it would
 * repair is rejected, so a bad upload never overwrites the last good save.
 */
export function parseSave(raw: string, fallbackName: string): SaveV1 | null {
  if (new TextEncoder().encode(raw).length > MAX_SAVE_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const save = loadSave(raw, fallbackName);
  return canonical(parsed) === canonical(save) ? save : null;
}

/**
 * A player report: who, why (1 to 200 characters, not blank) and in which room
 * copy. Null when any part is invalid.
 */
export function parseReport(
  body: unknown,
): (RoomCopy & { targetId: string; reason: string }) | null {
  const f = fields(body);
  const targetId = f.get("targetId");
  const reason = f.get("reason");
  const room = parseRoomCopy(f);
  return isNetworkId(targetId) &&
    typeof reason === "string" &&
    reason.trim() !== "" &&
    reason.length <= MAX_REASON_LENGTH &&
    room
    ? { targetId, reason, ...room }
    : null;
}

/** An admin ban: who and why (1 to 200 characters, not blank), or null. */
export function parseBan(
  body: unknown,
): { targetId: string; reason: string } | null {
  const f = fields(body);
  const targetId = f.get("targetId");
  const reason = f.get("reason");
  return isNetworkId(targetId) &&
    typeof reason === "string" &&
    reason.trim() !== "" &&
    reason.length <= MAX_REASON_LENGTH
    ? { targetId, reason }
    : null;
}

/** `room` is where both players are now, so the block applies at once. */
export function parseBlock(
  body: unknown,
): { targetId: string; room: RoomCopy | null } | null {
  const f = fields(body);
  const targetId = f.get("targetId");
  if (!isNetworkId(targetId)) return null;
  if (!f.has("roomId") && !f.has("copy")) return { targetId, room: null };
  const room = parseRoomCopy(f);
  return room ? { targetId, room } : null;
}

/** A friend request or unfriending: just who. */
export function parseTarget(body: unknown): string | null {
  const targetId = fields(body).get("targetId");
  return isNetworkId(targetId) ? targetId : null;
}

/**
 * A look from a JSON query parameter; a missing or invalid one falls back to a
 * copy of DEFAULT_LOOK, never null.
 */
export function parseLookParam(param: string | null): Look {
  try {
    const look: unknown = JSON.parse(param ?? "");
    if (validateLook(look)) return { ...look };
  } catch {
    // Missing or corrupt: fall back below.
  }
  return { ...DEFAULT_LOOK };
}
