import { playShellNote } from "../../../audio/worldSounds.ts";
import { current, newSong, sing, type Song } from "../../../game/sirenSong.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/**
 * Siren Song: the mermaids sing a phrase on the shells (listen), then you
 * sing it back (sing). Each round is one note longer; a wrong note ends
 * the song.
 */
export type Phase = "off" | "listen" | "sing" | "over";

/** The shells' colors, pink, blue, gold and violet. */
export const SHELL_COLORS = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#b48cff"];

/** Milliseconds per note while the mermaids sing, and the pause first. */
const NOTE_MS = 650;
const LEAD_MS = 700;

const OFF = {
  phase: "off" as Phase,
  song: newSong(0) as Song,
  since: 0,
  /** The shell lit right now, or -1. */
  lit: -1,
  /** When the lit shell goes dark again. */
  litUntil: 0,
};

export const siren = createStore(OFF);

function listen(now: number, song: Song) {
  siren.set({ phase: "listen", song, since: now + LEAD_MS, lit: -1 });
}

export function start(now: number) {
  listen(now, newSong(Math.floor(Math.random() * 1e6)));
}

export function leave() {
  siren.set(OFF);
}

/** You sing shell `shell` (0..3). */
export function singShell(now: number, shell: number) {
  const s = siren.get();
  if (s.phase !== "sing") return;
  const { song, result } = sing(s.song, shell);
  if (result === "wrong") {
    playShellNote(-1);
    award("siren-song", song.rounds);
    siren.set({ phase: "over", song, lit: -1 });
    return;
  }
  playShellNote(shell);
  siren.set({ song, lit: shell, litUntil: now + 300 });
  if (result === "round") listen(now, song);
}

/** The scene calls this each frame: the mermaids' phrase, note by note. */
export function tick(now: number) {
  const s = siren.get();
  if (s.phase === "sing" || s.phase === "over") {
    if (s.lit >= 0 && now > s.litUntil) siren.set({ lit: -1 });
    return;
  }
  if (s.phase !== "listen" || now < s.since) return;
  const notes = current(s.song);
  const k = Math.floor((now - s.since) / NOTE_MS);
  if (k >= notes.length) {
    siren.set({ phase: "sing", lit: -1 });
    return;
  }
  const on = (now - s.since) % NOTE_MS < NOTE_MS * 0.7;
  const lit = on ? notes[k] : -1;
  if (lit !== s.lit) {
    if (lit >= 0) playShellNote(lit);
    siren.set({ lit });
  }
}
