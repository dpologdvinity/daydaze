import { validateLook, type Look } from "../../src/game/look.ts";
import { isRoomId, ROOMS, type RoomId } from "../../src/game/rooms.ts";
import { isValidDisplayName } from "../../src/game/save.ts";
import { clampToWalkable, type Vec2 } from "../../src/game/walk.ts";
import {
  decodeClientMessage,
  encodeServerMessage,
  isNetworkId,
  MAX_ROOM_ENTITIES,
  type EntityDelta,
  type ProfileMessage,
  type ServerMessage,
} from "../../src/net/networkProtocol.ts";
import { filterChat } from "./chatFilter.ts";
import {
  ACCOUNT_CHAT_LIMIT,
  createRateLimiter,
  EMOTE_LIMIT,
  GUEST_CHAT_LIMIT,
  MOVEMENT_LIMIT,
} from "./rateLimit.ts";

export const MAX_INVALID_MESSAGES = 10;
export const REPORT_CHAT_LINES = 20;

export type RoomPlayer = {
  id: string;
  name: string;
  isGuest: boolean;
  isAdmin: boolean;
  look: unknown;
};
export type JoinResult =
  { ok: true } | { ok: false; reason: "full" | "banned" | "invalid" };
/** Passed to the socket's close callback; the player is already removed. */
export type CloseReason =
  "kicked" | "banned" | "invalid-messages" | "left" | "send-failed";
export type ChatLine = { id: string; name: string; text: string; at: number };
export type RoomCoreOptions = {
  roomId: string;
  capacity?: number;
  now: () => number;
};

type Occupant = {
  id: string;
  name: string;
  look: Look;
  isGuest: boolean;
  isAdmin: boolean;
  send: (message: string) => void;
  close: (reason: CloseReason) => void;
  entity: EntityDelta | null;
  invalid: number;
};

/** One room copy's state and rules, independent of the socket host. */
export class RoomCore {
  private readonly roomId: RoomId;
  private readonly capacity: number;
  private readonly walkable: readonly Vec2[];
  private readonly now: () => number;
  private readonly occupants = new Map<string, Occupant>();
  // shortcut: blocks and bans live as long as the room copy; the gateway re-applies stored ones on join.
  private readonly blocked = new Set<string>();
  private readonly banned = new Set<string>();
  private readonly chatLog: ChatLine[] = [];
  private readonly movement = createRateLimiter(MOVEMENT_LIMIT);
  private readonly accountChat = createRateLimiter(ACCOUNT_CHAT_LIMIT);
  private readonly guestChat = createRateLimiter(GUEST_CHAT_LIMIT);
  private readonly emotes = createRateLimiter(EMOTE_LIMIT);

