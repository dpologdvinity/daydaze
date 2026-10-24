// Pulse's dance-off banner: counts down to the next dance-off on the shared
// clock, then tallies the seconds the player dances during it and pays them to
// the prize desk when it ends. Polls every 250 ms; the tally lives in a ref, so
// leaving mid dance-off forfeits it.

import { useEffect, useRef, useState } from "react";
import { danceOffAt, danceOffIndex } from "../../../game/danceOff.ts";
import {
  danceOffClock as clock,
  releaseDanceOffClock,
} from "./danceOffClock.ts";
import { award } from "../../ui/prizeDesk.ts";

const TICK_MS = 250;

const mmss = (s: number) => {
  const c = Math.ceil(s);
  return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, "0")}`;
};

/**
 * Pulse's dance-off call: a countdown to the next, then half a minute when
 * every second you spend dancing counts. When it ends, the seconds danced
 * go to the prize desk.
 */
export function DanceOffHud({ dancing }: { dancing: boolean }) {
  const [t, setT] = useState(clock);
  const live = useRef(dancing);
  live.current = dancing;
  useEffect(() => {
    if (dancing) releaseDanceOffClock();
  }, [dancing]);
  const tally = useRef({ index: -1, seconds: 0 });
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = clock();
      const state = danceOffAt(now);
      const index = danceOffIndex(now);
      const run = tally.current;
      if (state.on) {
        if (run.index !== index) tally.current = { index, seconds: 0 };
        if (live.current) tally.current.seconds += TICK_MS / 1000;
      } else if (run.index === index && run.seconds > 0) {
        award("dance-off", Math.round(run.seconds));
        tally.current = { index: -1, seconds: 0 };
      }
      setT(now);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  const state = danceOffAt(t);
  const seconds = Math.round(tally.current.seconds);
  return (
    <section className="dance-off" data-on={state.on} aria-label="Dance-off">
      {state.on ? (
        <>
          <strong>DANCE-OFF!</strong>{" "}
          {dancing
            ? `Keep dancing: ${seconds} s on the floor, ${mmss(state.left)} left`
            : `Press Dance to join: ${mmss(state.left)} left`}
        </>
      ) : (
        `The DJ calls a dance-off in ${mmss(state.startsIn)}`
      )}
    </section>
  );
}
