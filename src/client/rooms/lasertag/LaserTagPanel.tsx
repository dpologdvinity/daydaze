import type { JSX } from "react";
import {
  ROUND_SECONDS,
  roundScore,
  type Shot,
} from "../../../game/laserTag.ts";
import { laserTag, paintball, type TagGame } from "./session.ts";

const SAID: Record<Shot, string> = {
  tag: "Tagged!",
  miss: "She ducked: wait till she pops out.",
  blocked: "Blocked by cover.",
  recharging: "Reloading…",
};

/** A 60-second round: tap a rival (or her button) while she's out in the
 * open to tag her; keep cover between you when she fires. */
function TagPanel({
  game,
  label,
  intro,
  suitUp,
}: {
  game: TagGame;
  label: string;
  intro: string;
  suitUp: string;
}): JSX.Element {
  const s = game.store.use();
  const { round } = s;
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label={label}>
        <p className="game-call">{intro}</p>
        <button type="button" className="game-main" onClick={game.start}>
          {suitUp}
        </button>
      </section>
    );
  const stunned = round.t < round.stunUntil;
  return (
    <section className="game-panel" aria-label={label}>
      <p className="game-score" aria-label="Score">
        <span>{roundScore(round)} points</span>
        <span>{Math.ceil(ROUND_SECONDS - round.t)}s</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Round over: ${round.tags} tags, hit ${round.hits} times`
          : stunned
            ? "You're hit! Out for a moment."
            : s.shot && round.t - s.shot.t < 1.2
              ? SAID[s.shot.result]
              : `Tags ${round.tags} · Hits ${round.hits}`}
      </p>
      {s.phase === "playing" ? (
        <div className="venue-games" role="group" aria-label="Fire at">
          {game.names.map((name, i) => (
            <button key={name} type="button" onClick={() => game.fire(i)}>
              Fire at {name}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="game-main" onClick={game.start}>
          Play again
        </button>
      )}
      <button type="button" onClick={game.leave}>
        Done
      </button>
    </section>
  );
}

export function LaserTagPanel(): JSX.Element {
  return (
    <TagPanel
      game={laserTag}
      label="Laser tag"
      intro="Sixty seconds. Tag a rival when she pops out from cover; she fires back, so keep cover between you."
      suitUp="Suit up"
    />
  );
}

export function PaintballPanel(): JSX.Element {
  return (
    <TagPanel
      game={paintball}
      label="Paintball"
      intro="Sixty seconds of speedball. Mark a rival when she leans out of a bunker; she shoots back, so stay behind yours."
      suitUp="Gear up"
    />
  );
}
