// The Karaoke Loft's mic panel: the songbook to pick from, the score, the
// call and the three sing buttons (or J, K and L). The notes themselves come down the big screen on
// stage (./Stage.tsx). Also ticks the session from its own animation-frame
// clock, so the song runs even when the 3D view is paused.

import { ONLINE } from "../../net/online.ts";
import { answerDuet, duetAsk, listenForDuets } from "../../net/karaokeDuet.ts";
import { useEffect, type JSX } from "react";
import { LANES, songScore } from "../../../game/karaokeGame.ts";
import { partScore } from "../../../game/karaokeDuet.ts";
import {
  GENRES,
  SONGS,
  songById,
  type Genre,
} from "../../../game/karaokeSongs.ts";
import { typing, useNow } from "../shared/useNow.ts";
import {
  karaoke,
  leave,
  mine,
  singOn,
  songPick,
  start,
  tick,
} from "./session.ts";

const GENRE_NAMES: Record<Genre, string> = {
  classical: "Classical",
  folk: "Folk",
  country: "Country",
  gospel: "Gospel",
  jazz: "Jazz",
  ragtime: "Ragtime",
  "tin-pan-alley": "Tin Pan Alley",
  latin: "Latin",
  world: "Around the world",
  holiday: "Holiday",
  party: "Party",
};

/** The songbook: every song, by genre. */
function SongPicker(): JSX.Element {
  const { id } = songPick.use();
  const song = songById(id);
  return (
    <label className="song-pick">
      <span>Song</span>
      <select value={id} onChange={(e) => songPick.set({ id: e.target.value })}>
        {GENRES.map((genre) => (
          <optgroup key={genre} label={GENRE_NAMES[genre]}>
            {SONGS.filter((s) => s.genre === genre).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {song && <small>{song.credit} · public domain</small>}
    </label>
  );
}

const LANE_NAMES = ["Low", "Mid", "High"] as const;
const KEYS: Record<string, number> = { KeyJ: 0, KeyK: 1, KeyL: 2 };

const CALL = {
  perfect: "Perfect pitch!",
  good: "Nice",
  early: "Too early",
  late: "Missed it",
} as const;

/** The mic: the melody comes down three lanes; sing each one on time. */
export function KaraokePanel(): JSX.Element {
  const s = karaoke.use();
  // online duets: asks and answers arrive here, in the mic's own panel
  const ask = duetAsk.use();
  useEffect(() => (ONLINE ? listenForDuets() : undefined), []);
  const singing = s.phase === "singing";
  const live = singing || s.phase === "cueing";
  const now = useNow(live);
  useEffect(() => {
    if (live) tick();
  }, [now, live]);
  useEffect(() => {
    if (!singing) return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.repeat) return;
      const lane = KEYS[e.code];
      if (lane !== undefined) singOn(lane);
      else if (e.code === "Escape") leave();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [singing]);
  // a duet counts your lines only; the status says whose line it is
  const duet = s.duet;
  const score = duet ? partScore(s.song, duet.role) : songScore(s.song);
  const yours = mine(s.song.length);
  if (ask.ask && (s.phase === "off" || s.phase === "over"))
    return (
      <section className="game-panel" aria-label="Karaoke">
        <p className="game-call" role="status">
          {ask.ask.name} wants to sing{" "}
          {songById(ask.ask.song)?.title ?? "a song"} with you. You&apos;ll
          trade lines.
        </p>
        <div className="game-row" role="group" aria-label="Duet invite">
          <button
            type="button"
            className="game-main"
            onClick={() => answerDuet(true)}
          >
            Sing!
          </button>
          <button type="button" onClick={() => answerDuet(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Karaoke">
        {(ask.asked || ask.note) && (
          <p className="game-call" role="status">
            {ask.asked ? `Waiting for ${ask.asked.name} to answer…` : ask.note}
          </p>
        )}
        <p className="game-call">
          Pick a song and take the mic: sing each note on its lane, low to high,
          as it reaches the line (J, K, L).
        </p>
        <SongPicker />
        <button type="button" className="game-main" onClick={start}>
          Sing a song
        </button>
      </section>
    );
  return (
    <section className="game-panel" aria-label="Karaoke">
      <p className="game-score" aria-label="Score">
        <span>
          {score} points{duet ? ` · duet with ${duet.partner.name}` : ""}
        </span>
        <span>
          Note{" "}
          {Math.min(s.song.length + (singing ? 1 : 0), s.notes.length || 1)}/
          {s.notes.length || "…"}
        </span>
      </p>
      <p className="game-call">
        {songById(s.duet?.song ?? songPick.get().id)?.title}
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? duet
            ? duet.theirs === null
              ? `Your part: ${score}. Waiting for ${duet.partner.name}…`
              : `You ${score} · ${duet.partner.name} ${duet.theirs} · together ${score + duet.theirs}!`
            : `Song done: ${score} points`
          : s.phase === "cueing"
            ? "The band counts you in…"
            : duet && !yours
              ? `${duet.partner.name}'s line…`
              : s.last
                ? s.last.lane ||
                  !(s.last.swing === "perfect" || s.last.swing === "good")
                  ? CALL[s.last.swing]
                  : "Wrong note!"
                : "Here comes the first note…"}
      </p>
      {singing ? (
        <div className="game-row" role="group" aria-label="Sing">
          {Array.from({ length: LANES }, (_, lane) => (
            <button
              key={lane}
              type="button"
              className="game-main"
              onClick={() => singOn(lane)}
            >
              {LANE_NAMES[lane]}
            </button>
          ))}
        </div>
      ) : s.phase === "over" ? (
        <>
          <SongPicker />
          <button type="button" className="game-main" onClick={start}>
            Sing again
          </button>
        </>
      ) : null}
      <button type="button" onClick={leave}>
        Put the mic down
      </button>
    </section>
  );
}
