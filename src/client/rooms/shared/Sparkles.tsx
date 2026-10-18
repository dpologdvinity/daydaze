import { Sparkles as DreiSparkles } from "@react-three/drei";
import { useLayoutEffect, useRef, type ComponentProps } from "react";
import * as THREE from "three";

// drei's shader divides by the distance to the point center, so the center
// pixel gets an infinite alpha. Blending turns that into NaN in the high
// tier's half-float buffer, and the bloom blur spreads one NaN pixel over
// the whole frame: a black canvas. Clamp it like an 8-bit buffer would.
const PATCHES: [string, string][] = [
  ["0.05 / distanceToCenter", "0.05 / max(distanceToCenter, 0.001)"],
  [
    "vec4(vColor, strength * vOpacity)",
    "vec4(vColor, clamp(strength * vOpacity, 0.0, 1.0))",
  ],
];

/** drei's `Sparkles` with a NaN-safe fragment shader. Use this one, never drei's. */
export function Sparkles(props: ComponentProps<typeof DreiSparkles>) {
  const ref = useRef<THREE.Points>(null);
  useLayoutEffect(() => {
    const m = ref.current?.material;
    if (!(m instanceof THREE.ShaderMaterial)) return;
    for (const [from, to] of PATCHES) {
      // StrictMode runs this twice on one material; the second pass is a no-op
      if (m.fragmentShader.includes(to)) continue;
      if (!m.fragmentShader.includes(from))
        console.error("Sparkles: drei's shader changed; recheck the NaN fix.");
      m.fragmentShader = m.fragmentShader.replace(from, to);
    }
    m.needsUpdate = true;
  }, []);
  return <DreiSparkles ref={ref} {...props} />;
}
