import type { JSX } from "react";
import { score, shiftOver, ticket, TICKETS } from "../../../game/orders.ts";
import type { OrderSession } from "./orderSession.ts";

/** An order station's panel: read the ticket, build it from the station's
 * ingredients, hand it over. `title` names the panel's region. */
export function OrderPanel({
  session,
  title,
  intro,
  startLabel,
}: {
  session: OrderSession;
  title: string;
  intro: string;
  startLabel: string;
}): JSX.Element {
  const { station } = session;
  const s = session.store.use();
  const label = (id: string) =>
    station.ingredients.find((i) => i.id === id)?.label ?? id;
  if (!s.on)
    return (
      <section className="game-panel" aria-label={title}>
        <p className="game-call">{intro}</p>
        <button
          type="button"
          className="game-main"
          onClick={() => session.start(performance.now())}
        >
          {startLabel}
        </button>
      </section>
    );
  const over = shiftOver(s.shift);
  const order = over ? null : ticket(station, s.shift.seed, s.shift.served);
  return (
    <section className="game-panel" aria-label={title}>
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
          <div className="game-row order-station">
            {station.ingredients.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => session.add(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="game-row">
            <button
              type="button"
              className="game-main"
              onClick={() => session.handOver(performance.now())}
            >
              Hand it over
            </button>
            <button type="button" onClick={session.empty}>
              Dump the cup
            </button>
          </div>
          <details>
            <summary>Recipe card</summary>
            <ul>
              {station.menu.map((d) => (
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
        onClick={over ? () => session.start(performance.now()) : session.leave}
      >
        {over ? "Work another shift" : "Clock out"}
      </button>
    </section>
  );
}
