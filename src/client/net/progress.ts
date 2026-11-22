// Reports what an account earns to the server, which owns its XP and title.
// The local save is paid first, so the game works offline and a failed call
// never loses the result; a reply then replaces the local XP and title with
// the server's. Guests never call (their progress stays on the device).
import type { PrizeGame } from "../../game/prizes.ts";
import type { RoomId } from "../../game/rooms.ts";
import { mayPush } from "../../net/client/saveSync.ts";
import type { ApiResult } from "../../net/client/api.ts";
import {
  isTransient,
  retryBusy,
  scoreNote,
} from "../../net/client/progressSync.ts";
import type { ServerProgress } from "../../net/progress.ts";
import { prizeDesk } from "../ui/prizeDesk.ts";
import { account } from "./account.ts";
import { onlineSession } from "./session.ts";

/** Puts the server's XP and title into the local save. */
export type Adopt = (server: Pick<ServerProgress, "xp" | "title">) => void;

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** The signed-in account whose own save has loaded (only then is the server
 * row ours to write to and the local numbers safe to replace), or null. */
const current = () => {
  const { me, cloudReady } = account.get();
  return me && mayPush(me, cloudReady) ? me.id : null;
};

const SWITCHED = {
  ok: false,
  status: 0,
  error: "account-changed",
} as const;

/**
 * Runs one write for the account that was signed in when it started. If the
 * player switches accounts meanwhile, no further attempt is sent (it would
 * carry the new session's cookie) and the result is not adopted.
 */
async function forAccount<T>(
  id: string,
  call: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  return retryBusy(
    () => (current() === id ? call() : Promise.resolve(SWITCHED)),
    sleep,
  );
}

/**
 * A finished game: the server grades the score and pays the XP. The prize
 * card that `at` posted shows the server's XP and a note on the daily cap, or
 * on why the score didn't reach the board.
 */
export async function reportScore(
  game: PrizeGame,
  score: number,
  at: number,
  adopt: Adopt,
): Promise<void> {
  const session = onlineSession();
  const id = current();
  if (!session || !id) return;
  const result = await forAccount(id, () =>
    session.progress.submitScore(game, score),
  );
  if (current() !== id) return;
  if (result.ok) adopt(result.value);
  // a newer prize owns the card by now
  if (prizeDesk.get().at !== at) return;
  prizeDesk.set(
    result.ok
      ? { xp: result.value.gained, note: scoreNote(result) }
      : { note: scoreNote(result) },
  );
}

/** Rooms first entered whose first-visit XP the server hasn't heard of yet:
 * a visit made before sign-in or while offline is sent on a later flush. */
const unreported = new Set<RoomId>();
let flushing = false;

export function queueVisit(room: RoomId): void {
  unreported.add(room);
}

/** Sends queued first visits, including ones queued while it runs. Only a
 * final refusal (a place the server doesn't count, or already counted) drops
 * a visit; a dead network, a rate limit or a server error keeps it queued
 * for the next flush. */
export async function flushVisits(adopt: Adopt): Promise<void> {
  const session = onlineSession();
  const id = current();
  if (!session || !id || flushing) return;
  flushing = true;
  try {
    for (
      let room = unreported.values().next().value;
      room !== undefined;
      room = unreported.values().next().value
    ) {
      const visiting = room;
      const result = await forAccount(id, () =>
        session.progress.visit(visiting),
      );
      if (current() !== id) return;
      if (result.ok) adopt(result.value);
      else if (isTransient(result)) return;
      unreported.delete(room);
    }
  } finally {
    flushing = false;
  }
}

/** A title picked on the name tag. A refusal (the server's XP hasn't earned
 * it) falls back to the server's own title. */
export async function reportTitle(
  title: string | null,
  adopt: Adopt,
): Promise<void> {
  const session = onlineSession();
  const id = current();
  if (!session || !id) return;
  const result = await forAccount(id, () => session.progress.setTitle(title));
  if (current() !== id) return;
  if (result.ok) return adopt(result.value);
  if (result.status !== 422) return;
  const own = await forAccount(id, () => session.progress.progress());
  if (own.ok && current() === id) adopt(own.value);
}
