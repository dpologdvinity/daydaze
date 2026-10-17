import { useEffect, useState } from "react";
import { nextShowIn } from "../../game/city/fireworks.ts";
import { nextParadeIn } from "../../game/city/parade.ts";
import { paradeClock, showClock } from "./eventClocks.ts";

const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The city HUD's lines about what's on: the fireworks over Beachside and
 * the Pride parade on the boardwalk. */
export function FireworksTicker() {
  const [, setBeat] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBeat((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const fireworks = Math.ceil(nextShowIn(showClock()));
  const parade = Math.ceil(nextParadeIn(paradeClock()));
  return (
    <>
      <p className="venue-event">
        {fireworks === 0
          ? "Fireworks over the beach, now!"
          : `Fireworks over the beach in ${mmss(fireworks)}`}
      </p>
      <p className="venue-event">
        {parade === 0
          ? "The Pride parade's on the boardwalk, now!"
          : `Pride parade on the boardwalk in ${mmss(parade)}`}
      </p>
    </>
  );
}
