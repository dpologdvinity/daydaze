import { useEffect, type JSX } from "react";
import { EXHIBITS } from "../../../game/museum.ts";
import { look, tour } from "./tour.ts";

/** The museum guide: pick an exhibit to go and read its plaque. */
export function ExhibitsPanel(): JSX.Element {
  const { focus } = tour.use();
  useEffect(() => {
    if (focus === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape") look(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [focus]);
  const exhibit = focus === null ? null : EXHIBITS[focus];
  return (
    <section className="game-panel museum-panel" aria-label="Exhibits">
      {exhibit && focus !== null ? (
        <>
          <p className="game-call">
            <strong>{exhibit.title}</strong>
          </p>
          <p className="museum-plaque" role="status">
            {exhibit.plaque}
          </p>
          <div className="museum-nav">
            <button
              type="button"
              onClick={() =>
                look((focus + EXHIBITS.length - 1) % EXHIBITS.length)
              }
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => look((focus + 1) % EXHIBITS.length)}
            >
              Next
            </button>
          </div>
          <button
            type="button"
            className="game-leave"
            onClick={() => look(null)}
          >
            Back to the hall
          </button>
        </>
      ) : (
        <>
          <p className="game-call">
            Eight exhibits on Filipino life and craft.
          </p>
          <ul className="museum-list">
            {EXHIBITS.map((e, i) => (
              <li key={e.kind}>
                <button type="button" onClick={() => look(i)}>
                  {e.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
