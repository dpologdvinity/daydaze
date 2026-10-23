import { useEffect, useState, type JSX } from "react";
import {
  FISH,
  fishAt,
  paradeSeconds,
  roundOf,
  ROUNDS,
  scoreAnswer,
} from "../../../game/reefSpotter.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";
import { useNow } from "../shared/useNow.ts";

type Phase = "off" | "watching" | "asking" | "over";

const reef = createStore({
  phase: "off" as Phase,
  seed: 1,
  round: 0,
  /** performance.now() the parade began. */
  since: 0,
  score: 0,
  last: "",
});

const fish = (id: string) => FISH.find((f) => f.id === id);

function start(now: number) {
  reef.set({
    phase: "watching",
    seed: Math.floor(now) % 100_000,
    round: 0,
    since: now,
    score: 0,
    last: "",
  });
}

function answer(n: number) {
  const s = reef.get();
  const round = roundOf(s.seed, s.round);
  const got = scoreAnswer(round, n);
  const score = s.score + got;
  const last = `${got === 20 ? "Exactly!" : got ? "So close!" : "Not quite."} ${round.count} ${fish(round.ask)?.label ?? ""} went by.`;
  if (s.round + 1 >= ROUNDS) {
    reef.set({ phase: "over", score, last });
    award("reef", score);
  } else
    reef.set({
      phase: "watching",
      round: s.round + 1,
      since: performance.now(),
      score,
      last,
    });
}

/** Reef Spotter: watch the reef window, then say how many of one kind
 * swam by. */
export function ReefPanel(): JSX.Element {
  const s = reef.use();
  const now = useNow(s.phase === "watching");
  const [guess, setGuess] = useState(1);
  // the parade over, the guide asks
  useEffect(() => {
    const cur = reef.get();
    if (cur.phase !== "watching") return;
    const parade = paradeSeconds(roundOf(cur.seed, cur.round));
    if ((now - cur.since) / 1000 > parade + 0.3) reef.set({ phase: "asking" });
  }, [now]);
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Reef Spotter">
        <p className="game-call">
          Fish swim past the reef window one at a time. Keep count: the guide
          will ask how many of one kind went by. Five rounds, each quicker.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Watch the reef
        </button>
      </section>
    );
  const round = roundOf(s.seed, s.round);
  const t = (now - s.since) / 1000;
  const swimming = s.phase === "watching" ? fishAt(round, t) : null;
  return (
    <section className="game-panel" aria-label="Reef Spotter">
      <p className="game-score" aria-label="Score">
        <span>{s.score} points</span>
        <span>
          Round {Math.min(s.round + 1, ROUNDS)}/{ROUNDS}
        </span>
      </p>
      {s.last && <p className="game-call">{s.last}</p>}
      {s.phase === "watching" && (
        <p className="reef-window" aria-label="Reef window">
          {swimming ? (
            <span
              // each fish its own key, so a repeat still swims in fresh
              key={Math.floor(t / round.each)}
              style={{ animationDuration: `${round.each}s` }}
              role="img"
              aria-label={fish(swimming)?.label}
            >
              {fish(swimming)?.emoji}
            </span>
          ) : (
            "…"
          )}
        </p>
      )}
      {s.phase === "asking" && (
        <form
          className="game-row"
          onSubmit={(e) => {
            e.preventDefault();
            answer(guess);
            setGuess(1);
          }}
        >
          <label>
            How many {fish(round.ask)?.label}?{" "}
            <input
              type="number"
              min={0}
              max={30}
              value={guess}
              onChange={(e) => setGuess(Number(e.target.value) || 0)}
            />
          </label>
          <button type="submit" className="game-main">
            Answer
          </button>
        </form>
      )}
      {s.phase === "over" && (
        <p className="game-call" role="status">
          Dive over: {s.score} points.
        </p>
      )}
      <button type="button" onClick={() => reef.set({ phase: "off" })}>
        {s.phase === "over" ? "Done" : "Stop"}
      </button>
    </section>
  );
}
