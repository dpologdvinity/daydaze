// What the park band plays: a public-domain tune from the Karaoke Loft's
// songbook (karaokeSongs.ts) arranged for a brass-and-drum march band as
// timed events, in beats from the tune's start: the lead line, a tuba root on
// the strong beats and chord stabs on the others (oom-pah), with a kick on the
// tuba beats and a snare on the stabs. Pure; src/audio/parkBand.ts voices the
// events.
import {
  bandPlan,
  parseMelody,
  songById,
  type KaraokeSong,
} from "../karaokeSongs.ts";

export type BandEvent = {
  /** Beats from the tune's first beat. */
  beat: number;
  part: "lead" | "bass" | "chord" | "kick" | "snare";
  /** MIDI pitches (one for lead and bass, a triad for a chord, none for drums). */
  midi: readonly number[];
  /** Length in beats. */
  beats: number;
};

export type Tune = {
  song: KaraokeSong;
  events: readonly BandEvent[];
  /** The tune's length in beats and seconds (the melody's, plus a bar's tail). */
  beats: number;
  seconds: number;
};

/** MIDI of the lowest note with pitch class `pc` at or above `floor`. */
const above = (pc: number, floor: number) => floor + ((pc - floor + 120) % 12);

/** Each tune is played through this many times (a verse and a repeat). */
export const REPEATS = 2;

/** Arranges `song` for the band. */
export function arrange(song: KaraokeSong): Tune {
  const melody = parseMelody(song.melody);
  const plan = bandPlan(song);
  const tokens = song.melody.trim().split(/\s+/);
  const total = tokens.reduce((t, tok) => t + Number(tok.split("/")[1]), 0);
  const events: BandEvent[] = melody.map((n, i) => {
    const next = melody[i + 1]?.beat ?? total;
    return {
      beat: n.beat,
      part: "lead",
      midi: [n.midi],
      beats: Math.min(2, Math.max(0.25, next - n.beat)) * 0.95,
    };
  });
  const bars = Math.max(1, Math.ceil((total - plan.pickup) / plan.beatsPerBar));
  const strong = (k: number) =>
    k === 0 ||
    (plan.beatsPerBar === 4 && k === 2) ||
    (plan.beatsPerBar === 6 && k === 3);
  for (let bar = 0; bar < bars; bar++) {
    const chord = plan.chords[bar] ?? plan.chords[0] ?? [0, 4, 7];
    for (let k = 0; k < plan.beatsPerBar; k++) {
      const beat = plan.pickup + bar * plan.beatsPerBar + k;
      if (beat >= total) break;
      if (strong(k)) {
        events.push({
          beat,
          part: "bass",
          midi: [above(chord[0] ?? 0, 36)],
          beats: 0.9,
        });
        events.push({ beat, part: "kick", midi: [], beats: 0 });
      } else {
        events.push({
          beat,
          part: "chord",
          midi: chord.map((pc) => above(pc, 55)),
          beats: 0.5,
        });
        events.push({ beat, part: "snare", midi: [], beats: 0 });
      }
    }
  }
  // a repeat starts a whole number of bars on, so the oom-pah stays in step
  const span = bars * plan.beatsPerBar;
  const once = [...events];
  for (let r = 1; r < REPEATS; r++)
    for (const e of once) events.push({ ...e, beat: e.beat + r * span });
  events.sort((a, b) => a.beat - b.beat);
  const beats = span * REPEATS + plan.beatsPerBar;
  return { song, events, beats, seconds: (beats * 60) / song.bpm };
}

/** The tune with songbook id `id` (throws on a typo, so a test catches it). */
export function tuneById(id: string): Tune {
  const song = songById(id);
  if (!song) throw new Error(`no song ${id}`);
  return arrange(song);
}
