import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bakedGeometry } from "../../world/bakedGeometry.ts";
import { tintHsl } from "../../../game/home/palette.ts";

// Generated props (Meshy) live in public/models/props/<model>.glb, one mesh
// each. Wrap users in Suspense, with the old placeholder as the fallback.

type Fit = { width: number; depth: number; height: number };

/** The model's parts (one mesh per material), their geometry scaled together to
 * fit `width` by `depth` meters and no taller than `height`, centered, standing
 * on y = 0. */
export function useFittedParts(
  model: string,
  { width, depth, height }: Fit,
  dir = "props",
) {
  const { scene } = useGLTF(`/models/${dir}/${model}.glb`);
  return useMemo(() => {
    const parts: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
    }[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const material = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!material) return;
      const geometry = bakedGeometry(o);
      parts.push({ geometry, material });
    });
    if (parts.length === 0) throw new Error(`${model}.glb has no mesh`);
    const box = new THREE.Box3();
    for (const { geometry } of parts) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
    }
    const size = box.getSize(new THREE.Vector3());
    const s = Math.min(width / size.x, depth / size.z, height / size.y);
    const c = box.getCenter(new THREE.Vector3());
    for (const { geometry } of parts)
      geometry.translate(-c.x, -box.min.y, -c.z).scale(s, s, s);
    return parts;
  }, [scene, model, width, depth, height]);
}

/** The model's first part, fitted like useFittedParts (for instanced users). */
export function useFitted(model: string, fit: Fit, dir = "props") {
  const [part] = useFittedParts(model, fit, dir);
  if (!part) throw new Error(`${model}.glb has no mesh`);
  return part;
}

/** Paints `picture` over the screen faces: planar UVs from the faces' own
 * bounds (the front is +z, x runs right, y up), lit by itself. */
function showPicture(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  picture: THREE.Texture,
) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  const pos = geometry.getAttribute("position");
  const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
  for (let i = 0; i < pos.count; i++)
    uv.setXY(
      i,
      (pos.getX(i) - box.min.x) / (box.max.x - box.min.x || 1),
      (pos.getY(i) - box.min.y) / (box.max.y - box.min.y || 1),
    );
  geometry.setAttribute("uv", uv);
  material.map = picture;
  material.emissiveMap = picture;
  material.color.set("#000000");
  material.emissive.set("#ffffff");
  material.emissiveIntensity = 0.7;
  material.needsUpdate = true;
}

/** One prop, `yaw` turning it about its own center. */
export function Prop({
  model,
  width,
  depth,
  height,
  yaw = 0,
  dir,
  tint = 0,
  screen,
  ...rest
}: {
  model: string;
  yaw?: number;
  dir?: string;
  /** A furniture look (game/home/palette.ts); 0 keeps the model's colors. */
  tint?: number;
  /** A picture for the model's "screen" material (a TV showing something). */
  screen?: THREE.Texture;
} & Fit &
  Omit<ThreeElements["group"], "children">) {
  const fitted = useFittedParts(model, { width, depth, height }, dir);
  const parts = useMemo(() => {
    if (tint === 0 && !screen) return fitted;
    // the loaded materials are shared by every copy: recolor clones
    return fitted.map(({ geometry, material }) => {
      const copy = material.clone();
      if (
        screen &&
        copy.name === "screen" &&
        copy instanceof THREE.MeshStandardMaterial
      ) {
        showPicture(geometry, copy, screen);
      } else if (copy instanceof THREE.MeshStandardMaterial && tint > 0) {
        const hsl = { h: 0, s: 0, l: 0 };
        copy.color.getHSL(hsl);
        const t = tintHsl(hsl, tint);
        copy.color.setHSL(t.h, t.s, t.l);
      }
      return { geometry, material: copy };
    });
  }, [fitted, tint, screen]);
  useEffect(
    () => () => {
      if (parts !== fitted) for (const p of parts) p.material.dispose();
    },
    [parts, fitted],
  );
  return (
    <group {...rest}>
      <group rotation-y={yaw}>
        {parts.map((p, i) => (
          <mesh key={i} geometry={p.geometry} material={p.material} />
        ))}
      </group>
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
