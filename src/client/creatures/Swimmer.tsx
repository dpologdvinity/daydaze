// A fish, shark or ray following a path that is a pure function of time
// (`path(t, pose)`): the caller says where it is and which way it faces, the
// swim clip does the rest. Time runs slower under reduced motion.

import { useRef, type JSX } from "react";
import type { FishKind, SeaKind } from "../../game/creatures.ts";
import { useReducedMotion } from "../motion.ts";
import { Creature, type CreaturePose } from "./Creature.tsx";

export function SwimmingCreature({
  kind,
  path,
  scale,
}: {
  kind: FishKind | SeaKind;
  /** Fills in x, y, z and yaw for `t` seconds; no allocation. */
  path: (t: number, pose: CreaturePose) => void;
  scale?: number;
}): JSX.Element {
  const calm = useReducedMotion();
  const clock = useRef(0);
  return (
    <Creature
      kind={kind}
      scale={scale}
      drive={(dt, pose) => {
        clock.current += dt * (calm ? 0.3 : 1);
        path(clock.current, pose);
        pose.clip = "swim";
      }}
    />
  );
}
