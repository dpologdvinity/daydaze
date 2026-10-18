import type { JSX } from "react";
import {
  ROUND_SECONDS,
  roundScore,
  type Shot,
} from "../../../game/laserTag.ts";
import { fire, leave, RIVAL_NAMES, start, tag } from "./session.ts";

const SAID: Record<Shot, string> = {
  tag: "Tagged!",
  miss: "She ducked: wait till she pops out.",
  blocked: "Blocked by cover.",
  recharging: "Recharging…",
};

/** A 60-second round: tap a rival (or her button) while she's out in the
 * open to tag her; keep cover between you when she fires. */
export function LaserTagPanel(): JSX.Element {
  const s = tag.use();
  const { round } = s;
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Laser tag">
        <p className="game-call">
          Sixty seconds. Tag a rival when she pops out from cover; she fires
          back, so keep cover between you.
        </p>
        <button type="button" className="game-main" onClick={start}>
          Suit up
        </button>
      </section>
    );
  const stunned = round.t < round.stunUntil;
  return (
    <section className="game-panel" aria-label="Laser tag">
      <p className="game-score" aria-label="Score">
        <span>{roundScore(round)} points</span>
        <span>{Math.ceil(ROUND_SECONDS - round.t)}s</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Round over: ${round.tags} tags, hit ${round.hits} times`
          : stunned
            ? "You're hit! Blaster's down a moment."
            : s.shot && round.t - s.shot.t < 1.2
              ? SAID[s.shot.result]
              : `Tags ${round.tags} · Hits ${round.hits}`}
      </p>
      {s.phase === "playing" ? (
        <div className="venue-games" role="group" aria-label="Fire at">
          {RIVAL_NAMES.map((name, i) => (
            <button key={name} type="button" onClick={() => fire(i)}>
              Fire at {name}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="game-main" onClick={start}>
          Play again
        </button>
      )}
      <button type="button" onClick={leave}>
        Done
      </button>
    </section>
  );
}
