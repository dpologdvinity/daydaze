// The clock dancers share (game/dance/sync.ts): the club's beat clock while
// music plays, the wall clock otherwise. It never starts audio of its own.

import { peekSharedJukeboxController } from "../../audio/proceduralJukebox.ts";
import type { Tempo } from "../../game/dance/sync.ts";

/** Now, and the track's grid when its audio clock is running (else null). */
export function danceClock(): { now: number; tempo: Tempo | null } {
  const jukebox = peekSharedJukeboxController();
  const audio = jukebox?.audioTime() ?? null;
  const tempo = jukebox?.currentTempo() ?? null;
  return audio !== null && tempo
    ? { now: audio, tempo: { bpm: tempo.bpm, startedAt: tempo.startedAt } }
    : { now: Date.now() / 1000, tempo: null };
}
