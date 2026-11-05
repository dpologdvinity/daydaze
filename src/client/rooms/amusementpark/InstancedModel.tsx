// A downloaded GLB drawn `count` times as instanced meshes (one per part of
// the model) that a ride moves every frame: `update` is handed a setter that
// places copy k with a matrix. Used for the coaster cars, flume logs and
// Ferris wheel gondolas. Nothing is allocated per frame.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";

export type PlaceCopy = (k: number, matrix: THREE.Matrix4) => void;

export function InstancedModel({
  url,
  count,
  update,
  tints,
}: {
  url: string;
  count: number;
  /** Called every frame (after the elapsed seconds) to place each copy. */
  update: (place: PlaceCopy, elapsed: number) => void;
  /** Colors that tint the copies in turn (the model's own colors times these). */
  tints?: readonly string[];
}): JSX.Element {
  const gltf = useGLTF(url);
  const meshes = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const out: THREE.InstancedMesh[] = [];
    gltf.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = (o.geometry as THREE.BufferGeometry).clone();
      geometry.applyMatrix4(o.matrixWorld);
      const source = Array.isArray(o.material) ? o.material[0] : o.material;
      const material = source?.clone();
      // transmission makes three.js draw the whole scene a second time into
      // a buffer: fake the glass with plain alpha blending instead
      if (
        material instanceof THREE.MeshPhysicalMaterial &&
        material.transmission > 0
      ) {
        material.transmission = 0;
        material.transparent = true;
        material.opacity = 0.55;
        material.depthWrite = false;
      }
      const inst = new THREE.InstancedMesh(geometry, material, count);
      // the copies move far from the origin: skip the culling test
      inst.frustumCulled = false;
      if (tints?.length)
        for (let k = 0; k < count; k++)
          inst.setColorAt(k, new THREE.Color(tints[k % tints.length]));
      out.push(inst);
    });
    return out;
  }, [gltf, count, tints]);
  // free the cloned geometry and materials when the ride unloads
  useEffect(
    () => () => {
      for (const m of meshes) {
        m.geometry.dispose();
        if (!Array.isArray(m.material)) m.material.dispose();
        m.dispose();
      }
    },
    [meshes],
  );
  const place = useMemo<PlaceCopy>(
    () => (k, matrix) => {
      for (const m of meshes) m.setMatrixAt(k, matrix);
    },
    [meshes],
  );
  useFrame(({ clock }) => {
    update(place, clock.elapsedTime);
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