  constructor({ roomId, capacity = 60, now }: RoomCoreOptions) {
    if (!isRoomId(roomId)) throw new TypeError("Unknown room");
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > MAX_ROOM_ENTITIES
    )
      throw new TypeError("Invalid capacity");
    this.roomId = roomId;
    this.capacity = capacity;
    this.walkable = ROOMS[roomId].walkable;
    this.now = now;
  }

  join(
    player: RoomPlayer,
    send: (message: string) => void,
    close: (reason: CloseReason) => void,
  ): JoinResult {
    const occupant = this.admit(player, send, close);
    if (!occupant) return { ok: false, reason: "invalid" };
    if (this.banned.has(player.id)) return { ok: false, reason: "banned" };
    if (this.occupants.size >= this.capacity)
      return { ok: false, reason: "full" };

    this.occupants.set(player.id, occupant);
    const others = [...this.occupants.values()].filter(
      (other) => other !== occupant && this.visible(other, occupant),
    );
    this.sendTo(occupant, {
      type: "snapshot",
      roomId: this.roomId,
      entities: others.flatMap((other) => (other.entity ? [other.entity] : [])),
    });
    for (const other of others) this.sendTo(occupant, this.profile(other));
    if (this.occupants.get(player.id) !== occupant) return { ok: true };
    this.broadcast(occupant, this.profile(occupant));
    this.broadcastOccupancy();
    return { ok: true };
  }

  /**
   * Re-registers a socket that outlived the room's memory (hibernation)
   * without sending anything; positions return with the next updates.
   */
  restore(
    player: RoomPlayer,
    send: (message: string) => void,
    close: (reason: CloseReason) => void,
  ): boolean {
    const occupant = this.admit(player, send, close);
    if (!occupant) return false;
    this.occupants.set(player.id, occupant);
    return true;
  }

  leave(id: string): void {
    const occupant = this.occupants.get(id);
    if (!occupant) return;
    this.occupants.delete(id);
    for (const limiter of [
      this.movement,
      this.accountChat,
      this.guestChat,
      this.emotes,
    ])
      limiter.forget(id);
    this.broadcast(occupant, { type: "entity-leave", roomId: this.roomId, id });
    this.broadcastOccupancy();
  }

  handle(id: string, raw: string): void {
    const occupant = this.occupants.get(id);
    if (!occupant) return;
    const message = decodeClientMessage(raw);
    if (!message || (message.type === "join" && !validateLook(message.look))) {
      if (++occupant.invalid >= MAX_INVALID_MESSAGES)
        this.disconnect(occupant, "invalid-messages");
      return;
    }
    const now = this.now();
    switch (message.type) {
      case "join":
      case "update": {
        const current = occupant.entity;
        if (current && message.entity.timestamp < current.timestamp) return;
        if (!this.movement.take(id, now)) return;
        // The socket already fixes the room copy, so join's roomId and name are ignored.
        if (
          message.type === "join" &&
          validateLook(message.look) &&
          JSON.stringify(message.look) !== JSON.stringify(occupant.look)
        ) {
          occupant.look = { ...message.look };
          this.broadcast(occupant, this.profile(occupant));
        }
        const [x, z] = clampToWalkable(this.walkable, [
          message.entity.x,
          message.entity.z,
        ]);
        occupant.entity = { ...message.entity, id, x, z };
        this.broadcast(occupant, {
          type: "delta",
          roomId: this.roomId,
          entity: occupant.entity,
        });
        return;
      }
      case "chat": {
        const limiter = occupant.isGuest ? this.guestChat : this.accountChat;
        if (!limiter.take(id, now)) return;
        // Reports need what was typed, so the log keeps the unfiltered text.
        this.chatLog.push({
          id,
          name: occupant.name,
          text: message.text,
          at: now,
        });
        if (this.chatLog.length > REPORT_CHAT_LINES) this.chatLog.shift();
        this.broadcast(occupant, {
          type: "chat",
          roomId: this.roomId,
          id,
          text: filterChat(message.text, { strict: false }),
        });
        return;
      }
      case "emote":
        if (!this.emotes.take(id, now)) return;
        this.broadcast(occupant, {
          type: "emote",
          roomId: this.roomId,
          id,
          emote: message.emote,
        });
        return;
      case "leave":
        this.disconnect(occupant, "left");
    }
  }

  /** Hides the pair from each other in both directions. */
  block(byId: string, targetId: string): void {
    const key = pairKey(byId, targetId);
    if (byId === targetId || this.blocked.has(key)) return;
    this.blocked.add(key);
    const by = this.occupants.get(byId);
    const target = this.occupants.get(targetId);
    if (!by || !target) return;
    this.sendTo(by, {
      type: "entity-leave",
      roomId: this.roomId,
      id: targetId,
    });
    this.sendTo(target, {
      type: "entity-leave",
      roomId: this.roomId,
      id: byId,
    });
  }

  kick(adminId: string, targetId: string): boolean {
    const target = this.occupants.get(targetId);
    if (!this.isAdmin(adminId, targetId) || !target) return false;
    this.disconnect(target, "kicked");
    return true;
  }

  /** Bans the id from this room copy, present or not. */
  ban(adminId: string, targetId: string): boolean {
    if (!this.isAdmin(adminId, targetId)) return false;
    this.banned.add(targetId);
    const target = this.occupants.get(targetId);
    if (target) this.disconnect(target, "banned");
    return true;
  }

  look(id: string): Look | null {
    const look = this.occupants.get(id)?.look;
    return look ? { ...look } : null;
  }

  occupancy(): number {
    return this.occupants.size;
  }

  /** The last `n` chat lines (at most 20), oldest first, for reports. */
  recentChat(n: number): ChatLine[] {
    return this.chatLog
      .slice(Math.max(0, this.chatLog.length - n))
      .map((line) => ({ ...line }));
  }

  private admit(
    { id, name, isGuest, isAdmin, look }: RoomPlayer,
    send: (message: string) => void,
    close: (reason: CloseReason) => void,
  ): Occupant | null {
    if (
      !isNetworkId(id) ||
      !isValidDisplayName(name) ||
      !validateLook(look) ||
      this.occupants.has(id)
    )
      return null;
    return {
      id,
      name,
      look: { ...look },
      isGuest,
      isAdmin,
      send,
      close,
      entity: null,
      invalid: 0,
    };
  }

  private profile({ id, name, look }: Occupant): ProfileMessage {
    return { type: "profile", roomId: this.roomId, id, name, look };
  }

  private isAdmin(adminId: string, targetId: string): boolean {
    return adminId !== targetId && !!this.occupants.get(adminId)?.isAdmin;
  }

  private visible(a: Occupant, b: Occupant): boolean {
    return !this.blocked.has(pairKey(a.id, b.id));
  }

  private disconnect(occupant: Occupant, reason: CloseReason): void {
    this.leave(occupant.id);
    try {
      occupant.close(reason);
    } catch {
      // The socket is already gone; the player has been removed either way.
    }
  }

  private broadcast(origin: Occupant, message: ServerMessage): void {
    const raw = encodeServerMessage(message);
    for (const occupant of this.occupants.values())
      if (occupant !== origin && this.visible(occupant, origin))
        this.deliver(occupant, raw);
  }

  private broadcastOccupancy(): void {
    const raw = encodeServerMessage({
      type: "occupancy",
      roomId: this.roomId,
      count: this.occupants.size,
    });
    for (const occupant of this.occupants.values()) this.deliver(occupant, raw);
  }

  private sendTo(occupant: Occupant, message: ServerMessage): void {
    this.deliver(occupant, encodeServerMessage(message));
  }

  private deliver(occupant: Occupant, raw: string): void {
    if (this.occupants.get(occupant.id) !== occupant) return;
    try {
      occupant.send(raw);
    } catch {
      this.disconnect(occupant, "send-failed");
    }
  }
}

function pairKey(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}
