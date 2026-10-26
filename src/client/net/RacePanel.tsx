// Races with a friend on screen: their ask to answer, your wait, and the
// result once you've both crossed the line. Asks go out from a friend's card
// (PeerCard) in the Speedway. Listens to the relay while mounted.

import { useEffect, type JSX } from "react";
import { TRACKS } from "../../game/speedway/track.ts";
import {
  answerRace,
  listenForRaces,
  raceFriend,
  raceResult,
} from "./raceFriend.ts";

const trackName = (id: string) =>
  TRACKS.find((t) => t.id === id)?.name ?? "the track";

export function RacePanel(): JSX.Element | null {
  const s = raceFriend.use();
  useEffect(() => listenForRaces(), []);
  if (s.ask)
    return (
      <section className="game-panel" aria-label="Race invite">
        <p className="game-call">
          {s.ask.name} wants to race you on {trackName(s.ask.track)}.
        </p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answerRace(true)}
          >
            Race!
          </button>
          <button type="button" onClick={() => answerRace(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  const result = raceResult(s);
  if (s.rival)
    return (
      <p className="notice" role="status">
        {result ??
          (s.mine !== null
            ? `Finished! Waiting for ${s.rival.name}…`
            : `Racing ${s.rival.name}: three laps, fastest wins.`)}
      </p>
    );
  if (s.asked)
    return (
      <p className="notice" role="status">
        Waiting for {s.asked.name} to answer…
      </p>
    );
  return s.note ? (
    <p className="notice" role="status">
      {s.note}
    </p>
  ) : null;
}
