// The countryside around the city: grass from the city's edge out past the
// camera's far plane on the north, west and east (the sea takes the south),
// so a view out of the Uptown park ends in green going hazy and not in a
// dark slab of bare city ground running to the horizon. One draw call: three
// strips merged, laid beside the city's own ground (CityScene) and not under
// it, so the two never fight for the same pixels.

import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CITY_BOUNDS, WATER_Z } from "../../game/city/layout.ts";

/** How far the grass runs past the city's edge (the fog hides the end). */
const REACH = 900;

/** The land inside which the city's own ground is drawn: its bounds plus a margin. */
export const CITY_LAND = (() => {
  const xs = CITY_BOUNDS.map((p) => p[0]);
  const zs = CITY_BOUNDS.map((p) => p[1]);
  return {
    x0: Math.min(...xs) - 2,
    x1: Math.max(...xs) + 2,
    z0: Math.min(...zs) - 2,
    z1: WATER_Z,
  };
})();

/** A flat rectangle on the ground from (x0, z0) to (x1, z1). */
function strip(x0: number, z0: number, x1: number, z1: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  return g;
}

export function Outskirts(): JSX.Element {
  const { x0, x1, z0, z1 } = CITY_LAND;
  const geometry = useMemo(() => {
    const merged = mergeGeometries([
      strip(x0 - REACH, z0 - REACH, x1 + REACH, z0), // north, corner to corner
      strip(x0 - REACH, z0, x0, z1), // west
      strip(x1, z0, x1 + REACH, z1), // east
    ]);
    if (!merged) throw new Error("the outskirts' strips did not merge");
    return merged;
  }, [x0, x1, z0, z1]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, -0.01, 0]} name="city-outskirts">
      <meshStandardMaterial color="#6a9a55" roughness={1} />
    </mesh>
  );
}
