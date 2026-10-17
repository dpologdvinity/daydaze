import { useEffect, useState, type JSX } from "react";
import {
  frameTotals,
  marks,
  position,
  THROW_LIMITS,
} from "../../../game/bowling.ts";
import {
  aimAt,
  leaveLane,
  nudge,
  powerAt,
  press,
  setHook,
  startGame,
  useLane,
} from "./session.ts";

const ACTION: Record<string, string> = {
  place: "Aim",
  aim: "Lock aim",
  power: "Bowl!",
  rolling: "Rolling…",
  over: "Play again",
};

const HOOKS = [
  { id: -1, label: "Hook left" },
  { id: 0, label: "Straight" },
  { id: 1, label: "Hook right" },
] as const;

/** Keys that shouldn't drive the lane while typing in chat. */
function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

/** Ticks while a sweep runs, so the meters move. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    let id = requestAnimationFrame(function tick(t) {
      setNow(t);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
  return now;
}

function Scoreboard(): JSX.Element {
  const lane = useLane();
  const shown = marks(lane.game);
  const totals = frameTotals(lane.game);
  const at = position(lane.game);
  return (
    <table className="game-card" aria-label="Scoreboard">
      <thead>
        <tr>
          {Array.from({ length: 10 }, (_, f) => (
            <th
              key={f}
              scope="col"
              aria-current={!at.over && at.frame === f ? "step" : undefined}
            >
              {f + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {Array.from({ length: 10 }, (_, f) => (
            <td key={f}>
              <span className="card-balls">{(shown[f] ?? []).join(" ")}</span>
              <span className="card-total">{totals[f] ?? ""}</span>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Glow Bowl's lane controls: start a game, slide along the foul line, pick a
 * hook, then one button to start the aim, lock it, and bowl at the power the
 * meter shows. Space or Enter press it; the arrows slide; Escape leaves.
 */
export function BowlingPanel(): JSX.Element {
  const lane = useLane();
  const sweeping = lane.phase === "aim" || lane.phase === "power";
  const now = useNow(sweeping);

  useEffect(() => {
    if (lane.phase === "off") return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === "Space" || e.code === "Enter") {
        // a focused button already presses itself on these keys
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        press(performance.now());
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        nudge(-1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        nudge(1);
      } else if (e.code === "Escape") leaveLane();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [lane.phase]);

  if (lane.phase === "off")
    return (
      <section className="game-panel" aria-label="Bowling">
        <button type="button" className="game-main" onClick={startGame}>
          Bowl a game
        </button>
      </section>
    );

  const aim = lane.phase === "aim" ? aimAt(now, lane.sweepAt) : lane.angle;
  const power = lane.phase === "power" ? powerAt(now, lane.sweepAt) : 0;
  const call = lane.last
    ? lane.last.strike
      ? "Strike!"
      : lane.last.spare
        ? "Spare!"
        : lane.last.pins === 0
          ? "Gutter ball"
          : `${lane.last.pins} ${lane.last.pins === 1 ? "pin" : "pins"}`
    : null;
  const done = frameTotals(lane.game).filter((t) => t !== null);
  const total = done[done.length - 1];
  return (
    <>
      <Scoreboard />
      <section className="game-panel" aria-label="Bowling">
        <p className="game-call" role="status">
          {lane.phase === "over"
            ? `Game over: ${total ?? 0}`
            : lane.phase === "rolling"
              ? ""
              : (call ?? "Slide, then aim")}
        </p>
        <div className="game-row" role="group" aria-label="Position">
          <button
            type="button"
            aria-label="Slide left"
            disabled={lane.phase !== "place"}
            onClick={() => nudge(-1)}
          >
            ◀
          </button>
          <span className="game-label">Position</span>
          <button
            type="button"
            aria-label="Slide right"
            disabled={lane.phase !== "place"}
            onClick={() => nudge(1)}
          >
            ▶
          </button>
        </div>
        <div className="game-row" role="group" aria-label="Hook">
          {HOOKS.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-pressed={lane.hook === h.id}
              disabled={lane.phase !== "place" && lane.phase !== "aim"}
              onClick={() => setHook(h.id)}
            >
              {h.label}
            </button>
          ))}
        </div>
        <label className="game-meter">
          Aim
          <meter
            min={-THROW_LIMITS.angle}
            max={THROW_LIMITS.angle}
            value={aim}
          />
        </label>
        <label className="game-meter">
          Power
          <meter
            min={0}
            max={1}
            low={0.35}
            high={0.85}
            optimum={0.7}
            value={power}
          />
        </label>
        <button
          type="button"
          className="game-main"
          disabled={lane.phase === "rolling"}
          onClick={() => press(performance.now())}
        >
          {ACTION[lane.phase]}
        </button>
        <button type="button" className="game-leave" onClick={leaveLane}>
          Leave the lane
        </button>
      </section>
    </>
  );
}
