// The Karaoke Loft's song session. You pick a real song from the songbook
// (src/game/karaokeSongs.ts); when you reach the mic its own band takes over
// from the room's music, at the song's tempo and on its chords, and the chart
// is cut on the band's clock (the audio clock), so notes, music and grades
// never drift. With no audio at all the song runs on the wall clock. The
// room's track comes back when the song ends or you put the mic down.

import {
  duetTurn,
  partScore,
  type DuetRole,
} from "../../../game/karaokeDuet.ts";
import { getSharedJukeboxController } from "../../../audio/proceduralJukebox.ts";
import {
  LEAD_IN,
  sing,
  songOver,
  songScore,
  streak,
  type Note,
  type Song,
} from "../../../game/karaokeGame.ts";
import {
  SONGS,
  bandPlan,
  songById,
  songChart,
  type KaraokeSong,
} from "../../../game/karaokeSongs.ts";
import { gradeSwing, type Swing } from "../../../game/tennis.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** Off, counting in (waiting for the band's tempo), singing, or done. */
export type Phase = "off" | "cueing" | "singing" | "over";

/** The song you'll sing next (a random one to start). */
export const songPick = createStore({
  id: SONGS[Math.floor(Math.random() * SONGS.length)]?.id ?? "saints",
});

/** The song a session sings: the duet's, else your pick. */
function songOf(duetSong?: string): KaraokeSong | undefined {
  return songById(duetSong ?? songPick.get().id) ?? SONGS[0];
}

/** How long to wait for audio before singing to the wall clock, s. */
const CUE_WAIT = 1.5;
/** The longest the count-in waits for the singer to reach the mic, s (a
 * paused 3D view never walks her there). */
const WALK_WAIT = 9;
/** A note nobody sang counts as missed this long after the line, s. */
const MISS_AFTER = 0.4;
/** Every this many right notes in a row, the crowd cheers. */
export const CHEER_STREAK = 4;

const OFF = {
  phase: "off" as Phase,
  notes: [] as Note[],
  song: [] as Song,
  /** Which clock the chart is on. */
  clock: "wall" as "audio" | "wall",
  /** Wall seconds the count-in began, or the song ended. */
  since: 0,
  last: null as { swing: Swing; lane: boolean } | null,
  /** Wall seconds the crowd last started cheering. */
  cheerAt: Number.NEGATIVE_INFINITY,
  /** The singer has reached the mic (the stage scene says so). */
  atMic: false,
  /** Singing a duet with another player (karaokeDuet.ts): your role, the
   * shared song, and both parts' scores once each is sung. */
  duet: null as {
    role: DuetRole;
    partner: { id: string; name: string };
    song: string;
    mine: number | null;
    theirs: number | null;
  } | null,
};

/** Set by the online duet module: sends your part when the song ends. */
export const duetHooks: { done: ((score: number) => void) | null } = {
  done: null,
};

export const karaoke = createStore(OFF);

const wall = () => performance.now() / 1000;
// the last audio time seen, for a context that suspends mid-song
let lastAudio = 0;

/** The song clock, seconds: the audio clock if the chart is on it. */
export function songNow(): number {
  if (karaoke.get().clock === "wall") return wall();
  const t = getSharedJukeboxController().audioTime();
  if (t !== null) lastAudio = t;
  return lastAudio;
}

/** Steps up to the mic: the band counts you in. */
export function start() {
  karaoke.set({ ...OFF, phase: "cueing", since: wall() });
  tick();
}

export function leave() {
  getSharedJukeboxController().endSong();
  karaoke.set(OFF);
}

/** Starts a duet: the same count-in, on the shared song, your lines only. */
export function startDuet(
  role: DuetRole,
  partner: { id: string; name: string },
  song: string,
) {
  karaoke.set({
    ...OFF,
    phase: "cueing",
    since: wall(),
    duet: { role, partner, song, mine: null, theirs: null },
  });
  tick();
}

/** The partner's part arrived. */
export function partnerScored(score: number) {
  const duet = karaoke.get().duet;
  if (duet) karaoke.set({ duet: { ...duet, theirs: score } });
}

/** Whether the note at `index` is yours to sing (always, solo). */
export function mine(index: number): boolean {
  const duet = karaoke.get().duet;
  return !duet || duetTurn(index) === duet.role;
}

/** The stage scene: the singer has walked up to the mic. */
export function reachedMic() {
  if (karaoke.get().phase !== "off") karaoke.set({ atMic: true });
}

/** The note you're on, or none once the song is sung. */
export function nextNote(): Note | null {
  const s = karaoke.get();
  return s.notes[s.song.length] ?? null;
}

function take(swing: Swing, lane: boolean) {
  const total = karaoke.get().notes.length;
  const song = sing(karaoke.get().song, swing, lane, total);
  const run = streak(song);
  karaoke.set({
    song,
    last: { swing, lane },
    ...(run > 0 && run % CHEER_STREAK === 0 ? { cheerAt: wall() } : {}),
  });
  if (songOver(song, total)) {
    getSharedJukeboxController().endSong();
    karaoke.set({ phase: "over", since: wall() });
    const duet = karaoke.get().duet;
    if (duet) {
      // your half, doubled for the prize desk so grades match a solo song
      const part = partScore(song, duet.role);
      karaoke.set({ duet: { ...duet, mine: part } });
      duetHooks.done?.(part);
      award("karaoke", part * 2);
    } else award("karaoke", songScore(song));
  }
}

/** Sing on `lane` (0 low, 1 mid, 2 high): graded against the next note. */
export function singOn(lane: number) {
  if (karaoke.get().phase !== "singing") return;
  const note = nextNote();
  if (!note) return;
  // in a duet, your partner's lines aren't yours to sing
  if (!mine(karaoke.get().song.length)) return;
  const swing = gradeSwing(songNow() - note.at);
  const onTime = swing === "perfect" || swing === "good";
  const right = lane === note.lane;
  getSharedJukeboxController().playPitch(note.pitch ?? 60, right && onTime);
  take(swing, right);
}

/** Moves the song on: cuts the chart once the band's tempo is known, and
 * lets a note nobody sang go by. Safe to call every frame. */
export function tick() {
  const s = karaoke.get();
  if (s.phase === "cueing") {
    const waited = wall() - s.since;
    if (!s.atMic && waited < WALK_WAIT) return;
    const jukebox = getSharedJukeboxController();
    const song = songOf(s.duet?.song);
    if (!song) return;
    // the song's own band, counting in LEAD_IN beats before the melody
    const now = jukebox.audioTime();
    const band = { ...bandPlan(song), countIn: LEAD_IN };
    const tempo =
      now !== null && jukebox.playSong(band, song.bpm)
        ? jukebox.currentTempo()
        : null;
    if (tempo && now !== null) {
      lastAudio = now;
      karaoke.set({
        phase: "singing",
        clock: "audio",
        notes: songChart(song, tempo.bpm, tempo.startedAt),
      });
    } else if (waited > CUE_WAIT) {
      const t = wall();
      karaoke.set({
        phase: "singing",
        clock: "wall",
        notes: songChart(song, song.bpm, t),
      });
    }
    return;
  }
  const note = nextNote();
  if (s.phase !== "singing" || !note) return;
  // the partner's line goes by as they sing it (scored on their side)
  if (!mine(s.song.length)) {
    if (songNow() >= note.at) take("perfect", true);
    return;
  }
  if (songNow() - note.at > MISS_AFTER) take("late", false);
}
