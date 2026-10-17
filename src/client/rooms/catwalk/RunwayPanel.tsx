import type { JSX } from "react";
import { RoutineCard } from "../gym/RoutinePanel.tsx";
import { runway } from "./session.ts";

/** Runway Walk's panel: the gym's routine card, on the runway. */
export function RunwayPanel(): JSX.Element {
  return (
    <RoutineCard
      session={runway}
      words={{
        region: "Runway Walk",
        intro:
          "Eight cues down the runway and back: struts, poses and a twirl. Press as each ring closes.",
        begin: "Walk the runway",
        leave: "Step off the runway",
      }}
    />
  );
}
