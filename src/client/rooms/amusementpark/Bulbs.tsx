import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../game/amusementPark.ts";
import { hdr } from "../shared/materials.ts";

export const BULB_PALETTE = [
  "#fff1c8",
  "#ff6ac8",
  "#ffb02e",
  "#3fe0d0",
  "#9b5cff",
];

/**
 * One instanced draw call for every bulb in `points`, each glowing in a colour
 * from `colors`. The points and colours must be stable (module-level or memoised).
 */
export function Bulbs({
  points,
  colors = BULB_PALETTE,
  radius = 0.07,
  detail = [8, 6],
}: {
  points: readonly Vec3[];
  colors?: readonly string[];
  radius?: number;
  /** Width and height segments of each bulb; far bulbs can use fewer. */
  detail?: [number, number];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const palette = colors.map((c) => hdr(c, 3.2));
    points.forEach((p, i) => {
      o.position.set(...p);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, palette[i % palette.length]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [points, colors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[radius, detail[0], detail[1]]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
