// Draws a downloaded GLB prop many times: one InstancedMesh per part of the
// model, one matrix per spot (zoo.ts Spot). Static, so the matrices are built
// once. Used for the zoo's fences, rocks and trees.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import type { Spot } from "../../../game/zoo.ts";
import { disposeInstanced } from "../../city/dispose.ts";

export function Scatter({
  url,
  spots,
  color,
}: {
  url: string;
  spots: readonly Spot[];
  /** Repaints every material this color (keeps each one's shading), so the
   * downloaded prop wears the zoo's palette. */
  color?: string;
}): JSX.Element {
  const gltf = useGLTF(url);
  const meshes = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const out: THREE.InstancedMesh[] = [];
    gltf.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = (o.geometry as THREE.BufferGeometry).clone();
      geometry.applyMatrix4(o.matrixWorld);
      const source = Array.isArray(o.material) ? o.material[0] : o.material;
      const material = source?.clone();
      if (color && material instanceof THREE.MeshStandardMaterial)
        material.color.set(color);
      const inst = new THREE.InstancedMesh(geometry, material, spots.length);
      spots.forEach((spot, i) => {
        q.setFromAxisAngle(up, spot.yaw);
        m.compose(
          p.set(spot.x, 0, spot.z),
          q,
          s.set(spot.sx, spot.sy, spot.sz),
        );
        inst.setMatrixAt(i, m);
      });
      inst.frustumCulled = false;
      out.push(inst);
    });
    return out;
  }, [gltf, spots, color]);
  useEffect(() => () => disposeInstanced(meshes, true), [meshes]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
