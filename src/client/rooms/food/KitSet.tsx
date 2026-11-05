// Instance all material parts of a Quaternius restaurant model at a common fit.
import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Placement = readonly [number, number, number, number];

function Part({
  geometry,
  material,
  at,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  at: readonly Placement[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    at.forEach(([x, y, z, yaw], i) => {
      rotation.setFromAxisAngle(up, yaw);
      mesh.setMatrixAt(
        i,
        matrix.compose(new THREE.Vector3(x, y, z), rotation, scale),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [at]);
  return <instancedMesh ref={ref} args={[geometry, material, at.length]} />;
}

export function KitSet({
  model,
  width,
  depth,
  height,
  at,
}: {
  model: string;
  width: number;
  depth: number;
  height: number;
  at: readonly Placement[];
}) {
  const { scene } = useGLTF(`/models/props/sushi-${model}.glb`);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    if (!meshes.length) throw new Error(`${model} has no meshes`);
    const geometries = meshes.map((mesh) =>
      mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),
    );
    const box = new THREE.Box3();
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = Math.min(width / size.x, depth / size.z, height / size.y);
    return geometries.map((geometry, i) => ({
      geometry: geometry
        .translate(-center.x, -box.min.y, -center.z)
        .scale(scale, scale, scale),
      material: meshes[i].material,
    }));
  }, [scene, model, width, depth, height]);
  return (
    <>
      {parts.map((part, i) => (
        <Part key={i} {...part} at={at} />
      ))}
    </>
  );
}
