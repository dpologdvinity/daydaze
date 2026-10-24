// Typed client for the Worker's /api routes (guest, accounts, saves, room
// copies, friends, blocks, reports and admin). Every response body is parsed
// and validated before use; a call never throws and resolves to an ApiResult
// instead. Requests send cookies (credentials: include) for the session.

import { isRoomId, type RoomId } from "../../game/rooms.ts";
import { loadSave, serializeSave, type SaveV1 } from "../../game/save.ts";
import { parseFriends } from "../friends.ts";
import { parseIdentity, type Identity } from "../identity.ts";

/**
 * The fetch function the API calls through; injected so tests and the browser
 * can supply their own.
 */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
/** `status` 0 means the server could not be reached at all. */
export type ApiFailure = { ok: false; status: number; error: string };
/**
 * A call's outcome: the parsed value, or a failure with the HTTP status and the
 * server's short error code.
 */
export type ApiResult<T> = { ok: true; value: T } | ApiFailure;
/** One copy (shard) of a room, numbered from 1. */
export type RoomCopy = { roomId: RoomId; copy: number };
/**
 * `GET /api/rooms/:id`: every open copy with its head count and whether it is
 * full, plus the copy the server suggests joining (`pick`).
 */
export type RoomCopies = {
  copies: { copy: number; count: number; full: boolean }[];
  pick: number;
};

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function fields(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}
function isCopy(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 99;
}
function parseRoomCopies(text: string): RoomCopies | null {
  const f = fields(parseJson(text));
  const pick = f.get("pick");
  const entries = f.get("copies");
  if (!isCopy(pick) || !Array.isArray(entries)) return null;
  const copies: RoomCopies["copies"] = [];
  for (const entry of entries) {
    const e = fields(entry);
    const copy = e.get("copy");
    const count = e.get("count");
    const full = e.get("full");
    if (
      !isCopy(copy) ||
      !Number.isInteger(count) ||
      Number(count) < 0 ||
      typeof full !== "boolean"
    )
      return null;
    copies.push({ copy, count: Number(count), full });
  }
  return { copies, pick };
}
const identity = (text: string) => parseIdentity(parseJson(text));
const accepted = () => true as const;

/** A report as the admin viewer shows it: the chat is the room's last lines
 * before it was made, unfiltered. */
export type Report = {
  id: number;
  reporterId: string;
  targetId: string;
  reason: string;
  roomId: RoomId;
  copy: number;
  chat: { name: string; text: string }[];
  at: number;
};

const str = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.length <= max;
const int = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

function parseChat(raw: unknown): Report["chat"] {
  const list = typeof raw === "string" ? parseJson(raw) : null;
  if (!Array.isArray(list)) return [];
  return list.flatMap((line) => {
    const f = fields(line);
    const name = f.get("name");
    const text = f.get("text");
    return str(name, 64) && str(text, 500) ? [{ name, text }] : [];
  });
}

/** `GET /api/admin/reports`, row by row: a malformed row is dropped. */
export function parseReports(text: string): Report[] | null {
  const rows = fields(parseJson(text)).get("reports");
  if (!Array.isArray(rows)) return null;
  return rows.flatMap((row): Report[] => {
    const f = fields(row);
    const id = f.get("id");
    const reporterId = f.get("reporter_id");
    const targetId = f.get("target_id");
    const reason = f.get("reason");
    const roomId = f.get("room_id");
    const copy = f.get("copy");
    const at = f.get("created_at");
    return int(id) &&
      str(reporterId, 64) &&
      str(targetId, 64) &&
      str(reason) &&
      isRoomId(roomId) &&
      int(copy) &&
      int(at)
      ? [
          {
            id,
            reporterId,
            targetId,
            reason,
            roomId,
            copy,
            chat: parseChat(f.get("chat")),
            at,
          },
        ]
      : [];
  });
}

/** Typed wrappers for the Worker's /api routes; nothing from the wire is trusted. */
export function createApi({
  fetch,
  baseUrl = "",
}: {
  fetch: Fetch;
  baseUrl?: string;
}) {
  async function call<T>(
    method: string,
    path: string,
    body: string | undefined,
    parse: (text: string) => T | null,
  ): Promise<ApiResult<T>> {
    let response: Response;
    let text: string;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        credentials: "include",
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body,
      });
      text = await response.text();
    } catch {
      return { ok: false, status: 0, error: "network" };
    }
    if (!response.ok) {
      const error = fields(parseJson(text)).get("error");
      return {
        ok: false,
        status: response.status,
        error:
          typeof error === "string" && error.length <= 64
            ? error
            : `http-${response.status}`,
      };
    }
    const value = parse(text);
    return value === null
      ? { ok: false, status: response.status, error: "invalid-response" }
      : { ok: true, value };
  }
  const credentials = (username: string, password: string) =>
    JSON.stringify({ username, password });

  return {
    guest: (): Promise<ApiResult<Identity>> =>
      call("POST", "/api/guest", undefined, identity),
    signup: (username: string, password: string) =>
      call("POST", "/api/signup", credentials(username, password), identity),
    login: (username: string, password: string) =>
      call("POST", "/api/login", credentials(username, password), identity),
    logout: () => call("POST", "/api/logout", undefined, accepted),
    me: () => call("GET", "/api/me", undefined, identity),
    /** Salvaged with the same loadSave rules as localStorage. */
    getSave: (fallbackName: string): Promise<ApiResult<SaveV1>> =>
      call("GET", "/api/save", undefined, (text) =>
        loadSave(text, fallbackName),
      ),
    putSave: (save: SaveV1): Promise<ApiResult<SaveV1>> =>
      call("PUT", "/api/save", serializeSave(save), (text) =>
        loadSave(text, save.name),
      ),
    rooms: (roomId: RoomId) =>
      call("GET", `/api/rooms/${roomId}`, undefined, parseRoomCopies),
    report: (report: RoomCopy & { targetId: string; reason: string }) =>
      call("POST", "/api/report", JSON.stringify(report), accepted),
    /** Pass the shared room copy so the block applies there at once. */
    block: (targetId: string, room?: RoomCopy) =>
      call(
        "POST",
        "/api/block",
        JSON.stringify({ targetId, ...room }),
        accepted,
      ),
    /** Admins only: the latest reports. */
    reports: () => call("GET", "/api/admin/reports", undefined, parseReports),
    /** Admins only: bans a player (and a guest's last address). */
    ban: (targetId: string, reason: string) =>
      call(
        "POST",
        "/api/admin/ban",
        JSON.stringify({ targetId, reason }),
        accepted,
      ),
    /** Asks to be friends, or says yes to their request. */
    friend: (targetId: string) =>
      call("POST", "/api/friend", JSON.stringify({ targetId }), accepted),
    /** Ends a friendship, or turns down or takes back a request. */
    unfriend: (targetId: string) =>
      call("POST", "/api/unfriend", JSON.stringify({ targetId }), accepted),
    friends: () =>
      call("GET", "/api/friends", undefined, (text) =>
        parseFriends(parseJson(text)),
      ),
  };
}

/** The API object createApi returns. */
export type Api = ReturnType<typeof createApi>;
