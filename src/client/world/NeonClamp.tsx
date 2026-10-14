import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function clamp(color: THREE.Color) {
  const max = Math.max(color.r, color.g, color.b);
  if (max > 1) color.multiplyScalar(1 / max);
}

/**
 * Low quality has no bloom, so neon colours pushed past 1.0 would clip
 * channel by channel (orange turns yellow, pink turns white). Each frame,
 * scale every unlit, untone-mapped colour back so its brightest channel is
 * 1.0: same hue, full brightness. Idempotent, so animated colours are fine.
 * Mount it last so it runs after the rooms' own frame callbacks.
 */
export function NeonClamp() {
  useFrame(({ scene }) => {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats: THREE.Material[] = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshBasicMaterial && !m.toneMapped) {
          clamp(m.color);
        }
      }
    });
  });
  return null;
}
