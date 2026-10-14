import {
  decodeClientMessage,
  decodeServerMessage,
  encodeServerMessage,
  isNetworkId,
  MAX_ROOM_ENTITIES,
  type ClientMessage,
  type EntityDelta,
  type ServerMessage,
} from "./networkProtocol.ts";

export interface NetworkTransport {
  send(message: string): void;
  onMessage(handler: (message: string) => void): void;
  onClose(handler: () => void): void;
  close(): void;
  isConnected(): boolean;
}

const MAX_EXTRAPOLATION_MS = 200;
const MAX_EXTRAPOLATION_DISPLACEMENT = 20;

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

export function interpolateEntityState(
  prev: EntityDelta,
  next: EntityDelta,
  targetTimeMs: number,
): EntityDelta {
  if (!Number.isFinite(targetTimeMs))
    throw new TypeError("Invalid interpolation time");
  const span = next.timestamp - prev.timestamp;
  if (span === 0 && targetTimeMs >= next.timestamp)
    return { ...next, timestamp: targetTimeMs };
  if (targetTimeMs <= prev.timestamp || span < 0) {
    return { ...prev, timestamp: targetTimeMs };
  }

  const clampedTimeMs = Math.min(
    targetTimeMs,
    next.timestamp + MAX_EXTRAPOLATION_MS,
  );
  const ratio = Math.min(1, (clampedTimeMs - prev.timestamp) / span);
  let x = lerp(prev.x, next.x, ratio);
  let y = lerp(prev.y, next.y, ratio);

  if (clampedTimeMs > next.timestamp) {
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      // Cap the scalar distance before projecting it: tiny spans may overflow
      // the speed estimate, but must never create Infinity/Infinity or 0*Infinity.
      const displacement = Math.min(
        MAX_EXTRAPOLATION_DISPLACEMENT,
        distance * ((clampedTimeMs - next.timestamp) / span),
      );
      x = next.x + (dx / distance) * displacement;
      y = next.y + (dy / distance) * displacement;
    }
  }

  const heading =
    next.x !== prev.x ? (next.x < prev.x ? "left" : "right") : next.heading;

  return {
    id: next.id,
    x,
    y,
    heading,
    action: next.action,
    timestamp: clampedTimeMs,
  };
}

type RoomId = string;

type ClientRecord = {
  clientId: string;
  transport: NetworkTransport;
  roomId: RoomId | null;
};

export class SpatialRoomServer {
  private readonly clients = new Map<string, ClientRecord>();
  private readonly rooms = new Map<RoomId, Map<string, EntityDelta>>();

  connectClient(clientId: string, transport: NetworkTransport): void {
    if (!isNetworkId(clientId)) throw new TypeError("Invalid client ID");
    if (this.clients.get(clientId)?.transport === transport) return;
    this.disconnectClient(clientId);
    const record: ClientRecord = { clientId, transport, roomId: null };
    this.clients.set(clientId, record);
    transport.onMessage((raw) => this.handleMessage(record, raw));
    transport.onClose(() => {
      if (this.clients.get(clientId) === record)
        this.disconnectClient(clientId);
    });
  }

  disconnectClient(clientId: string): void {
    const record = this.clients.get(clientId);
    if (!record) return;
    this.clients.delete(clientId);
    this.leaveCurrentRoom(record);
    record.transport.close();
  }

  getRoomOccupancy(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  getRoomEntities(roomId: string): EntityDelta[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values(), (entity) => ({ ...entity })) : [];
  }

  private handleMessage(record: ClientRecord, raw: string): void {
    if (
      this.clients.get(record.clientId) !== record ||
      !record.transport.isConnected()
    )
      return;
    const message = decodeClientMessage(raw);
    if (!message) return;
    const currentEntity = record.roomId
      ? this.rooms.get(record.roomId)?.get(record.clientId)
      : undefined;
    switch (message.type) {
      case "join":
        this.handleJoin(record, message);
        break;
      case "leave":
        this.leaveCurrentRoom(record);
        break;
      case "update":
        this.handleUpdate(record, message);
        break;
      case "chat":
        if (!currentEntity) return;
        this.broadcastToRoom(record, {
          type: "chat",
          roomId: record.roomId ?? "",
          id: currentEntity.id,
          text: message.text,
        });
        break;
      case "emote":
        if (!currentEntity) return;
        this.broadcastToRoom(record, {
          type: "emote",
          roomId: record.roomId ?? "",
          id: currentEntity.id,
          emote: message.emote,
        });
        break;
    }
  }

