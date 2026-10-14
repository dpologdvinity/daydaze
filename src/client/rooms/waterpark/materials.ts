import * as THREE from "three";
import { gradientMap } from "../../avatar/toon.ts";
import { canvasTex } from "../shared/materials.ts";

const cache = new Map<string, THREE.MeshToonMaterial>();

/** A shared flat toon material per colour, like the doll's shading. */
export function toon(hex: string) {
  let m = cache.get(hex);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: hex, gradientMap });
    cache.set(hex, m);
  }
  return m;
}

/** Vertical candy stripes, for umbrellas, awnings and the tower roof. */
export function stripes(colors: readonly string[], repeat = 1) {
  return canvasTex(
    64 * colors.length,
    8,
    (ctx) =>
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i * 64, 0, 64, 8);
      }),
    [repeat, 1],
  );
}

/** Lesbian pride flag stripes, top to bottom. */
export const SUNSET_FLAG = [
  "#d52d00",
  "#ff9a56",
  "#ffffff",
  "#d362a4",
  "#a30262",
] as const;
