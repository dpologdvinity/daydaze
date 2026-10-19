import { useEffect, type JSX } from "react";
import { RIDE, surfScore } from "../../../game/surf.ts";
import { typing } from "../shared/useNow.ts";
import { leave, setLean, start, surfing, tryTrick } from "./session.ts";

/** Paddle out, then lean to stay in the wave's pocket. */
export function SurfPanel(): JSX.Element {
  const s = surfing.use();
  const riding = s.on && s.surf.state === "riding";
  useEffect(() => {
    if (!riding) return;
    const held = new Set<string>();
    const lean = () =>
      setLean(
        held.has("ArrowLeft") || held.has("KeyA")
          ? -1
          : held.has("ArrowRight") || held.has("KeyD")
            ? 1
            : 0,
      );
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        tryTrick(performance.now());
      } else if (e.code === "Escape") leave();
      else if (/^(Arrow(Left|Right)|Key[AD])$/.test(e.code)) {
        held.add(e.code);
        lean();
      }
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
      lean();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      setLean(0);
    };
  }, [riding]);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Surfing">
        <p className="game-call">
          Paddle out and ride a wave: lean to stay in its pocket, and when the
          board's charged, throw a trick.
        </p>
        <button type="button" className="game-main" onClick={start}>
          Paddle out
        </button>
      </section>
    );
  const hold = (lean: -1 | 1) => ({
    onPointerDown: () => setLean(lean),
    onPointerUp: () => setLean(0),
    onPointerLeave: () => setLean(0),
  });
  const ended = s.surf.state !== "riding";
  return (
    <section className="game-panel" aria-label="Surfing">
      <p className="game-score" aria-label="Ride">
        <span>{surfScore(s.surf)} points</span>
        <span>{Math.max(0, Math.ceil(RIDE - s.surf.t))} s</span>
      </p>
      <p className="game-call" role="status">
        {s.surf.state === "wiped"
          ? `Wipeout! ${surfScore(s.surf)} points`
          : s.surf.state === "done"
            ? `Rode it in: ${surfScore(s.surf)} points, ${s.surf.tricks} tricks`
            : s.surf.out > 0
              ? "Out of the pocket: lean back in!"
              : s.surf.charge >= 1
                ? "Charged: trick!"
                : "In the pocket"}
      </p>
      {ended ? (
        <button type="button" className="game-main" onClick={start}>
          Paddle out again
        </button>
      ) : (
        <>
          <div className="game-row">
            <button type="button" {...hold(-1)}>
              Lean left
            </button>
            <button type="button" {...hold(1)}>
              Lean right
            </button>
          </div>
          <button
            type="button"
            className="game-main"
            disabled={s.surf.charge < 1}
            onClick={() => tryTrick(performance.now())}
          >
            Trick
          </button>
        </>
      )}
      <button type="button" onClick={leave}>
        Back to the sand
      </button>
    </section>
  );
}
