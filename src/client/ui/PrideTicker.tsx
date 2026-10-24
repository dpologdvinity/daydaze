// The Pride night countdown shown in the clubs, re-rendered once a second, with
// a rainbow glow over the room card while the event is on. The schedule comes
// from src/game/prideNight.ts on the shared event clock.

import { useEffect, useState } from "react";
import { nextPrideNightIn } from "../../game/prideNight.ts";
import { prideClock } from "../city/eventClocks.ts";

const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** In the clubs: when Pride night is on, and a rainbow glow round the
 * room card while it is. */
export function PrideTicker() {
  const [, setBeat] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBeat((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const next = Math.ceil(nextPrideNightIn(prideClock()));
  return (
    <>
      <p className="venue-event">
        {next === 0 ? "It's Pride night! 🏳️‍🌈" : `Pride night in ${mmss(next)}`}
      </p>
      {next === 0 && <div className="pride-glow" aria-hidden="true" />}
    </>
  );
}
