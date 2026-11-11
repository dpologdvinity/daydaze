// How the city's sidewalks look, in one place for the instanced strips
// (meshes.ts) and the corner blocks (StreetPieces.tsx) so they match.
// Poly Haven's Concrete Pavement (CC0): running-bond slabs with joints. The
// photo is a dark warm grey (about sRGB 120, 112, 100), so `SIDEWALK_LIFT`
// multiplies it up (linear) to light, slightly warm concrete; the plan's
// instance colors (src/game/city/plan.ts) stay near white and only tint.
import * as THREE from "three";
import { groundMaps, worldMapped } from "./worldTexture.ts";

/** Texture repeats per meter: a 5 m tile holds slabs about 1.7 by 0.85 m. */
const SCALE = 0.2;
/** Broad stains and patches, 0 to 1 (see worldMapped). */
const WEAR = 0.3;
/** Linear multiplier for the photo, per channel. */
export const SIDEWALK_LIFT = [2.0, 2.15, 2.45] as const;
/** The night glow the sidewalks carry (dimmed by day, meshes.ts). */
export const SIDEWALK_GLOW = 0.45;

/**
 * The sidewalk material, world-mapped. `vertexColors` is for the corner
 * blocks, whose models carry their own colors (white concrete, dark iron).
 */
export function sidewalkMaterial({ vertexColors = false } = {}) {
  const material = new THREE.MeshStandardMaterial({
    ...groundMaps("concrete_pavement"),
    color: new THREE.Color(...SIDEWALK_LIFT),
    vertexColors,
    roughness: 0.85,
    emissive: "#2a1d52",
    emissiveIntensity: SIDEWALK_GLOW,
  });
  return worldMapped(material, SCALE, false, WEAR);
}
