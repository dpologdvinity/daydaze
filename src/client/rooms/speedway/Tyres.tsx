import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";

/** A tyre centre: `at` on the ground in metres, `y` the height of its centre. */
export type Tyre = { at: Vec2; y: number };

const TYRE_RADIUS = 0.42;

/**
 * Tyres lying flat, all in one draw call. The ring is baked flat into the
 * geometry, so each instance only carries a position and a heading.
 */
export function Tyres({ tyres }: { tyres: readonly Tyre[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.TorusGeometry(TYRE_RADIUS - 0.16, 0.16, 5, 8);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const place = new THREE.Object3D();
    tyres.forEach((t, i) => {
      place.position.set(t.at[0], t.y, t.at[1]);
      place.updateMatrix();
      m.setMatrixAt(i, place.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [tyres]);
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, tyres.length]}
      frustumCulled={false}
    >
      <meshStandardMaterial color="#14121c" roughness={0.9} />
    </instancedMesh>
  );
}
