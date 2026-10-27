// The reef's props from public/models/ocean/reef.glb (MiniPoly's coral sets,
// Mohabins' seaweed, Quaternius' anchor and Kenney's ship wreck; all in
// docs/assets.md): each kind is one mesh node, drawn as one InstancedMesh, so
// a whole reef is a handful of draw calls.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import * as THREE from "three";
import type { Placed } from "../../../game/dive.ts";

export const REEF_URL = "/models/ocean/reef.glb";

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material };

/** The mesh named `name` in the reef file, or null while it has not loaded. */
export function usePart(name: string): Part | null {
  const gltf = useGLTF(REEF_URL);
  return useMemo(() => {
    let found: Part | null = null;
    gltf.scene.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.name === name &&
        !Array.isArray(o.material)
      )
        found = { geometry: o.geometry, material: o.material };
    });
    return found;
  }, [gltf, name]);
}

const UP = new THREE.Vector3(0, 1, 0);

/** Culls an instance this far from the camera (past the reef's fog). */
const FAR = 40;

/**
 * Many copies of one reef part as one InstancedMesh2: each instance is
 * frustum-culled (through a BVH) and dropped past the fog, so a dense reef
 * only pays for what is in view. `floorY(x, z)` is the ground under each.
 */
export function Scatter({
  name,
  items,
  floorY = () => 0,
  sink = 0,
  far = FAR,
}: {
  name: string;
  items: readonly Placed[];
  floorY?: (x: number, z: number) => number;
  /** Meters of the part buried in the ground (a coral's base). */
  sink?: number;
  far?: number;
}): JSX.Element | null {
  const part = usePart(name);
  const mesh = useMemo(() => {
    if (!part || items.length === 0) return null;
    const im = new InstancedMesh2(part.geometry, part.material, {
      capacity: items.length,
    });
    im.addInstances(items.length, (o, i) => {
      const it = items[i];
      if (!it) return;
      o.position.set(
        it.at[0],
        floorY(it.at[0], it.at[1]) + (it.lift ?? 0) - sink,
        it.at[1],
      );
      o.quaternion.setFromAxisAngle(UP, it.yaw);
      o.scale.setScalar(it.scale);
    });
    im.computeBVH();
    im.onFrustumEnter = (index, camera) =>
      im.getPositionAt(index).distanceToSquared(camera.position) < far * far;
    return im;
  }, [part, items, floorY, sink, far]);
  useEffect(() => () => mesh?.dispose(), [mesh]);
  return mesh ? <primitive object={mesh} /> : null;
}

/** One part drawn once, placed by hand (the wreck, the anchor). */
export function Single({
  name,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  name: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
}): JSX.Element | null {
  const part = usePart(name);
  if (!part) return null;
  return (
    <mesh
      geometry={part.geometry}
      material={part.material}
      position={[...position]}
      rotation={[...rotation]}
      scale={scale}
    />
  );
}
