import { useState, type CSSProperties, type JSX } from "react";
import {
  CLIENTS,
  FINISHES,
  POLISHES,
  sessionOver,
  wantedSet,
  type Finish,
  type Nail,
} from "../../../game/nails.ts";
import { coat, handOver, leave, nails, start } from "./nailSession.ts";

/** How a nail looks in the panel: its polish, with chrome's shine,
 * glitter's sparkle or a French tip. */
function nailStyle(n: Nail | null): CSSProperties {
  if (!n) return { background: "#f4dccc", borderStyle: "dashed" };
  const base = n.polish;
  switch (n.finish) {
    case "chrome":
      return {
        background: `linear-gradient(135deg, #ffffff 0%, ${base} 35%, ${base} 65%, #ffffff 100%)`,
      };
    case "glitter":
      return {
        background: `radial-gradient(circle at 30% 30%, #fff 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #fff 0 7%, transparent 8%), ${base}`,
      };
    case "french":
      return {
        background: `linear-gradient(0deg, ${base} 0 70%, #fffaf4 70% 100%)`,
      };
    default:
      return { background: base };
  }
}

const describe = (n: Nail) =>
  `${POLISHES.find((p) => p.id === n.polish)?.label ?? n.polish} ${n.finish}`;

/** The nail station: match the client's set, nail by nail. */
export function NailPanel(): JSX.Element {
  const s = nails.use();
  const [polish, setPolish] = useState<string>(POLISHES[0].id);
  const [finish, setFinish] = useState<Finish>("cream");
  if (!s.on)
    return (
      <section className="game-panel nail-panel" aria-label="Nail station">
        <p className="game-call">
          Take the nail station: five clients, each with a set in mind. Match
          every nail for a tip.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Do some nails
        </button>
      </section>
    );
  const over = sessionOver(s.session);
  const want = over ? [] : wantedSet(s.session.seed, s.session.served);
  return (
    <section className="game-panel nail-panel" aria-label="Nail station">
      <p className="game-score" aria-label="Nails">
        <span>{s.session.points} points</span>
        <span>
          Client {Math.min(s.session.served + (over ? 0 : 1), CLIENTS)}/
          {CLIENTS}
        </span>
      </p>
      <p className="game-call" role="status">
        {over
          ? `Station closed: ${s.session.points} points`
          : s.last
            ? `${s.last.right}/5 right${s.last.tip ? `, +${s.last.tip} tip` : ""}. Next client.`
            : "She wants these:"}
      </p>
      {!over && (
        <>
          <div className="nails" role="group" aria-label="The set she wants">
            {want.map((n, i) => (
              <span
                key={i}
                className="nail"
                style={nailStyle(n)}
                role="img"
                aria-label={`Nail ${i + 1}: ${describe(n)}`}
              />
            ))}
          </div>
          <div className="nails" role="group" aria-label="Her nails">
            {s.session.hand.map((n, i) => (
              <button
                key={i}
                type="button"
                className="nail"
                style={nailStyle(n)}
                aria-label={`Paint nail ${i + 1}`}
                onClick={() => coat(i, { polish, finish })}
              />
            ))}
          </div>
          <div className="game-row" role="group" aria-label="Polishes">
            {POLISHES.map((p) => (
              <button
                key={p.id}
                type="button"
                className="swatch"
                style={{ background: p.id }}
                aria-label={p.label}
                aria-pressed={polish === p.id}
                onClick={() => setPolish(p.id)}
              />
            ))}
          </div>
          <div className="game-row" role="group" aria-label="Finishes">
            {FINISHES.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={finish === f}
                onClick={() => setFinish(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="game-main"
            onClick={() => handOver(performance.now())}
          >
            All done
          </button>
        </>
      )}
      <button
        type="button"
        onClick={over ? () => start(performance.now()) : leave}
      >
        {over ? "Another shift" : "Close the station"}
      </button>
    </section>
  );
}
