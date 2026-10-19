import type { JSX } from "react";
import {
  INGREDIENTS,
  MENU,
  score,
  shiftOver,
  ticket,
  TICKETS,
} from "../../../game/barista.ts";
import { add, barista, empty, handOver, leave, start } from "./session.ts";

const label = (id: string) => INGREDIENTS.find((i) => i.id === id)?.label ?? id;

/** The barista station: read the ticket, build the drink, hand it over. */
export function BaristaPanel(): JSX.Element {
  const s = barista.use();
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Barista station">
        <p className="game-call">
          Take a shift behind the bar: eight tickets, tips for speed.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Start a shift
        </button>
      </section>
    );
  const over = shiftOver(s.shift);
  const order = over ? null : ticket(s.shift.seed, s.shift.served);
  return (
    <section className="game-panel" aria-label="Barista station">
      <p className="game-score" aria-label="Shift">
        <span>{score(s.shift)} points</span>
        <span>
          {Math.min(s.shift.served + (over ? 0 : 1), TICKETS)}/{TICKETS}
        </span>
      </p>
      <p className="game-call" role="status">
        {over
          ? `Shift done: ${s.shift.right} of ${TICKETS} right, ${s.shift.tips} in tips`
          : s.last
            ? `${s.last.right ? `${s.last.name}, perfect${s.last.tip ? `: +${s.last.tip} tip` : ""}` : `That wasn't a ${s.last.name}`}. Next: ${order?.name}`
            : `Ticket: ${order?.name}`}
      </p>
      {!over && (
        <>
          <p className="game-call">
            In the cup:{" "}
            {s.shift.cup.length ? s.shift.cup.map(label).join(", ") : "empty"}
          </p>
          <div className="game-row">
            {INGREDIENTS.map((i) => (
              <button key={i.id} type="button" onClick={() => add(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
          <div className="game-row">
            <button
              type="button"
              className="game-main"
              onClick={() => handOver(performance.now())}
            >
              Hand it over
            </button>
            <button type="button" onClick={empty}>
              Dump the cup
            </button>
          </div>
          <details>
            <summary>Recipe card</summary>
            <ul>
              {MENU.map((d) => (
                <li key={d.name}>
                  {d.name}: {d.recipe.map(label).join(", ")}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      <button
        type="button"
        onClick={over ? () => start(performance.now()) : leave}
      >
        {over ? "Work another shift" : "Clock out"}
      </button>
    </section>
  );
}