  private handleJoin(
    record: ClientRecord,
    message: ClientMessage & { type: "join" },
  ): void {
    const destination = this.rooms.get(message.roomId);
    if (destination) {
      if (
        destination.size >= MAX_ROOM_ENTITIES &&
        !destination.has(record.clientId)
      )
        return;
      for (const [clientId, entity] of destination) {
        if (clientId !== record.clientId && entity.id === message.entity.id)
          return;
      }
    }
    this.leaveCurrentRoom(record);
    if (this.clients.get(record.clientId) !== record) return;

    const room =
      this.rooms.get(message.roomId) ?? new Map<string, EntityDelta>();
    this.rooms.set(message.roomId, room);
    room.set(record.clientId, message.entity);
    record.roomId = message.roomId;

    const snapshotEntities = Array.from(room.entries())
      .filter(([clientId]) => clientId !== record.clientId)
      .map(([, entity]) => entity);
    this.sendTo(record, {
      type: "snapshot",
      roomId: message.roomId,
      entities: snapshotEntities,
    });
    // Loopback handlers run synchronously and may leave/rejoin on a snapshot.
    if (
      this.clients.get(record.clientId) !== record ||
      record.roomId !== message.roomId ||
      room.get(record.clientId) !== message.entity
    )
      return;

    this.broadcastToRoom(record, {
      type: "delta",
      roomId: message.roomId,
      entity: message.entity,
    });
    this.broadcastOccupancy(message.roomId);
  }

  private handleUpdate(
    record: ClientRecord,
    message: ClientMessage & { type: "update" },
  ): void {
    const roomId = record.roomId;
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    const current = room.get(record.clientId);
    if (
      !current ||
      message.entity.id !== current.id ||
      message.entity.timestamp < current.timestamp
    )
      return;
    room.set(record.clientId, message.entity);
    this.broadcastToRoom(record, {
      type: "delta",
      roomId,
      entity: message.entity,
    });
  }

  private leaveCurrentRoom(record: ClientRecord): void {
    const roomId = record.roomId;
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    record.roomId = null;
    if (!room) return;
    const entity = room.get(record.clientId);
    if (!entity) return;
    room.delete(record.clientId);
    this.broadcastToRoom(record, {
      type: "entity-leave",
      roomId,
      id: entity.id,
    });
    if (room.size === 0) this.rooms.delete(roomId);
    this.broadcastOccupancy(roomId);
  }

  private broadcastOccupancy(roomId: string): void {
    const count = this.getRoomOccupancy(roomId);
    for (const record of this.clients.values()) {
      if (record.roomId === roomId)
        this.sendTo(record, { type: "occupancy", roomId, count });
    }
  }

  private broadcastToRoom(origin: ClientRecord, message: ServerMessage): void {
    const roomId = message.roomId;
    for (const record of this.clients.values()) {
      if (record.roomId === roomId && record.clientId !== origin.clientId)
        this.sendTo(record, message);
    }
  }

  private sendTo(record: ClientRecord, message: ServerMessage): void {
    if (this.clients.get(record.clientId) !== record) return;
    if (!record.transport.isConnected()) {
      this.disconnectClient(record.clientId);
      return;
    }
    const valid = decodeServerMessage(message);
    if (!valid) return;
    const raw = encodeServerMessage(valid);
    try {
      record.transport.send(raw);
    } catch {
      if (this.clients.get(record.clientId) === record)
        this.disconnectClient(record.clientId);
    }
  }
}

class LoopbackTransport implements NetworkTransport {
  private messageHandler: ((message: string) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private connected = true;
  peer: LoopbackTransport | null = null;

  send(message: string): void {
    if (!this.connected) return;
    this.peer?.deliver(message);
  }

  deliver(message: string): void {
    if (!this.connected) return;
    this.messageHandler?.(message);
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  close(): void {
    if (!this.connected) return;
    this.connected = false;
    const peer = this.peer;
    this.peer = null;
    peer?.close();
    this.closeHandler?.();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export function createLocalLoopbackPair(
  server: SpatialRoomServer,
  clientId: string,
): { clientTransport: NetworkTransport } {
  const clientTransport = new LoopbackTransport();
  const serverTransport = new LoopbackTransport();
  clientTransport.peer = serverTransport;
  serverTransport.peer = clientTransport;
  server.connectClient(clientId, serverTransport);
  return { clientTransport };
}
