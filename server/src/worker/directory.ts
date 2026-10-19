import { DurableObject } from "cloudflare:workers";
import { isRoomId, type RoomId } from "../../../src/game/rooms.ts";
import { isNetworkId } from "../../../src/net/networkProtocol.ts";
import { listCopies, type CopyListing } from "../directoryCore.ts";
import { ROOM_CAPACITY } from "../roomCore.ts";
import { parseCopy } from "../routes.ts";
import { roomObjectName } from "./roomInstance.ts";

/** One per world: the headcount of every copy of every room, and who is
 * where, for friends' presence. */
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
    ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS presence (
        player_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        copy INTEGER NOT NULL
      )`,
    );
  }

  /** A room copy's headcount and who it is; they replace its last report. */
  report(
    roomId: string,
    copy: number,
    count: number,
    ids: string[] = [],
  ): void {
    if (!isRoomId(roomId) || !parseCopy(copy)) return;
    if (!Number.isInteger(count) || count < 0) return;
    const sql = this.ctx.storage.sql;
    sql.exec(
      `INSERT INTO copies (room_id, copy, count) VALUES (?, ?, ?)
       ON CONFLICT (room_id, copy) DO UPDATE SET count = excluded.count`,
      roomId,
      copy,
      count,
    );
    sql.exec(
      "DELETE FROM presence WHERE room_id = ? AND copy = ?",
      roomId,
      copy,
    );
    // a player in two places (mid-move) shows in the copy that spoke last
    for (const id of ids.slice(0, ROOM_CAPACITY))
      if (isNetworkId(id))
        sql.exec(
          `INSERT INTO presence (player_id, room_id, copy) VALUES (?, ?, ?)
           ON CONFLICT (player_id) DO UPDATE
             SET room_id = excluded.room_id, copy = excluded.copy`,
          id,
          roomId,
          copy,
        );
  }

  /** Where each of these players is, if they're in a room. */
  where(ids: string[]): { id: string; roomId: RoomId; copy: number }[] {
    if (ids.length === 0) return [];
    return this.ctx.storage.sql
      .exec(
        `SELECT player_id, room_id, copy FROM presence
         WHERE player_id IN (SELECT value FROM json_each(?))`,
        JSON.stringify(ids),
      )
      .toArray()
      .flatMap(({ player_id, room_id, copy }) =>
        typeof player_id === "string" &&
        isRoomId(room_id) &&
        typeof copy === "number"
          ? [{ id: player_id, roomId: room_id, copy }]
          : [],
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
