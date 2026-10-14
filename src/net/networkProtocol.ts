/** World-space limits also bound untrusted local/remote transport inputs. */
export const MAX_COORDINATE = 100_000;
export const MAX_ROOM_ENTITIES = 512;
const MAX_PACKET_BYTES = 65_536;

export type EntityDelta = {
  id: string;
  x: number;
  y: number;
  heading: "left" | "right";
  action: string;
  timestamp: number;
};
export type JoinRoomMessage = {
  type: "join";
  roomId: string;
  entity: EntityDelta;
};
export type LeaveRoomMessage = { type: "leave" };
export type EntityUpdateMessage = { type: "update"; entity: EntityDelta };
export type ChatMessage = { type: "chat"; text: string };
export type EmoteMessage = { type: "emote"; emote: string };
export type ClientMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | EntityUpdateMessage
  | ChatMessage
  | EmoteMessage;
export type RoomSnapshotMessage = {
  type: "snapshot";
  roomId: string;
  entities: EntityDelta[];
};
export type EntityDeltaBroadcast = {
  type: "delta";
  roomId: string;
  entity: EntityDelta;
};
export type EntityLeaveBroadcast = {
  type: "entity-leave";
  roomId: string;
  id: string;
};
export type ChatBroadcast = ChatMessage & { roomId: string; id: string };
export type EmoteBroadcast = EmoteMessage & { roomId: string; id: string };
export type RoomOccupancyMessage = {
  type: "occupancy";
  roomId: string;
  count: number;
};
export type ServerMessage =
  | RoomSnapshotMessage
  | EntityDeltaBroadcast
  | EntityLeaveBroadcast
  | ChatBroadcast
  | EmoteBroadcast
  | RoomOccupancyMessage;

function parse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  return raw.length <= MAX_PACKET_BYTES &&
    new TextEncoder().encode(raw).length <= MAX_PACKET_BYTES
    ? JSON.parse(raw)
    : null;
}
function record(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}
function text(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    value.trim().length > 0
  );
}
export function isNetworkId(value: unknown): value is string {
  return text(value, 32);
}
function coordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_COORDINATE
  );
}
function entity(raw: unknown): EntityDelta | null {
  const value = parse(raw);
  let id, x, y, heading, action, timestamp;
  if (Array.isArray(value)) {
    if (value.length !== 6 || (value[3] !== 0 && value[3] !== 1)) return null;
    [id, x, y, , action, timestamp] = value;
    heading = value[3] === 0 ? "left" : "right";
  } else if (record(value)) {
    ({ id, x, y, heading, action, timestamp } = value);
  } else return null;
  if (
    !isNetworkId(id) ||
    !coordinate(x) ||
    !coordinate(y) ||
    (heading !== "left" && heading !== "right") ||
    !text(action, 24) ||
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp) ||
    timestamp < 0
  )
    return null;
  return { id, x, y, heading, action, timestamp };
}

/** Accept a compact tuple/string or a domain object; never retain input references. */
export function decodeEntityDelta(raw: unknown): EntityDelta | null {
  try {
    return entity(raw);
  } catch {
    return null;
  }
}
function tuple(
  delta: EntityDelta,
): [string, number, number, number, string, number] {
  return [
    delta.id,
    Math.round(delta.x),
    Math.round(delta.y),
    delta.heading === "left" ? 0 : 1,
    delta.action,
    delta.timestamp,
  ];
}
/** <40 UTF-8 bytes for standard short IDs/actions; longer validated IDs cost more. */
export function encodeEntityDelta(delta: EntityDelta): string {
  const valid = decodeEntityDelta(delta);
  if (!valid) throw new TypeError("Invalid entity delta");
  return JSON.stringify(tuple(valid));
}

export function decodeClientMessage(raw: unknown): ClientMessage | null {
  try {
    const value = parse(raw);
    if (!record(value)) return null;
    switch (value.type) {
      case "join": {
        const roomId = value.roomId;
        const delta = entity(value.entity);
        return text(roomId, 64) && delta
          ? { type: "join", roomId, entity: delta }
          : null;
      }
      case "leave":
        return { type: "leave" };
      case "update": {
        const delta = entity(value.entity);
        return delta ? { type: "update", entity: delta } : null;
      }
      case "chat": {
        const content = value.text;
        return text(content, 280) ? { type: "chat", text: content } : null;
      }
      case "emote": {
        const emote = value.emote;
        return text(emote, 24) ? { type: "emote", emote } : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function decodeServerMessage(raw: unknown): ServerMessage | null {
  try {
    const value = parse(raw);
    if (!record(value)) return null;
    const roomId = value.roomId;
    if (!text(roomId, 64)) return null;
    switch (value.type) {
      case "snapshot": {
        const entries = value.entities;
        if (!Array.isArray(entries) || entries.length > MAX_ROOM_ENTITIES)
          return null;
        const entities: EntityDelta[] = [];
        const ids = new Set<string>();
        for (const entry of entries) {
          const delta = entity(entry);
          if (!delta || ids.has(delta.id)) return null;
          ids.add(delta.id);
          entities.push(delta);
        }
        return { type: "snapshot", roomId, entities };
      }
      case "delta": {
        const delta = entity(value.entity);
        return delta ? { type: "delta", roomId, entity: delta } : null;
      }
      case "entity-leave": {
        const id = value.id;
        return isNetworkId(id) ? { type: "entity-leave", roomId, id } : null;
      }
      case "chat": {
        const id = value.id,
          content = value.text;
        return isNetworkId(id) && text(content, 280)
          ? { type: "chat", roomId, id, text: content }
          : null;
      }
      case "emote": {
        const id = value.id,
          emote = value.emote;
        return isNetworkId(id) && text(emote, 24)
          ? { type: "emote", roomId, id, emote }
          : null;
      }
      case "occupancy": {
        const count = value.count;
        return typeof count === "number" &&
          Number.isInteger(count) &&
          count >= 0 &&
          count <= MAX_ROOM_ENTITIES
          ? { type: "occupancy", roomId, count }
          : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function encodeClientMessage(message: ClientMessage): string {
  const valid = decodeClientMessage(message);
  if (!valid) throw new TypeError("Invalid client message");
  return JSON.stringify(
    valid.type === "join" || valid.type === "update"
      ? { ...valid, entity: tuple(valid.entity) }
      : valid,
  );
}
export function encodeServerMessage(message: ServerMessage): string {
  const valid = decodeServerMessage(message);
  if (!valid) throw new TypeError("Invalid server message");
  if (valid.type === "snapshot")
    return JSON.stringify({ ...valid, entities: valid.entities.map(tuple) });
  return JSON.stringify(
    valid.type === "delta" ? { ...valid, entity: tuple(valid.entity) } : valid,
  );
}
