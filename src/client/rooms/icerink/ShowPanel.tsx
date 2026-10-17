import type { JSX } from "react";
import { RoutineCard } from "../gym/RoutinePanel.tsx";
import { show } from "./session.ts";

/** The ice show's panel: the gym's routine card, on the rink. */
export function ShowPanel(): JSX.Element {
  return (
    <RoutineCard
      session={show}
      words={{
        region: "Ice show",
        intro:
          "Eight elements on the music: jumps, spins and spirals. Press as each ring closes.",
        begin: "Skate the program",
        leave: "Leave the ice",
      }}
    />
  );
}
