import { useEffect, useState } from "react";
import { nextShowIn } from "../../game/city/fireworks.ts";
import { showClock } from "./fireworksClock.ts";

/** The city HUD's line about the next fireworks show over Beachside. */
export function FireworksTicker() {
  const [t, setT] = useState(showClock);
  useEffect(() => {
    const id = window.setInterval(() => setT(showClock()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.ceil(nextShowIn(t));
  return (
    <p className="venue-event">
      {left === 0
        ? "Fireworks over the beach, now!"
        : `Fireworks over the beach in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
    </p>
  );
}
