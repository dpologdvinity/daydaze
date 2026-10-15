import * as THREE from "three";

// Linear RGB above 1 so the glow passes the bloom threshold on the high tier.
export const NEON = {
  pink: new THREE.Color(3.2, 0.35, 2.2),
  cyan: new THREE.Color(0.35, 2.4, 3.0),
  red: new THREE.Color(2.6, 0.2, 0.3),
  white: new THREE.Color(2.2, 2.2, 2.2),
  gold: new THREE.Color(3.0, 2.1, 0.4),
} as const;

/** Alternates pink and cyan along a run of strips. */
export function neonCycle(i: number): THREE.Color {
  return i % 2 ? NEON.pink : NEON.cyan;
}
