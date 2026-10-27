// The reef's props from public/models/ocean/reef.glb (MiniPoly's coral sets,
// Mohabins' seaweed, Quaternius' anchor and Kenney's ship wreck; all in
// docs/assets.md): each kind is one mesh node, drawn as one InstancedMesh, so
// a whole reef is a handful of draw calls.

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, type JSX } from "react";
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

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

/** Many copies of one reef part: `floorY(x, z)` is the ground under each. */
export function Scatter({
  name,
  items,
  floorY = () => 0,
  sink = 0,
}: {
  name: string;
  items: readonly Placed[];
  floorY?: (x: number, z: number) => number;
  /** Meters of the part buried in the ground (a coral's base). */
  sink?: number;
}): JSX.Element | null {
  const part = usePart(name);
  const mesh = useMemo(() => {
    if (!part) return null;
    const im = new THREE.InstancedMesh(
      part.geometry,
      part.material,
      Math.max(1, items.length),
    );
    im.frustumCulled = false;
    im.count = items.length;
    return im;
  }, [part, items.length]);
  useLayoutEffect(() => {
    if (!mesh) return;
    items.forEach((it, i) => {
      p.set(it.at[0], floorY(it.at[0], it.at[1]) - sink, it.at[1]);
      q.setFromEuler(e.set(0, it.yaw, 0));
      s.setScalar(it.scale);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [mesh, items, floorY, sink]);
  useLayoutEffect(() => () => mesh?.dispose(), [mesh]);
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
