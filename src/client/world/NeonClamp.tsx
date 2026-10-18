import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function clamp(color: THREE.Color) {
  const max = Math.max(color.r, color.g, color.b);
  if (max > 1) color.multiplyScalar(1 / max);
}

/**
 * Low quality has no bloom, so neon colors pushed past 1.0 would clip
 * channel by channel (orange turns yellow, pink turns white). Each frame,
 * scale every unlit, untone-mapped color back so its brightest channel is
 * 1.0: same hue, full brightness. Idempotent, so animated colors are fine.
 * Mount it last so it runs after the rooms' own frame callbacks.
 */
export function NeonClamp() {
  // the unlit neon materials, re-collected now and then as dolls and props
  // mount (walking the whole scene every frame was the low tier's costliest
  // per-frame job); clamping the list itself stays per frame, since rooms
  // animate their neon colors
  const neon = useRef<THREE.MeshBasicMaterial[]>([]);
  const frame = useRef(0);
  useFrame(({ scene }) => {
    if (frame.current++ % 30 === 0) {
      const found = new Set<THREE.MeshBasicMaterial>();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const m = obj.material;
        if (Array.isArray(m)) {
          for (const x of m)
            if (x instanceof THREE.MeshBasicMaterial && !x.toneMapped)
              found.add(x);
        } else if (m instanceof THREE.MeshBasicMaterial && !m.toneMapped)
          found.add(m);
      });
      neon.current = [...found];
    }
    for (const m of neon.current) clamp(m.color);
  });
  return null;
}
