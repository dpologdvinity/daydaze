import { DurableObject } from "cloudflare:workers";
import { isRoomId, type RoomId } from "../../../src/game/rooms.ts";
import { listCopies, type CopyListing } from "../directoryCore.ts";
import { ROOM_CAPACITY } from "../roomCore.ts";
import { parseCopy } from "../routes.ts";
import { roomObjectName } from "./roomInstance.ts";

/** One per world: the headcount of every copy of every room. */
export class Directory extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS copies (
        room_id TEXT NOT NULL,
        copy INTEGER NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (room_id, copy)
      )`,
    );
  }

  report(roomId: string, copy: number, count: number): void {
    if (!isRoomId(roomId) || !parseCopy(copy)) return;
    if (!Number.isInteger(count) || count < 0) return;
    this.ctx.storage.sql.exec(
      `INSERT INTO copies (room_id, copy, count) VALUES (?, ?, ?)
       ON CONFLICT (room_id, copy) DO UPDATE SET count = excluded.count`,
      roomId,
      copy,
      count,
    );
  }

  /** Tells every occupied room copy to drop a banned player; returns how many had them. */
  async kickEverywhere(targetId: string): Promise<number> {
    const copies = this.ctx.storage.sql
      .exec("SELECT room_id, copy FROM copies WHERE count > 0")
      .toArray();
    const results = await Promise.all(
      copies.map(({ room_id, copy }) =>
        typeof room_id === "string" && typeof copy === "number"
          ? this.env.ROOMS.getByName(roomObjectName(room_id, copy)).enforceBan(
              targetId,
            )
          : false,
      ),
    );
    return results.filter(Boolean).length;
  }

  list(roomId: RoomId): CopyListing {
    const rows = this.ctx.storage.sql
      .exec("SELECT copy, count FROM copies WHERE room_id = ?", roomId)
      .toArray();
    return listCopies(
      rows.flatMap(({ copy, count }) =>
        typeof copy === "number" && typeof count === "number"
          ? [{ copy, count }]
          : [],
      ),
      ROOM_CAPACITY,
    );
  }
}
