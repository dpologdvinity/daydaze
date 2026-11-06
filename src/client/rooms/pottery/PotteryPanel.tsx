// Pointer/touch profile shaping with equivalent labeled keyboard sliders.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  GLAZES,
  TARGETS,
  scorePot,
  shapeClay,
  type PotTarget,
} from "../../../game/pottery.ts";
import { finishFiring, pottery, startPot } from "./session.ts";
import "./pottery.css";

export function PotteryPanel() {
  const state = pottery.use();
  const [target, setTarget] = useState<PotTarget>("bowl");
  const [band, setBand] = useState(4);
  const pointer = useRef<number | null>(null);
  const result = scorePot(state.clay, state.target);
  useEffect(() => {
    if (state.phase !== "firing") return;
    const timer = window.setTimeout(finishFiring, 2500);
    return () => window.clearTimeout(timer);
  }, [state.phase]);
  const drag = (event: PointerEvent<SVGSVGElement>) => {
    if (state.phase !== "throw" || result.collapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 240;
    const y = ((event.clientY - rect.top) / rect.height) * 170;
    const index = Math.max(0, Math.min(7, Math.round((150 - y) / 18)));
    setBand(index);
    pottery.set({
      clay: shapeClay(
        pottery.get().clay,
        x < 120 ? "left" : "right",
        index,
        Math.abs(x - 120) / 100,
      ),
    });
  };
  if (state.phase === "idle" || state.phase === "done")
    return (
      <section className="game-panel" aria-label="Clay Day pottery">
        <p className="game-call" role="status">
          {state.phase === "done"
            ? `Fired! ${state.saved?.score ?? 0}/100. Your latest piece is on your apartment shelf.`
            : "Make something with your hands. Your latest fired piece goes home with you."}
        </p>
        <div className="game-row" role="group" aria-label="Target shape">
          {(["bowl", "vase", "mug"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={target === t}
              onClick={() => setTarget(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="game-main"
          onClick={() => startPot(target)}
        >
          Throw a pot
        </button>
      </section>
    );
  const guide = TARGETS[state.target];
  return (
    <section className="game-panel pottery-panel" aria-label="Clay Day pottery">
      <p className="game-call">
        Target: {state.target} · {result.score}/100 · symmetry {result.symmetry}
        % · wall {(result.thickness * 1000).toFixed(1)} mm
      </p>
      {state.phase === "throw" && (
        <>
          <p id="pottery-help">
            Drag either edge to shape the spinning clay. Or select a band and
            use the arrow keys on the sliders. Dashed line: target.
          </p>
          <svg
            className="pottery-profile"
            viewBox="0 0 240 170"
            aria-label="Drag to shape your pot"
            aria-describedby="pottery-help"
            onPointerDown={(e) => {
              if (pointer.current !== null) return;
              pointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag(e);
            }}
            onPointerMove={(e) => {
              if (pointer.current === e.pointerId) drag(e);
            }}
            onPointerUp={(e) => {
              if (pointer.current === e.pointerId) pointer.current = null;
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
            onLostPointerCapture={() => {
              pointer.current = null;
            }}
          >
            <line x1="120" x2="120" y1="10" y2="156" stroke="#c9a88a" />
            <polygon
              points={state.clay.left
                .map((r, i) => `${120 - r * 100},${150 - i * 18}`)
                .concat(
                  [...state.clay.right]
                    .reverse()
                    .map((r, i) => `${120 + r * 100},${150 - (7 - i) * 18}`),
                )
                .join(" ")}
              fill="#cf8d68"
              stroke="#8b573f"
              strokeWidth="2"
            />
            {[-1, 1].map((side) => (
              <polyline
                key={side}
                points={guide.radii
                  .map((r, i) => `${120 + side * r * 100},${150 - i * 18}`)
                  .join(" ")}
                fill="none"
                stroke="#47736c"
                strokeDasharray="4 3"
                strokeWidth="2"
              />
            ))}
            <line
              x1="20"
              x2="220"
              y1={150 - band * 18}
              y2={150 - band * 18}
              stroke="#fff1d8"
            />
          </svg>
          <label>
            Band (1 base–8 rim)
            <input
              type="range"
              min="0"
              max="7"
              step="1"
              value={band}
              onChange={(e) => setBand(e.currentTarget.valueAsNumber)}
            />
          </label>
          {(["left", "right"] as const).map((side) => (
            <label key={side}>
              {side === "left" ? "Left radius" : "Right radius"}
              <input
                disabled={result.collapsed}
                type="range"
                min="0.15"
                max="0.95"
                step="0.01"
                value={state.clay[side][band]}
                onChange={(e) =>
                  pottery.set({
                    clay: shapeClay(
                      state.clay,
                      side,
                      band,
                      e.currentTarget.valueAsNumber,
                    ),
                  })
                }
              />
            </label>
          ))}
          <label>
            Pot height
            <input
              disabled={result.collapsed}
              type="range"
              min="0.4"
              max="1.5"
              step="0.01"
              value={state.clay.height}
              onChange={(e) =>
                pottery.set({
                  clay: {
                    ...state.clay,
                    height: e.currentTarget.valueAsNumber,
                  },
                })
              }
            />
          </label>
          <p role="status">
            {result.collapsed
              ? "The wall got too thin and collapsed. Start with fresh clay."
              : `Target band radius ${guide.radii[band].toFixed(2)} · target height ${guide.height.toFixed(2)} · yours ${state.clay.height.toFixed(2)}. Keep the walls above 35 mm.`}
          </p>
          {result.collapsed ? (
            <button type="button" onClick={() => startPot(state.target)}>
              Fresh clay
            </button>
          ) : (
            <button
              type="button"
              className="game-main"
              onClick={() => pottery.set({ phase: "glaze" })}
            >
              Ready to glaze
            </button>
          )}
        </>
      )}
      {state.phase === "glaze" && (
        <>
          <p>Choose a glaze at the table, then let the kiln work its magic.</p>
          <div className="game-row" role="group" aria-label="Glaze colors">
            {GLAZES.map((g) => (
              <button
                key={g.color}
                type="button"
                aria-pressed={state.glaze === g.color}
                onClick={() => pottery.set({ glaze: g.color })}
              >
                <span
                  className="pottery-chip"
                  style={{ background: g.color }}
                />
                {g.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => pottery.set({ phase: "throw" })}>
            Back to shaping
          </button>
          <button
            type="button"
            className="game-main"
            onClick={() => pottery.set({ phase: "firing" })}
          >
            Fire in the kiln
          </button>
        </>
      )}
      {state.phase === "firing" && (
        <p role="status">
          Firing in the kiln… Let it cool before taking it home.
        </p>
      )}
      <button type="button" onClick={() => pottery.set({ phase: "idle" })}>
        Leave the wheel
      </button>
    </section>
  );
}
