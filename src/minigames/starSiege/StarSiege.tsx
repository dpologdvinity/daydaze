// Star Siege, the arcade bar's alien invasion shooter, drawn on a canvas. The
// rules live in engine.ts; this owns the animation-frame loop (fixed 1/60 s
// steps, at most 0.1 s per frame), the held-key state from the keyboard and
// on-screen pads, and the best grade of the visit, reported on close.

import { useEffect, useRef, useState } from "react";
import { payoutFor, type PayGrade } from "../../game/wallet.ts";
import { Dialog } from "../Dialog.tsx";
import { grade, H, newGame, SHIP_Y, step, W, type Game } from "./engine.ts";
import "./StarSiege.css";

type Result = { grade: PayGrade; score: number };
type Props = {
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
};

const SCALE = 3;
const ROW_COLORS = ["#ff4fb3", "#b06bff", "#4fe3ff", "#7dff6b"];

/** Draws the field: stars, the fleet (little saucer-eyed aliens), shots,
 * bombs and your ship (blinking while it's hurt). */
function draw(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  ctx.fillStyle = "#05030c";
  ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  ctx.fillStyle = "#3a3258";
  for (let i = 0; i < 40; i++)
    ctx.fillRect(((i * 53) % W) * SCALE, ((i * 97) % H) * SCALE, 2, 2);
  for (const a of g.aliens) {
    if (!a.alive) continue;
    const x = a.x * SCALE;
    const y = a.y * SCALE;
    ctx.fillStyle = ROW_COLORS[a.row % ROW_COLORS.length];
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // antennae and eyes; the legs wiggle as they march
    ctx.fillRect(x - 7, y - 12, 2, 6);
    ctx.fillRect(x + 5, y - 12, 2, 6);
    const leg = Math.floor(t * 4) % 2 ? 2 : -2;
    ctx.fillRect(x - 8 + leg, y + 6, 3, 5);
    ctx.fillRect(x + 5 - leg, y + 6, 3, 5);
    ctx.fillStyle = "#05030c";
    ctx.fillRect(x - 5, y - 2, 3, 3);
    ctx.fillRect(x + 2, y - 2, 3, 3);
  }
  ctx.fillStyle = "#fff1a8";
  if (g.shot) ctx.fillRect(g.shot.x * SCALE - 1, g.shot.y * SCALE - 6, 3, 12);
  ctx.fillStyle = "#ff5c5c";
  for (const b of g.bombs) ctx.fillRect(b.x * SCALE - 2, b.y * SCALE - 4, 4, 8);
  if (g.hurt === 0 || Math.floor(t * 10) % 2) {
    const x = g.ship * SCALE;
    const y = SHIP_Y * SCALE;
    ctx.fillStyle = "#ffd84f";
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 14, y + 8);
    ctx.lineTo(x - 14, y + 8);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Star Siege, the arcade bar's alien invasion shooter: slide your ship with
 * the arrow keys (or A and D, or the on-screen pads), shoot with Space,
 * and clear wave after wave before the fleet lands.
 */
export function StarSiege({ onClose }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const keys = useRef({ left: false, right: false, fire: false });
  const best = useRef<Result | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === "intro") startRef.current?.focus();
    if (phase === "done") againRef.current?.focus();
  }, [phase]);

  // the game loop: fixed steps under the animation frame
  useEffect(() => {
    if (phase !== "play") return;
    let id = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const g = game.current;
      const ctx = canvas.current?.getContext("2d");
      if (!g || !ctx) return;
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let next = g;
      while (dt > 0) {
        next = step(next, keys.current, Math.min(dt, 1 / 60));
        dt -= 1 / 60;
      }
      game.current = next;
      draw(ctx, next, now / 1000);
      setHud((h) =>
        h.score === next.score && h.lives === next.lives && h.wave === next.wave
          ? h
          : { score: next.score, lives: next.lives, wave: next.wave },
      );
      if (next.over) {
        const r = { score: next.score, grade: grade(next.score) };
        if (!best.current || payoutFor(r.grade) > payoutFor(best.current.grade))
          best.current = r;
        setPhase("done");
        return;
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // the keyboard: arrows or A/D to move, Space to fire
  useEffect(() => {
    if (phase !== "play") return;
    const set = (e: KeyboardEvent, down: boolean) => {
      const k = keys.current;
      if (e.code === "ArrowLeft" || e.code === "KeyA") k.left = down;
      else if (e.code === "ArrowRight" || e.code === "KeyD") k.right = down;
      else if (e.code === "Space") k.fire = down;
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  const start = () => {
    game.current = newGame(Math.floor(Math.random() * 1e9));
    keys.current = { left: false, right: false, fire: false };
    setHud({ score: 0, lives: 3, wave: 1 });
    setPhase("play");
  };

  /** An on-screen pad that holds a key while pressed. */
  const pad = (key: "left" | "right" | "fire", label: string, text: string) => (
    <button
      type="button"
      className="ss-pad"
      aria-label={label}
      onPointerDown={() => (keys.current[key] = true)}
      onPointerUp={() => (keys.current[key] = false)}
      onPointerLeave={() => (keys.current[key] = false)}
      onPointerCancel={() => (keys.current[key] = false)}
    >
      {text}
    </button>
  );

  const result = phase === "done" && game.current ? game.current : null;
  return (
    <Dialog
      title="Star Siege"
      subtitle="Hold the line against the alien fleet."
      className="ss"
      onClose={() => onClose(best.current)}
    >
      {phase === "intro" && (
        <section className="ss-intro">
          <p>
            Slide your ship with the arrow keys or A and D, fire with Space. One
            shot at a time, three ships, and every wave you clear comes back
            faster.
          </p>
          <button
            ref={startRef}
            type="button"
            className="ss-go"
            onClick={start}
          >
            Play
          </button>
        </section>
      )}
      {phase === "play" && (
        <section className="ss-play">
          <div className="ss-hud" aria-live="off">
            <span className="ss-score">{hud.score}</span>
            <span>wave {hud.wave}</span>
            <span aria-label={`${hud.lives} ships left`}>
              {"▲".repeat(Math.max(0, hud.lives))}
            </span>
          </div>
          <canvas
            ref={canvas}
            width={W * SCALE}
            height={H * SCALE}
            className="ss-field"
            aria-label="The field"
          />
          <div className="ss-pads">
            {pad("left", "Move left", "◀")}
            {pad("fire", "Fire", "●")}
            {pad("right", "Move right", "▶")}
          </div>
        </section>
      )}
      {result && (
        <section className="ss-result" aria-live="polite">
          <p className="ss-grade">{grade(result.score)}</p>
          <p>
            {result.score} points, to wave {result.wave}. The arcade pays{" "}
            <strong>{payoutFor(grade(result.score))} coins</strong>.
          </p>
          <div className="ss-actions">
            <button
              ref={againRef}
              type="button"
              className="ss-go"
              onClick={start}
            >
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
