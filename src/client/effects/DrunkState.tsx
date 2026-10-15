import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { visualParams, type Intensity } from "../../game/effects/buzz.ts";
import { useReducedMotion } from "../motion.ts";
import { ageBuzz, getBuzz, liveDrunk, onBuzzChange } from "./drunk.ts";

/**
 * Fades the buzz, works out this frame's drunk look and publishes it to the
 * doll and the post pass. Always mounted, so `data-buzz` and `data-sway` read
 * on every quality tier. Writes the canvas attributes only when they change.
 */
export function DrunkState({ intensity }: { intensity: Intensity }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const calm = useReducedMotion();
  const shown = useRef({ buzz: -1, calm, intensity });

  useEffect(() => onBuzzChange(() => invalidate()), [invalidate]);

  useFrame((_, dt) => {
    ageBuzz(dt);
    const buzz = getBuzz();
    const look = visualParams(buzz, intensity, calm);
    liveDrunk.sway = look.sway;
    liveDrunk.wobble = look.wobble;
    liveDrunk.warm = look.warm;
    liveDrunk.edge = look.edge;
    const seen = shown.current;
    if (
      buzz !== seen.buzz ||
      calm !== seen.calm ||
      intensity !== seen.intensity
    ) {
      seen.buzz = buzz;
      seen.calm = calm;
      seen.intensity = intensity;
      gl.domElement.dataset.buzz = buzz.toFixed(2);
      gl.domElement.dataset.sway = String(look.sway);
    }
  });

  return null;
}
