import { DurableObject } from "cloudflare:workers";
import {
  CLOSE_CODES,
  REPORT_CHAT_LINES,
  RoomCore,
  type ChatLine,
  type CloseReason,
} from "../roomCore.ts";
import { matchRoute } from "../routes.ts";
import {
  parseAttachment,
  parseIdentity,
  parseLookParam,
  type Attachment,
  type RoomCopy,
} from "../validation.ts";

/** Set by the gateway Worker only; clients never reach this object directly. */
export const IDENTITY_HEADER = "X-Daydaze-Identity";
export const DIRECTORY_NAME = "world";

/** The Durable Object name of one room copy. */
export function roomObjectName(roomId: string, copy: number): string {
  return `${roomId}:${copy}`;
}

/** The Durable Object name of a player's apartment. */
export function homeObjectName(ownerId: string): string {
  return `apartment:home:${ownerId}`;
}

function parseJson(text: string | null): unknown {
  try {
    return JSON.parse(text ?? "null");
  } catch {
    return null;
  }
}

/** One room copy. A thin socket host around RoomCore. */
export class RoomInstance extends DurableObject<Env> {
  private core: RoomCore | null = null;
  private room: RoomCopy | null = null;
  /** An apartment copy's owner; apartments aren't listed in the Directory. */
  private home: string | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
    // After hibernation memory is empty but sockets stay open: rebuild from them.
    void ctx.blockConcurrencyWhile(async () => {
      const ids: string[] = [];
      for (const ws of ctx.getWebSockets()) {
        const attachment = parseAttachment(ws.deserializeAttachment());
        if (!attachment) {
          ws.close(CLOSE_CODES.invalid, "invalid");
          continue;
        }
        const { identity, look } = attachment;
        if (
          this.coreFor(attachment).restore(
            { ...identity, look },
            (message) => ws.send(message),
            (reason) => this.close(ws, reason),
          )
        )
          ids.push(identity.id);
      }
      await this.applyBlocks(ids);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = matchRoute("GET", url.pathname);
    const identity = parseIdentity(
      parseJson(request.headers.get(IDENTITY_HEADER)),
    );
    if ((route?.kind !== "ws" && route?.kind !== "home") || !identity)
      return new Response("Bad request", { status: 400 });
    const look = parseLookParam(url.searchParams.get("look"));
    // an apartment is one copy per owner (copy 1, with the owner named)
    const attachment: Attachment =
      route.kind === "home"
        ? { identity, look, roomId: "apartment", copy: 1, owner: route.ownerId }
        : { identity, look, roomId: route.roomId, copy: route.copy };
    const core = this.coreFor(attachment);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [identity.id]);
    server.serializeAttachment(attachment);

    // A reconnect replaces the player's stale socket instead of being refused.
    for (const stale of this.ctx.getWebSockets(identity.id))
      if (stale !== server) stale.close(CLOSE_CODES.replaced, "replaced");
    core.leave(identity.id);
    await this.applyBlocks([identity.id]);
    const result = core.join(
      { ...identity, look: attachment.look },
      (message) => server.send(message),
      (reason) => this.close(server, reason),
    );
    if (!result.ok) server.close(CLOSE_CODES[result.reason], result.reason);
    await this.reportOccupancy();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const attachment = parseAttachment(ws.deserializeAttachment());
    const core = this.core;
    if (!attachment || !core) return;
    const id = attachment.identity.id;
    const before = core.occupancy();
    // Binary frames are not part of the protocol; "" counts as invalid.
    core.handle(id, typeof message === "string" ? message : "");
    const look = core.look(id);
    if (look && JSON.stringify(look) !== JSON.stringify(attachment.look))
      ws.serializeAttachment({ ...attachment, look });
    if (core.occupancy() !== before) await this.reportOccupancy();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.drop(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.drop(ws);
  }

  /** RPC from the gateway when a player blocks someone in this copy. */
  block(byId: string, targetId: string): void {
    this.core?.block(byId, targetId);
  }

  /** RPC from the gateway for reports. */
  recentChat(): ChatLine[] {
    return this.core?.recentChat(REPORT_CHAT_LINES) ?? [];
  }

  /** RPC from the Directory after an admin ban; true when the player was here. */
  async enforceBan(targetId: string): Promise<boolean> {
    const kicked = this.core?.enforceBan(targetId) ?? false;
    // Also any socket RoomCore does not know, such as one mid-join.
    for (const ws of this.ctx.getWebSockets(targetId))
      ws.close(CLOSE_CODES.banned, "banned");
    if (kicked) await this.reportOccupancy();
    return kicked;
  }

  private coreFor(room: Attachment): RoomCore {
    this.room ??= { roomId: room.roomId, copy: room.copy };
    this.home ??= room.owner ?? null;
    this.core ??= new RoomCore({
      roomId: room.roomId,
      now: Date.now,
      ...(room.owner ? { owner: room.owner } : {}),
    });
    return this.core;
  }

  private close(ws: WebSocket, reason: CloseReason): void {
    ws.close(CLOSE_CODES[reason], reason);
  }

  private async drop(ws: WebSocket): Promise<void> {
    const attachment = parseAttachment(ws.deserializeAttachment());
    if (!attachment || !this.core) return;
    const id = attachment.identity.id;
    // The stale socket of a reconnect closes after its replacement joined.
    const replaced = this.ctx
      .getWebSockets(id)
      .some((other) => other !== ws && other.readyState === WebSocket.OPEN);
    if (!replaced) this.core.leave(id);
    await this.reportOccupancy();
  }

  private async applyBlocks(ids: string[]): Promise<void> {
    const core = this.core;
    if (!core || ids.length === 0) return;
    const { results } = await this.env.DB.prepare(
      `SELECT blocker_id, blocked_id FROM blocks
       WHERE blocker_id IN (SELECT value FROM json_each(?1))
          OR blocked_id IN (SELECT value FROM json_each(?1))`,
    )
      .bind(JSON.stringify(ids))
      .all();
    for (const { blocker_id, blocked_id } of results)
      if (typeof blocker_id === "string" && typeof blocked_id === "string")
        core.block(blocker_id, blocked_id);
  }

  private async reportOccupancy(): Promise<void> {
    if (!this.core || !this.room || this.home) return;
    try {
      await this.env.DIRECTORY.getByName(DIRECTORY_NAME).report(
        this.room.roomId,
        this.room.copy,
        this.core.occupancy(),
        this.core.ids(),
      );
    } catch (error) {
      // A stale headcount only skews auto-pick; the room itself keeps working.
      console.error("directory report failed", error);
    }
  }
}
