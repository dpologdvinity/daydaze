// Reports what an account earns to the server, which owns its XP and title.
// The local save is paid first, so the game works offline and a failed call
// never loses the result; a reply then replaces the local XP and title with
// the server's. Guests never call (their progress stays on the device).
import type { PrizeGame } from "../../game/prizes.ts";
import type { RoomId } from "../../game/rooms.ts";
import { mayPush } from "../../net/client/saveSync.ts";
import { retryBusy, scoreNote } from "../../net/client/progressSync.ts";
import type { ServerProgress } from "../../net/progress.ts";
import { prizeDesk } from "../ui/prizeDesk.ts";
import { account } from "./account.ts";
import { onlineSession } from "./session.ts";

/** Puts the server's XP and title into the local save. */
export type Adopt = (server: Pick<ServerProgress, "xp" | "title">) => void;

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** An account whose own save has loaded: only then is the server row ours to
 * write to, and the local numbers safe to replace. */
const signedIn = () => {
  const { me, cloudReady } = account.get();
  return mayPush(me, cloudReady);
};

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
  if (!session || !signedIn()) return;
  const result = await retryBusy(
    () => session.progress.submitScore(game, score),
    sleep,
  );
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

/** Sends queued first visits. A refusal (a place the server doesn't count, or
 * already counted) drops the visit; a dead network or rate limit keeps it. */
export async function flushVisits(adopt: Adopt): Promise<void> {
  const session = onlineSession();
  if (!session || !signedIn() || flushing) return;
  flushing = true;
  try {
    for (const room of [...unreported]) {
      const result = await retryBusy(() => session.progress.visit(room), sleep);
      if (result.ok) adopt(result.value);
      else if (result.status === 0 || result.status === 429) return;
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
  if (!session || !signedIn()) return;
  const result = await retryBusy(() => session.progress.setTitle(title), sleep);
  if (result.ok) return adopt(result.value);
  if (result.status !== 422) return;
  const own = await session.progress.progress();
  if (own.ok) adopt(own.value);
}
