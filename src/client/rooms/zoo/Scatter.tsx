// Draws a downloaded GLB prop many times: one InstancedMesh per part of the
// model, one matrix per spot (zoo.ts Spot). Static, so the matrices are built
// once. Used for the zoo's fences, rocks and trees.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Spot } from "../../../game/zoo.ts";
import { disposeInstanced } from "../../city/dispose.ts";
import { bakedGeometry } from "../../world/bakedGeometry.ts";

export function Scatter({
  url,
  spots,
  color,
  cutout,
  smooth,
}: {
  url: string;
  spots: readonly Spot[];
  /** Repaints every material this color (keeps each one's shading), so the
   * downloaded prop wears the zoo's palette. */
  color?: string;
  /** Treats a material with a texture as leaves: cut out where the texture
   * is clear (alpha test, two-sided) instead of blended. */
  cutout?: boolean;
  /** Welds shared vertices and recomputes normals, so a faceted low-poly
   * rock or bush shades as a rounded form. */
  smooth?: boolean;
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
      // bakedGeometry: the optimized GLBs store quantized integers, which a baked
      // transform would truncate or clamp (squashed trees, black normals)
      let geometry = bakedGeometry(o);
      if (smooth) {
        geometry = geometry.clone();
        geometry.deleteAttribute("normal");
        geometry = mergeVertices(geometry, 1e-3);
        geometry.computeVertexNormals();
      }
      const source = Array.isArray(o.material) ? o.material[0] : o.material;
      const material = source?.clone();
      if (color && material instanceof THREE.MeshStandardMaterial) {
        material.color.set(color);
        // Kenney's rocks are fully metallic, which reads as black without an
        // environment map
        material.metalness = 0;
      }
      if (
        cutout &&
        material instanceof THREE.MeshStandardMaterial &&
        material.map
      ) {
        material.alphaTest = 0.5;
        material.transparent = false;
        material.depthWrite = true;
        material.side = THREE.DoubleSide;
      }
      const inst = new THREE.InstancedMesh(geometry, material, spots.length);
      spots.forEach((spot, i) => {
        q.setFromAxisAngle(up, spot.yaw);
        m.compose(
          p.set(spot.x, spot.y ?? 0, spot.z),
          q,
          s.set(spot.sx, spot.sy, spot.sz),
        );
        inst.setMatrixAt(i, m);
      });
      inst.frustumCulled = false;
      out.push(inst);
    });
    return out;
  }, [gltf, spots, color, cutout, smooth]);
  useEffect(() => () => disposeInstanced(meshes, true), [meshes]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
