import { useEffect, useRef, useState } from "react";
import { payoutFor, type PayGrade } from "../../game/wallet.ts";
import { Dialog } from "../Dialog.tsx";
import {
  answer,
  correct,
  current,
  grade,
  newGame,
  over,
  ROUND,
  SECONDS,
  type Game,
} from "./engine.ts";
import "./Trivia.css";

type Result = { grade: PayGrade; score: number };
type Props = {
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
};

/** How long the right answer shows after each pick, ms. */
const REVEAL_MS = 1400;

/**
 * Throwback Trivia at Player 2: ten questions on 2000s pop culture, four
 * answers each, fifteen seconds a question. The cabinet pays on how many
 * you get right.
 */
export function Trivia({ onClose }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [left, setLeft] = useState(SECONDS);
  /** The pick being revealed (right answer lit), or null while asking. */
  const [shown, setShown] = useState<number | null>(null);
  const best = useRef<Result | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!game) startRef.current?.focus();
  }, [game]);

  const card = game ? current(game) : null;
  const done = game !== null && over(game);

  // the question's clock: runs out to a blank answer
  useEffect(() => {
    if (!game || done || shown !== null) return;
    setLeft(SECONDS);
    const started = Date.now();
    const id = window.setInterval(() => {
      const remain = SECONDS - (Date.now() - started) / 1000;
      setLeft(Math.max(0, Math.ceil(remain)));
      if (remain <= 0) pick(-1);
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, shown, done]);

  const pick = (choice: number) => {
    if (!game || shown !== null || done) return;
    setShown(choice);
    window.setTimeout(() => {
      const next = answer(game, choice);
      setShown(null);
      setGame(next);
      if (over(next)) {
        const r = { score: correct(next), grade: grade(correct(next)) };
        if (!best.current || payoutFor(r.grade) > payoutFor(best.current.grade))
          best.current = r;
      }
    }, REVEAL_MS);
  };

  const start = () => setGame(newGame(Math.floor(Math.random() * 1e9)));

  return (
    <Dialog
      title="Throwback Trivia"
      subtitle="Ten questions from the 2000s."
      className="tt"
      onClose={() => onClose(best.current)}
    >
      {!game && (
        <section className="tt-intro">
          <p>
            Ten questions on the music, telly, games and internet of the 2000s.
            Fifteen seconds each.
          </p>
          <button
            ref={startRef}
            type="button"
            className="tt-go"
            onClick={start}
          >
            Play
          </button>
        </section>
      )}
      {game && card && (
        <section className="tt-play">
          <p className="tt-hud">
            <span>
              Question {game.picks.length + 1} of {ROUND}
            </span>
            <span aria-label={`${left} seconds left`}>{left}s</span>
          </p>
          <p className="tt-q" aria-live="polite">
            {card.q}
          </p>
          <div className="tt-answers">
            {card.answers.map((a, i) => (
              <button
                key={a}
                type="button"
                className="tt-answer"
                data-state={
                  shown === null
                    ? undefined
                    : i === card.right
                      ? "right"
                      : i === shown
                        ? "wrong"
                        : undefined
                }
                disabled={shown !== null}
                onClick={() => pick(i)}
              >
                {a}
              </button>
            ))}
          </div>
        </section>
      )}
      {done && game && (
        <section className="tt-result" aria-live="polite">
          <p className="tt-grade">{grade(correct(game))}</p>
          <p>
            {correct(game)} of {ROUND} right. The arcade pays{" "}
            <strong>{payoutFor(grade(correct(game)))} coins</strong>.
          </p>
          <div className="tt-actions">
            <button type="button" className="tt-go" onClick={start}>
              Play again
            </button>
            <button type="button" onClick={() => onClose(best.current)}>
              Collect and leave
            </button>
          </div>
        </section>
      )}
    </Dialog>
  );
}
