// The event calendar on screen: in a club that hosts a weekly night, the room
// card says when it's on (and glows the night's color while it is); on the
// city map, the week's club nights plus Pride night, the fireworks and the
// parade, each with its countdown. Schedules come from src/game/events.ts and
// the quick cycles' own modules, on the shared event clocks.

import { useEffect, useState } from "react";
import { nextShowIn } from "../../game/city/fireworks.ts";
import { nextParadeIn } from "../../game/city/parade.ts";
import { CLUB_NIGHTS, formatWait, schedule } from "../../game/events.ts";
import { nextPrideNightIn } from "../../game/prideNight.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import {
  nightClock,
  paradeClock,
  prideClock,
  showClock,
} from "../city/eventClocks.ts";

/** Re-renders every `ms`, for countdowns. */
function useTick(ms: number) {
  const [, setBeat] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBeat((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/** On the room card in a club with a weekly night: when it's next, or that
 * it's on now with the night's glow round the card. */
export function ClubNightTicker({ room }: { room: RoomId }) {
  useTick(30_000);
  const row = schedule(nightClock()).find(
    (r) => r.clubs.includes(room) && (r.on || r.inMs > 0),
  );
  if (!row) return null;
  const color = CLUB_NIGHTS.find((n) => n.id === row.id)?.color ?? "#fff";
  return (
    <>
      <p className="venue-event" data-night={row.on ? row.id : undefined}>
        {row.on
          ? `${row.label} is on! ${formatWait(row.leftMs)} left`
          : `${row.label} in ${formatWait(row.inMs)}`}
      </p>
      {row.on && (
        <div
          className="night-glow"
          style={{
            borderColor: color,
            boxShadow: `0 0 18px 2px ${color}, inset 0 0 12px ${color}`,
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

const clubNames = (clubs: readonly RoomId[]) =>
  clubs.map((c) => ROOMS[c].name).join(", ");

/** The city map's calendar: every event, soonest first. */
export function EventCalendar() {
  useTick(15_000);
  const nights = schedule(nightClock()).map((r) => ({
    key: r.id,
    label: r.label,
    where: `at ${clubNames(r.clubs)}`,
    on: r.on,
    quick: false,
    wait: r.on ? r.leftMs : r.inMs,
  }));
  // the quick cycles count in seconds on their own clocks
  const quick = [
    {
      key: "pride",
      label: "Pride night",
      where: "in the clubs",
      in: nextPrideNightIn(prideClock()),
    },
    {
      key: "fireworks",
      label: "Fireworks",
      where: "over the beach",
      in: nextShowIn(showClock()),
    },
    {
      key: "parade",
      label: "Pride parade",
      where: "along the boardwalk",
      in: nextParadeIn(paradeClock()),
    },
  ].map((q) => ({
    key: q.key,
    label: q.label,
    where: q.where,
    on: q.in === 0,
    // a quick cycle has no "left" to count: just on
    quick: true,
    wait: q.in * 1000,
  }));
  const rows = [...quick, ...nights].sort(
    (a, b) => Number(b.on) - Number(a.on) || a.wait - b.wait,
  );
  return (
    <section className="event-calendar" aria-label="Events">
      <h3>Events this week</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.key} data-on={r.on}>
            <strong>{r.label}</strong> <small>{r.where}</small>
            <span className="event-when">
              {r.on
                ? r.quick
                  ? "on now"
                  : `on now · ${formatWait(r.wait)} left`
                : `in ${formatWait(r.wait)}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
