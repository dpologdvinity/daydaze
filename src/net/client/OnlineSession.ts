import { validateLook, type Look } from "../../game/look.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import type { Identity } from "../identity.ts";
import {
  CLOSE_CODES,
  decodeServerMessage,
  encodeClientMessage,
  type ClientMessage,
  type EntityDelta,
} from "../networkProtocol.ts";
import {
  interpolateEntityState,
  type NetworkTransport,
} from "../roomNetworkSync.ts";
import type { Api, ApiResult, Report, RoomCopy } from "./api.ts";
import type { SaveV1 } from "../../game/save.ts";
import type { Schedule, TransportStatus } from "./WebSocketTransport.ts";

/** 12 Hz stays under the server's 15/s movement bucket. */
export const MOVE_INTERVAL_MS = 1000 / 12;
/** Remote players render this far in the past, between two received states. */
export const INTERPOLATION_DELAY_MS = 100;
const MAX_COPY = 99;

export type SessionStatus = "idle" | "offline" | "ready" | TransportStatus;
export type RoomTransport = NetworkTransport & {
  onStatus(handler: (status: TransportStatus) => void): void;
  onCloseCode(handler: (code: number) => void): void;
};
export type RemotePlayer = {
  id: string;
  /** Null until the player's profile arrives. */
  name: string | null;
  look: Look | null;
  /** Timestamps are local receive times, so they share our clock. */
  prev: EntityDelta | null;
  next: EntityDelta | null;
};
export type JoinOutcome =
  | { ok: true; copy: number }
  | {
      ok: false;
      reason: "offline" | "network" | "full" | "banned" | "invalid" | "closed";
    };
export type SessionEvents = {
  status: SessionStatus;
  snapshot: { roomId: RoomId; copy: number };
  profile: RemotePlayer;
  delta: RemotePlayer;
  leave: string;
  chat: { id: string; name: string | null; text: string };
  emote: { id: string; emote: string };
  game: { from: string; data: string };
  occupancy: number;
  closeCode: number;
};
export type OnlineSessionOptions = {
  api: Api;
  /** For example `wss://daydaze.example`, or `ws://localhost:5173` behind the Vite proxy. */
  wsBaseUrl: string;
  openTransport: (url: string) => RoomTransport;
  now?: () => number;
  schedule?: Schedule;
};

type Pose = { x: number; z: number; yaw: number; action: string };
type Listeners = {
  [K in keyof SessionEvents]: Set<(payload: SessionEvents[K]) => void>;
};
type Attempt = "joined" | "full" | "banned" | "invalid" | "closed";

const defaultSchedule: Schedule = (callback, delayMs) => {
  const handle = setTimeout(callback, delayMs);
  return () => clearTimeout(handle);
};

/** Framework-free online play: session, room copy, remote players and sends. */
export class OnlineSession {
  /** Everyone else in the room copy, by player id. */
  readonly remotePlayers: ReadonlyMap<string, RemotePlayer>;
  private readonly players = new Map<string, RemotePlayer>();
  private readonly api: Api;
  private readonly wsBaseUrl: string;
  private readonly openTransport: (url: string) => RoomTransport;
  private readonly now: () => number;
  private readonly schedule: Schedule;
  private readonly listeners: Listeners = {
    status: new Set(),
    snapshot: new Set(),
    profile: new Set(),
    delta: new Set(),
    leave: new Set(),
    chat: new Set(),
    emote: new Set(),
    game: new Set(),
    occupancy: new Set(),
    closeCode: new Set(),
  };
  private state: SessionStatus = "idle";
  private self: Identity | null = null;
  private transport: RoomTransport | null = null;
  private current: { roomId: RoomId; copy: number } | null = null;
  private look: Look | null = null;
  private pose: Pose = { x: 0, z: 0, yaw: 0, action: "idle" };
  private lastMoveAt = -Infinity;
  private cancelMove: (() => void) | null = null;

  constructor(options: OnlineSessionOptions) {
    this.api = options.api;
    this.wsBaseUrl = options.wsBaseUrl;
    this.openTransport = options.openTransport;
    this.now = options.now ?? Date.now;
    this.schedule = options.schedule ?? defaultSchedule;
    this.remotePlayers = this.players;
  }

