import { playShellNote } from "../../../audio/worldSounds.ts";
import {
  chart,
  sing,
  songOver,
  songScore,
  type Note,
  type Song,
} from "../../../game/karaokeGame.ts";
import { gradeSwing, type Swing } from "../../../game/tennis.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A song at the mic: notes come down three lanes; sing each on its lane. */
export type Phase = "off" | "singing" | "over";

const OFF = {
  phase: "off" as Phase,
  notes: [] as Note[],
  song: [] as Song,
  /** performance.now() the backing track started. */
  since: 0,
  last: null as { swing: Swing; lane: boolean } | null,
};

export const karaoke = createStore(OFF);

export function start(now: number) {
  karaoke.set({
    ...OFF,
    phase: "singing",
    notes: chart(Math.floor(Math.random() * 1e9)),
    since: now,
  });
}

export const leave = () => karaoke.set(OFF);

/** The note you're on, and when it reaches the line. */
export function nextNote(): { note: Note; due: number } | null {
  const s = karaoke.get();
  const note = s.notes[s.song.length];
  return note ? { note, due: s.since + note.at * 1000 } : null;
}

function take(now: number, swing: Swing, lane: boolean) {
  const song = sing(karaoke.get().song, swing, lane);
  karaoke.set({ song, last: { swing, lane } });
  if (songOver(song)) {
    karaoke.set({ phase: "over", since: now });
    award("karaoke", songScore(song));
  }
}

/** Sing on `lane` (0 low, 1 mid, 2 high). */
export function singOn(lane: number, now: number) {
  if (karaoke.get().phase !== "singing") return;
  const next = nextNote();
  if (!next) return;
  const swing = gradeSwing((now - next.due) / 1000);
  const right =
    lane === next.note.lane && swing !== "early" && swing !== "late";
  playShellNote(right ? lane : -1);
  take(now, swing, lane === next.note.lane);
}

/** A note nobody sang goes by. */
export function tick(now: number) {
  const next = nextNote();
  if (karaoke.get().phase === "singing" && next && now - next.due > 400)
    take(now, "late", false);
}
