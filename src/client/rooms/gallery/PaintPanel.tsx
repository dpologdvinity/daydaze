import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent,
} from "react";
import { BRUSHES, CANVAS_SIZE, PAINTS } from "../../../game/painting.ts";
import { hang, painting } from "./painting.ts";

/** The easel: paint with the mouse or a finger, then hang it on the open
 * wall. */
export function PaintPanel(): JSX.Element {
  const { easel, url } = painting.use();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paint, setPaint] = useState<string>(PAINTS[2]);
  const [brush, setBrush] = useState<number>(BRUSHES[1].size);
  const [note, setNote] = useState("");
  const last = useRef<{ x: number; y: number } | null>(null);

  // a fresh canvas, or the painting already on the wall to keep working on
  useEffect(() => {
    if (!easel) return;
    setNote("");
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAINTS[1];
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (url) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      img.src = url;
    }
    // only on opening: the wall copy changing must not wipe the canvas
  }, [easel]);

  if (!easel)
    return (
      <section className="game-panel" aria-label="Easel">
        <p className="game-call">
          Paint something for the open wall. It stays up till you paint over it.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => painting.set({ easel: true })}
        >
          Paint at the easel
        </button>
      </section>
    );

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_SIZE,
      y: ((e.clientY - r.top) / r.height) * CANVAS_SIZE,
    };
  };
  const stroke = (to: { x: number; y: number }) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const from = last.current ?? to;
    ctx.strokeStyle = paint;
    ctx.lineWidth = brush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
    last.current = to;
  };
  const clear = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAINTS[1];
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };
  const keep = () => {
    const data = canvas.current?.toDataURL("image/png");
    setNote(
      data && hang(data)
        ? "Hung on the open wall."
        : "It wouldn't save: the browser's storage is full.",
    );
  };
  return (
    <section className="game-panel easel" aria-label="Easel">
      <canvas
        ref={canvas}
        className="easel-canvas"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        aria-label="Your canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = null;
          stroke(at(e));
        }}
        onPointerMove={(e) => {
          if (e.buttons) stroke(at(e));
        }}
        onPointerUp={() => {
          last.current = null;
        }}
      />
      <div className="game-row" role="group" aria-label="Paints">
        {PAINTS.map((p) => (
          <button
            key={p}
            type="button"
            className="swatch"
            style={{ background: p }}
            aria-label={`Paint ${p}`}
            aria-pressed={paint === p}
            onClick={() => setPaint(p)}
          />
        ))}
      </div>
      <div className="game-row" role="group" aria-label="Brushes">
        {BRUSHES.map((b) => (
          <button
            key={b.size}
            type="button"
            aria-pressed={brush === b.size}
            onClick={() => setBrush(b.size)}
          >
            {b.label}
          </button>
        ))}
        <button type="button" onClick={clear}>
          Start over
        </button>
      </div>
      <div className="game-row">
        <button type="button" className="game-main" onClick={keep}>
          Hang it
        </button>
        <button type="button" onClick={() => painting.set({ easel: false })}>
          Put the brush down
        </button>
      </div>
      <p className="game-call" role="status">
        {note}
      </p>
    </section>
  );
}
