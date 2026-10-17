import { useEffect, useRef } from "react";
import { CITY_BOUNDS, CITY_SURFACES, WATER_Z } from "../../game/city/layout.ts";
import { CITY_PLACES } from "../../game/city/places.ts";
import {
  CHALLENGE_PAY,
  challengesFor,
  dayOf,
  type ChallengeSave,
} from "../../game/challenges.ts";
import { PRIZE_TABLES } from "../../game/prizes.ts";
import { ROOMS, type Spawn } from "../../game/rooms.ts";

const [X0, Z0] = CITY_BOUNDS[0];
const [X1, Z1] = CITY_BOUNDS[2];
const WIDTH = X1 - X0;
const HEIGHT = Z1 - Z0;

/** Surface outlines as SVG paths, once: the map never changes. */
const PATHS = CITY_SURFACES.map((s) => ({
  kind: s.kind,
  d: `M${s.polygon.map(([x, z]) => `${x - X0},${z - Z0}`).join("L")}Z`,
}));

const FILL: Record<(typeof PATHS)[number]["kind"], string> = {
  road: "#3a2f6e",
  sidewalk: "#6a5a9a",
  square: "#7d6cb0",
  boardwalk: "#9a6a4a",
  sand: "#c9a274",
  lawn: "#2e5e3a",
};

/**
 * The city map: every street, the coast and a button per neighbourhood that
 * takes you there. Closes on Escape or a tap outside the map.
 */
export function CityMap({
  onGo,
  onClose,
  challenges,
}: {
  onGo: (spawn: Spawn) => void;
  onClose: () => void;
  /** Today's challenges already reached. */
  challenges: ChallengeSave;
}) {
  const day = dayOf(Date.now());
  const done = challenges.day === day ? challenges.done : [];
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="city-map-backdrop" onClick={onClose}>
      <div
        ref={panel}
        className="city-map"
        role="dialog"
        aria-label="City map"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="city-map-head">
          <h2>City map</h2>
          <button type="button" className="city-map-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="city-map-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
            <rect width={WIDTH} height={HEIGHT} fill="#120d26" />
            <rect
              y={WATER_Z - Z0}
              width={WIDTH}
              height={Z1 - WATER_Z}
              fill="#0b2a4a"
            />
            {PATHS.map((p, i) => (
              <path key={i} d={p.d} fill={FILL[p.kind]} />
            ))}
          </svg>
          {CITY_PLACES.map((place) => (
            <button
              key={place.id}
              type="button"
              className="city-map-place"
              style={{
                left: `${((place.spawn.position[0] - X0) / WIDTH) * 100}%`,
                top: `${((place.spawn.position[1] - Z0) / HEIGHT) * 100}%`,
              }}
              onClick={() => onGo(place.spawn)}
            >
              {place.label}
            </button>
          ))}
        </div>
        <section className="challenges" aria-label="Today's challenges">
          <h3>Today&apos;s challenges · {CHALLENGE_PAY} coins each</h3>
          <ul>
            {challengesFor(day).map((c) => {
              const table = PRIZE_TABLES[c.game];
              const hit = done.includes(c.game);
              return (
                <li key={c.game} data-done={hit}>
                  <span aria-hidden="true">{hit ? "★" : "☆"}</span>
                  {table.label}: {table.format(c.target)}
                  {table.lower ? " or better" : " or more"}
                  <small> at {ROOMS[table.room].name}</small>
                  {hit && <span className="sr-only"> (done)</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
