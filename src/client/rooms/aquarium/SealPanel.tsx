import type { JSX } from "react";
import { RoutineCard } from "../gym/RoutinePanel.tsx";
import { sealShow } from "./session.ts";

/** The seal show's panel: the gym's routine card, by the pool. */
export function SealPanel(): JSX.Element {
  return (
    <RoutineCard
      session={sealShow}
      words={{
        region: "Seal show",
        intro:
          "Pepper the seal knows eight tricks. Cue each one as its ring closes.",
        begin: "Start the seal show",
        leave: "End the show",
      }}
    />
  );
}
