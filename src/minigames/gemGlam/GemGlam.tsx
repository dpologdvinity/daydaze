// Gem Glam, the arcade's match-three: pick a difficulty, swap neighboring gems
// until the moves run out, and get graded on score. The board rules live in
// engine.ts, which mutates the Game in place (hence the redraw counter). The
// best grade of the visit is reported on close.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { payoutFor, type PayGrade } from "../../game/wallet.ts";
import { Dialog } from "../Dialog.tsx";
import {
  LEVELS,
  SIZE,
  TARGET,
  grade,
  newGame,
  over,
  play,
  type Cell,
  type Game,
  type Gem,
  type Level,
} from "./engine.ts";
import "./GemGlam.css";

type Result = { grade: PayGrade; score: number; level: Level };
type Props = {
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
};

const NAMES = [
  "Pink heart",
  "Gold star",
  "Aqua diamond",
  "Violet moon",
  "Lime drop",
  "Coral bow",
];

function GemArt({ gem }: { gem: Gem }) {
  const shapes = [
    <path key="h" d="M20 34 6 20a8 8 0 0 1 14-10 8 8 0 0 1 14 10z" />,
    <path key="s" d="M20 4l5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" />,
    <path key="d" d="M20 4 34 18 20 36 6 18z" />,
    <path key="m" d="M26 6a14 14 0 1 0 8 22A11 11 0 0 1 26 6z" />,
    <path
      key="l"
      d="M20 4c8 10 12 16 12 21a12 12 0 0 1-24 0c0-5 4-11 12-21z"
    />,
    <path
      key="b"
      d="M20 18 6 9v20zm0 0 14-9v20zm-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"
    />,
  ];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <g className={`gg-shape gg-c${gem.color}`}>{shapes[gem.color]}</g>
      {gem.special === "sparkle" && (
        <path className="gg-sparkle" d="M20 8v24M8 20h24" />
      )}
      {gem.special === "disco" && (
        <circle className="gg-disco" cx="20" cy="20" r="15" />
      )}
    </svg>
  );
}

function Board({
  game,
  onSwap,
}: {
  game: Game;
  onSwap: (a: Cell, b: Cell) => void;
}) {
  const [picked, setPicked] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>([0, 0]);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    refs.current.get(`${focus[0]},${focus[1]}`)?.focus({ preventScroll: true });
  }, [focus]);

  const choose = (cell: Cell) => {
    if (!picked) return setPicked(cell);
    if (picked[0] === cell[0] && picked[1] === cell[1]) return setPicked(null);
    onSwap(picked, cell);
    setPicked(null);
  };

  const onKey = (e: KeyboardEvent, [r, c]: Cell) => {
    const move: Record<string, Cell> = {
      ArrowUp: [Math.max(0, r - 1), c],
      ArrowDown: [Math.min(SIZE - 1, r + 1), c],
      ArrowLeft: [r, Math.max(0, c - 1)],
      ArrowRight: [r, Math.min(SIZE - 1, c + 1)],
    };
    const to = move[e.key];
    if (!to) return;
    e.preventDefault();
    setFocus(to);
  };

  const gems: { gem: Gem; cell: Cell }[] = [];
  game.board.forEach((row, r) =>
    row.forEach((gem, c) => {
      if (gem) gems.push({ gem, cell: [r, c] });
    }),
  );
  // stable DOM order by id, so a gem keeps its element as it moves
  gems.sort((a, b) => a.gem.id - b.gem.id);

  return (
    <div className="gg-board" role="group" aria-label="Gem board">
      {gems.map(({ gem, cell: [r, c] }) => {
        const isPicked = picked?.[0] === r && picked?.[1] === c;
        return (
          <button
            key={gem.id}
            ref={(el) => {
              if (el) refs.current.set(`${r},${c}`, el);
            }}
            type="button"
            className="gg-gem"
            style={{
              transform: `translate(${c * 100}%, ${r * 100}%)`,
            }}
            tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
            aria-pressed={isPicked}
            aria-label={`${NAMES[gem.color]}${gem.special ? ` ${gem.special} gem` : ""}, row ${r + 1}, column ${c + 1}`}
            onFocus={() => setFocus([r, c])}
            onKeyDown={(e) => onKey(e, [r, c])}
            onClick={() => choose([r, c])}
          >
            <GemArt gem={gem} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Gem Glam dialog. The board is keyboard playable (arrows move focus, Enter
 * picks and swaps). `onClose` gets the best-paying result of the visit, or null
 * if no game was finished.
 */
export function GemGlam({ onClose }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [level, setLevel] = useState<Level>("easy");
  const [game, setGame] = useState<Game | null>(null);
  const [, redraw] = useState(0);
  const [note, setNote] = useState("");
  const best = useRef<Result | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === "intro") startRef.current?.focus();
    if (phase === "done") againRef.current?.focus();
  }, [phase]);

  const start = () => {
    setGame(newGame(level, Math.floor(Math.random() * 1e9)));
    setNote("Swap two neighboring gems to make a line of three.");
    setPhase("play");
  };

  const swap = (a: Cell, b: Cell) => {
    if (!game) return;
    const steps = play(game, a, b);
    if (!steps) {
      setNote("No match there. Try another swap.");
      return;
    }
    const points = steps.reduce((s, x) => s + x.points, 0);
    setNote(
      steps.length > 1 ? `Cascade x${steps.length}! +${points}` : `+${points}`,
    );
    redraw((n) => n + 1);
    if (over(game)) {
      const r: Result = {
        score: game.score,
        level,
        grade: grade(level, game.score),
      };
      if (!best.current || payoutFor(r.grade) > payoutFor(best.current.grade))
        best.current = r;
      setPhase("done");
    }
  };

  const result = useMemo(
    () => (game && phase === "done" ? grade(level, game.score) : null),
    [game, level, phase],
  );

  return (
    <Dialog
      title="Gem Glam"
      subtitle="The arcade's sparkliest match-three."
      className="gg"
      onClose={() => onClose(best.current)}
    >
      {phase === "intro" && (
        <section className="gg-intro">
          <p>
            Match three or more. Four in a line leaves a sparkle gem that clears
            its row and column; five leaves a disco gem that clears a whole
            color.
          </p>
          <div className="gg-levels" role="radiogroup" aria-label="Difficulty">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={l.id === level}
                onClick={() => setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            ref={startRef}
            type="button"
            className="gg-go"
            onClick={start}
          >
            Play
          </button>
        </section>
      )}
      {phase === "play" && game && (
        <section className="gg-play">
          <div className="gg-hud">
            <span className="gg-score">{game.score}</span>
            <span>target {TARGET[level]}</span>
            <span>{game.moves} moves</span>
          </div>
          <Board game={game} onSwap={swap} />
          <p className="gg-note" aria-live="polite">
            {note}
          </p>
        </section>
      )}
      {phase === "done" && game && result && (
        <section className="gg-result" aria-live="polite">
          <p className="gg-grade">{result}</p>
          <p>
            {game.score} points against a target of {TARGET[level]}. The arcade
            pays <strong>{payoutFor(result)} coins</strong>.
          </p>
          <div className="gg-actions">
            <button
              ref={againRef}
              type="button"
              className="gg-go"
              onClick={start}
            >
              Play again
            </button>
            <button type="button" onClick={() => setPhase("intro")}>
              Change difficulty
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
