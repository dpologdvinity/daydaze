// Dancers doing the same dance near each other move as one: every doll that
// starts a dance clip takes its place in the loop from a shared clock, so a
// crowd's line dance (or two players who pick the same move) lands together.
// The clock is the club's beat clock when music plays (a loop turns over on
// the track's first beat) and the wall clock otherwise. Pure.

/** The playing track's grid: its tempo and the audio second its first beat fell on. */
export type Tempo = { bpm: number; startedAt: number };

/** Seconds of the loop to start at, so every doll playing a clip of `period`
 * seconds at `now` (audio seconds with a tempo, wall seconds without) is at the
 * same place in it. With a tempo the loop's first frame falls on the track's
 * first beat and again every `period`; always inside [0, period). */
export function syncOffset(
  now: number,
  tempo: Tempo | null,
  period: number,
): number {
  if (!(period > 0)) return 0;
  const phase = (now - (tempo?.startedAt ?? 0)) % period;
  return phase < 0 ? phase + period : phase;
}
