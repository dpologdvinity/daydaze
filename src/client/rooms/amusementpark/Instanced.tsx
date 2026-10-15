import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../game/amusementPark.ts";

// Instanced helpers: many struts or boxes drawn in one call. Item lists must be
// stable (module-level or memoised) because the matrices are written on change.

const UP = new THREE.Vector3(0, 1, 0);

export type Segment = { from: Vec3; to: Vec3; radius: number };

/** Straight struts between two points each, one instanced cylinder. */
export function Segments({
  items,
  color = "#2a1d3a",
}: {
  items: readonly Segment[];
  color?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();
    items.forEach((s, i) => {
      a.set(...s.from);
      b.set(...s.to);
      dir.subVectors(b, a);
      const length = dir.length();
      o.position.addVectors(a, b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(UP, dir.normalize());
      o.scale.set(s.radius, length, s.radius);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </instancedMesh>
  );
}

export type Box = {
  position: Vec3;
  size: Vec3;
  yaw: number;
  color: string;
};

/** Boxes with a colour each, one instanced draw call. */
export function Boxes({ items }: { items: readonly Box[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((b, i) => {
      o.position.set(...b.position);
      o.rotation.set(0, b.yaw, 0);
      o.scale.set(...b.size);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

export type Copy = { position: Vec3; yaw?: number; color?: string };

/**
 * One instanced draw of `geometry` at each copy. A copy's colour multiplies the
 * material colour, so a white material takes the colour as its paint.
 */
export function Copies({
  geometry,
  material,
  items,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: readonly Copy[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((c, i) => {
      o.position.set(...c.position);
      o.rotation.set(0, c.yaw ?? 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(c.color ?? "#ffffff"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} />;
}
