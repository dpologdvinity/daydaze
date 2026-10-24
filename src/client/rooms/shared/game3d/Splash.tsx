// Water and sand bursts on the shared instanced particle base (Burst.tsx):
// a splash throws droplets up, a sand puff throws grains low and sideways.

import type { Ref } from "react";
import type { BurstSpec } from "../../../../game/motion/particles.ts";
import { ParticleBurst, type BurstHandle } from "./Burst.tsx";

const WATER: BurstSpec = { speed: 4.2, lifetime: 1.1, up: 0.95 };
const SAND: BurstSpec = { speed: 1.6, lifetime: 0.8, up: 0.15, gravity: 6 };

/** A splash of droplets (fire with a size from the entry: 0.5 neat, 2 big). */
export function Splash({ ref }: { ref?: Ref<BurstHandle> }) {
  return (
    <ParticleBurst
      ref={ref}
      count={36}
      spec={WATER}
      color="#dff6ff"
      glow={0.35}
      size={0.05}
    />
  );
}

/** A low puff of sand where a ball or a diving player lands. */
export function SandPuff({ ref }: { ref?: Ref<BurstHandle> }) {
  return (
    <ParticleBurst
      ref={ref}
      count={20}
      spec={SAND}
      color="#e9cf98"
      glow={0.1}
      size={0.04}
    />
  );
}
