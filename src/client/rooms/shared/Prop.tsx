import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Generated props (Meshy) live in public/models/props/<model>.glb, one mesh
// each. Wrap users in Suspense, with the old placeholder as the fallback.

type Fit = { width: number; depth: number; height: number };

/** The model's mesh, its geometry scaled to fit `width` by `depth` meters and
 * no taller than `height`, centered, standing on y = 0. */
function useFitted(model: string, { width, depth, height }: Fit) {
  const { scene } = useGLTF(`/models/props/${model}.glb`);
  return useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    const mesh = meshes[0];
    if (!mesh) throw new Error(`${model}.glb has no mesh`);
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    const box = g.boundingBox ?? new THREE.Box3();
    const size = box.getSize(new THREE.Vector3());
    const s = Math.min(width / size.x, depth / size.z, height / size.y);
    const c = box.getCenter(new THREE.Vector3());
    g.translate(-c.x, -box.min.y, -c.z).scale(s, s, s);
    return { geometry: g, material: mesh.material };
  }, [scene, model, width, depth, height]);
}

/** One prop, `yaw` turning it about its own center. */
export function Prop({
  model,
  width,
  depth,
  height,
  yaw = 0,
  ...rest
}: { model: string; yaw?: number } & Fit &
  Omit<ThreeElements["group"], "children">) {
  const { geometry, material } = useFitted(model, { width, depth, height });
  return (
    <group {...rest}>
      <mesh geometry={geometry} material={material} rotation-y={yaw} />
    </group>
  );
}

/** Many copies of one prop in a single draw call: `at` is [x, y, z, yaw]. */
export function PropSet({
  model,
  width,
  depth,
  height,
  at,
}: {
  model: string;
  at: readonly (readonly [number, number, number, number])[];
} & Fit) {
  const { geometry, material } = useFitted(model, { width, depth, height });
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    at.forEach(([x, y, z, yaw], i) => {
      q.setFromAxisAngle(up, yaw);
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, one));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [at]);
  return <instancedMesh ref={ref} args={[geometry, material, at.length]} />;
}