  /** Subscribes to an event; the returned function unsubscribes. */
  on<K extends keyof SessionEvents>(
    event: K,
    listener: (payload: SessionEvents[K]) => void,
  ): () => void {
    const listeners: Set<(payload: SessionEvents[K]) => void> =
      this.listeners[event];
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  status(): SessionStatus {
    return this.state;
  }
  identity(): Identity | null {
    return this.self;
  }
  room(): { roomId: RoomId; copy: number } | null {
    return this.current;
  }

  /** Resumes the cookie session or becomes a guest; null means play offline. */
  async start(): Promise<Identity | null> {
    const me = await this.api.me();
    const identity = me.ok ? me : await this.api.guest();
    if (!identity.ok) {
      this.self = null;
      this.setStatus("offline");
      return null;
    }
    this.self = identity.value;
    this.setStatus("ready");
    return identity.value;
  }

  /**
   * The copy of `roomId` a join would try first (the server's pick), or null
   * when the listing can't be fetched. A party leader asks before leaving, so
   * the members can be told where to follow.
   */
  async pickCopy(roomId: RoomId): Promise<number | null> {
    const listing = await this.api.rooms(roomId);
    return listing.ok ? listing.value.pick : null;
  }

  /** Joins the least-full copy, moving on to the next one while copies are full. */
  /** `copy` asks for that copy first (a friend's), if it has room. */
  joinRoom(roomId: RoomId, look: Look, copy?: number): Promise<JoinOutcome> {
    const { position, yaw } = ROOMS[roomId].spawn;
    return this.enter(
      roomId,
      look,
      { x: position[0], z: position[1], yaw, action: "idle" },
      copy,
    );
  }

  /** Signs up or logs in; on success, rejoins as that account. */
  async signIn(
    kind: "signup" | "login",
    username: string,
    password: string,
  ): Promise<ApiResult<Identity>> {
    const result = await this.api[kind](username, password);
    if (result.ok) await this.adoptIdentity();
    return result;
  }

  /** Logs out and carries on as a fresh guest. */
  async signOut(): Promise<void> {
    await this.api.logout();
    await this.adoptIdentity();
  }

  /** The signed-in account's save (a fresh one if it has none yet). */
  cloudSave(fallbackName: string): Promise<ApiResult<SaveV1>> {
    return this.api.getSave(fallbackName);
  }

  storeSave(save: SaveV1): Promise<ApiResult<SaveV1>> {
    return this.api.putSave(save);
  }

  /**
   * Call after login, signup or logout: re-reads the cookie session (or becomes
   * a guest) and rejoins the current room copy, in place, as that identity.
   */
  async adoptIdentity(): Promise<{
    identity: Identity | null;
    join: JoinOutcome | null;
  }> {
    const room = this.current;
    const look = this.look;
    const pose = this.pose;
    // The old socket still speaks for the old identity: drop it first.
    this.leaveRoom();
    const identity = await this.start();
    if (!identity || !room || !look) return { identity, join: null };
    return {
      identity,
      join: await this.enter(room.roomId, look, pose, room.copy),
    };
  }

  private async enter(
    roomId: RoomId,
    look: Look,
    pose: Pose,
    preferredCopy?: number,
  ): Promise<JoinOutcome> {
    if (!this.self) return { ok: false, reason: "offline" };
    this.leaveRoom();
    this.look = { ...look };
    this.pose = pose;
    const listing = await this.api.rooms(roomId);
    if (!listing.ok) return { ok: false, reason: "network" };
    const { pick, copies } = listing.value;
    const open = copies.filter((copy) => !copy.full).map(({ copy }) => copy);
    const highest = Math.max(pick, ...copies.map(({ copy }) => copy));
    const candidates = [
      ...new Set([preferredCopy ?? pick, pick, ...open, highest + 1]),
    ].filter((copy) => copy <= MAX_COPY);
    for (const copy of candidates) {
      const attempt = await this.connect(roomId, copy);
      if (attempt === "joined") return { ok: true, copy };
      if (attempt !== "full") return { ok: false, reason: attempt };
    }
    return { ok: false, reason: "full" };
  }

  leaveRoom(): void {
    const transport = this.transport;
    this.transport = null;
    this.current = null;
    this.cancelMove?.();
    this.cancelMove = null;
    this.players.clear();
    transport?.close();
    if (this.self) this.setStatus("ready");
  }

  /** Throttled to MOVE_INTERVAL_MS; the latest pose always goes out last. */
  sendMove(x: number, z: number, yaw: number, action: string): boolean {
    const pose = { x, z, yaw, action };
    if (!this.entity(pose)) return false;
    this.pose = pose;
    if (this.cancelMove) return true;
    const wait = this.lastMoveAt + MOVE_INTERVAL_MS - this.now();
    if (wait <= 0) this.flushMove();
    else
      this.cancelMove = this.schedule(() => {
        this.cancelMove = null;
        this.flushMove();
      }, wait);
    return true;
  }

  setLook(look: unknown): boolean {
    if (!validateLook(look)) return false;
    this.look = { ...look };
    this.sendJoin();
    return true;
  }

  sendChat(text: string): boolean {
    return this.send({ type: "chat", text });
  }

  sendEmote(emote: string): boolean {
    return this.send({ type: "emote", emote });
  }

  /** A move in a game with one other player in this room copy. */
  sendGame(to: string, data: string): boolean {
    return this.send({ type: "game", to, data });
  }

  /** Reports a player in this room copy to the moderators. False when
   * there's no room or the server refused it. */
  async report(targetId: string, reason: string): Promise<boolean> {
    if (!this.current) return false;
    const r = await this.api.report({ ...this.current, targetId, reason });
    return r.ok;
  }

  /** Blocks a player: the server stops passing their chat and moves to you
   * in this copy at once, and in every room after. They leave your view. */
  async block(targetId: string): Promise<boolean> {
    const r = await this.api.block(targetId, this.current ?? undefined);
    if (r.ok && this.players.delete(targetId)) this.emit("leave", targetId);
    return r.ok;
  }

  /** Moves to another copy of this room (a friend's), staying put. */
  /** The copies of the room you're in, with how many are in each. */
  async copies(): Promise<
    | (RoomCopy & {
        copies: { copy: number; count: number; full: boolean }[];
      })
    | null
  > {
    const room = this.current;
    if (!room) return null;
    const listing = await this.api.rooms(room.roomId);
    return listing.ok ? { ...room, copies: listing.value.copies } : null;
  }

  async switchCopy(copy: number): Promise<JoinOutcome> {
    const room = this.current;
    const look = this.look;
    if (!room || !look) return { ok: false, reason: "offline" };
    if (room.copy === copy) return { ok: true, copy };
    return this.enter(room.roomId, look, this.pose, copy);
  }

  /** Your friends, where they are, and requests either way. */
  friends() {
    return this.api.friends();
  }
  /** Asks to be friends, or accepts their request. */
  /** Admins only; the server checks. Null when it says no. */
  async reports(): Promise<Report[] | null> {
    const r = await this.api.reports();
    return r.ok ? r.value : null;
  }

  /** Admins only; the server checks. */
  async ban(targetId: string, reason: string): Promise<boolean> {
    return (await this.api.ban(targetId, reason)).ok;
  }

  async friend(targetId: string): Promise<boolean> {
    return (await this.api.friend(targetId)).ok;
  }
  /** Ends a friendship, or turns down or takes back a request. */
  async unfriend(targetId: string): Promise<boolean> {
    return (await this.api.unfriend(targetId)).ok;
  }

  /** Where to draw a remote player now, rendered INTERPOLATION_DELAY_MS behind. */
  sample(id: string, at = this.now()): EntityDelta | null {
    const player = this.players.get(id);
    if (!player?.next) return null;
    // Never extrapolate: a player who stopped must not overshoot.
    const target = Math.min(at - INTERPOLATION_DELAY_MS, player.next.timestamp);
    return interpolateEntityState(
      player.prev ?? player.next,
      player.next,
      target,
    );
  }

  private connect(roomId: RoomId, copy: number): Promise<Attempt> {
    return new Promise((resolve) => {
      const look = encodeURIComponent(JSON.stringify(this.look));
      const transport = this.openTransport(
        `${this.wsBaseUrl}/ws/room/${roomId}/${copy}?look=${look}`,
      );
      this.transport = transport;
      this.current = { roomId, copy };
      this.setStatus("connecting");
      let lastCode: number = CLOSE_CODES.left;
      let settled = false;
      const settle = (attempt: Attempt) => {
        if (!settled) resolve(attempt);
        settled = true;
      };
      const live = () => this.transport === transport;
      transport.onStatus((status) => {
        if (!live()) return;
        this.setStatus(status);
        // Every (re)connect is a fresh join on the server.
        if (status === "open") this.sendJoin();
      });
      transport.onCloseCode((code) => {
        lastCode = code;
        if (live()) this.emit("closeCode", code);
      });
      transport.onMessage((raw) => {
        if (live() && this.receive(raw, roomId, copy)) settle("joined");
      });
      transport.onClose(() => {
        if (live()) {
          this.transport = null;
          this.players.clear();
        }
        settle(
          lastCode === CLOSE_CODES.full
            ? "full"
            : lastCode === CLOSE_CODES.banned
              ? "banned"
              : lastCode === CLOSE_CODES.invalid
                ? "invalid"
                : "closed",
        );
      });
    });
  }

  /** Applies one server frame; true for a snapshot. */
  private receive(raw: string, roomId: RoomId, copy: number): boolean {
    const message = decodeServerMessage(raw);
    if (!message) return false;
    const selfId = this.self?.id;
    switch (message.type) {
      case "snapshot":
        this.players.clear();
        for (const entity of message.entities)
          if (entity.id !== selfId)
            this.players.set(entity.id, {
              id: entity.id,
              name: null,
              look: null,
              prev: null,
              next: this.stamp(entity),
            });
        this.emit("snapshot", { roomId, copy });
        return true;
      case "profile": {
        if (message.id === selfId) return false;
        const player = this.player(message.id);
        player.name = message.name;
        player.look = validateLook(message.look) ? { ...message.look } : null;
        this.emit("profile", player);
        return false;
      }
      case "delta": {
        if (message.entity.id === selfId) return false;
        const player = this.player(message.entity.id);
        player.prev = player.next;
        player.next = this.stamp(message.entity);
        this.emit("delta", player);
        return false;
      }
      case "entity-leave":
        this.players.delete(message.id);
        this.emit("leave", message.id);
        return false;
      case "chat":
        this.emit("chat", {
          id: message.id,
          name: this.players.get(message.id)?.name ?? null,
          text: message.text,
        });
        return false;
      case "emote":
        this.emit("emote", { id: message.id, emote: message.emote });
        return false;
      case "game":
        this.emit("game", { from: message.from, data: message.data });
        return false;
      case "occupancy":
        this.emit("occupancy", message.count);
        return false;
    }
  }

  private player(id: string): RemotePlayer {
    let player = this.players.get(id);
    if (!player) {
      player = { id, name: null, look: null, prev: null, next: null };
      this.players.set(id, player);
    }
    return player;
  }

  private stamp(entity: EntityDelta): EntityDelta {
    return { ...entity, timestamp: this.now() };
  }

  private entity(pose: Pose): EntityDelta | null {
    const id = this.self?.id ?? "offline";
    const entity = { id, ...pose, timestamp: Math.max(0, this.now()) };
    try {
      encodeClientMessage({ type: "update", entity });
      return entity;
    } catch {
      return null;
    }
  }

  private flushMove(): void {
    this.lastMoveAt = this.now();
    const entity = this.entity(this.pose);
    if (entity) this.send({ type: "update", entity });
  }

  private sendJoin(): void {
    const entity = this.entity(this.pose);
    if (!this.self || !this.current || !this.look || !entity) return;
    this.send({
      type: "join",
      roomId: this.current.roomId,
      name: this.self.name,
      look: this.look,
      entity,
    });
  }

  private send(message: ClientMessage): boolean {
    if (!this.transport?.isConnected()) return false;
    let raw: string;
    try {
      raw = encodeClientMessage(message);
    } catch {
      return false;
    }
    this.transport.send(raw);
    return true;
  }

  private emit<K extends keyof SessionEvents>(
    event: K,
    payload: SessionEvents[K],
  ): void {
    const listeners: Set<(payload: SessionEvents[K]) => void> =
      this.listeners[event];
    for (const listener of listeners) listener(payload);
  }

  private setStatus(status: SessionStatus): void {
    if (this.state === status) return;
    this.state = status;
    this.emit("status", status);
  }
}
