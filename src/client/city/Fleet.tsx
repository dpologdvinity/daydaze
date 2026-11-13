// The offshore fleet (src/game/ships.ts): downloaded ships at anchor, rocking
// on the swell. Each ship is one mesh with one material (a palette strip for
// color, a second strip lighting only the windows, art/marina/build_fleet.py),
// so a ship costs one draw call. `night` (0 by day, 1 at night) dims the hull
// the way the rest of the city dims (CityFurniture) and lights the windows.
// Poses come from the pure shipPose and are written into preallocated
// objects: nothing is allocated per frame. Under reduced motion the ships
// hold still.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  makePoses,
  shipModel,
  shipPose,
  type ShipSpec,
} from "../../game/ships.ts";
import { useReducedMotion } from "../motion.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";

/** How much of its color a hull keeps at full night (as CityFurniture's 1 - 0.55 * night). */
const NIGHT_DIM = 0.55;

type Hull = {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
};

/** The model's one mesh, with a material of its own (the loader's is shared across rooms). */
function hullOf(scene: THREE.Object3D): Hull | undefined {
  let found: Hull | undefined;
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (found || !(o instanceof THREE.Mesh)) return;
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (material instanceof THREE.MeshStandardMaterial)
      found = { geometry: bakedGeometry(o), material: material.clone() };
  });
  return found;
}

/**
 * The ships of `fleet`, floating on a water line at height `waterY`. `far`
 * draws the decimated twins (the city's horizon). Wrap in Suspense: the models
 * load on first use.
 */
export function Fleet({
  fleet,
  waterY,
  night,
  far = false,
}: {
  fleet: readonly ShipSpec[];
  waterY: number;
  night: number;
  far?: boolean;
}): JSX.Element {
  const calm = useReducedMotion();
  const models = useMemo(
    () => [...new Set(fleet.map((s) => shipModel(s.kind, far)))],
    [fleet, far],
  );
  const gltfs = useGLTF(models.map((m) => `/models/${m}.glb`));
  const hulls = useMemo(() => {
    const out = new Map<string, Hull>();
    models.forEach((model, i) => {
      const scene = gltfs[i]?.scene;
      const hull = scene && hullOf(scene);
      if (hull) out.set(model, hull);
    });
    return out;
  }, [models, gltfs]);
  useEffect(
    () => () => {
      for (const { geometry, material } of hulls.values()) {
        geometry.dispose();
        material.dispose();
      }
    },
    [hulls],
  );
  // by night the hulls darken and the windows light up
  useEffect(() => {
    for (const { material } of hulls.values()) {
      material.color.setScalar(1 - NIGHT_DIM * night);
      material.emissiveIntensity = night;
    }
  }, [hulls, night]);
  // browser tests and the screenshot script wait for the ships to be in
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    canvas.dataset.fleet = String(hulls.size);
  }, [canvas, hulls]);
  const poses = useMemo(() => makePoses(fleet.length), [fleet]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    for (let i = 0; i < fleet.length; i++) {
      const ship = fleet[i];
      const group = groups.current[i];
      const pose = poses[i];
      if (!ship || !group || !pose) continue;
      shipPose(ship, i, t, pose);
      group.position.set(pose.x, waterY + pose.y, pose.z);
      group.rotation.set(pose.pitch, pose.yaw, pose.roll);
    }
  });
  return (
    <>
      {fleet.map((ship, i) => {
        const hull = hulls.get(shipModel(ship.kind, far));
        return (
          hull && (
            <group
              key={ship.name}
              ref={(g) => {
                groups.current[i] = g;
                if (g) g.rotation.order = "YXZ";
              }}
              scale={ship.scale}
              raycast={() => {}}
            >
              <mesh
                geometry={hull.geometry}
                material={hull.material}
                raycast={() => {}}
              />
            </group>
          )
        );
      })}
    </>
  );
}
