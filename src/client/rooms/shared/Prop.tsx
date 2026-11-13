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

/** Clones of `parts` with every material's color multiplied by `shade`: a
 * room's mood (dusty and dim, neon-tinted) over the model's own colors. The
 * loaded materials are shared by every copy, so they are never edited. */
function useShaded(
  parts: ReturnType<typeof useFittedParts>,
  shade: THREE.ColorRepresentation | undefined,
  paint?: THREE.ColorRepresentation,
) {
  const shaded = useMemo(() => {
    if (shade === undefined && paint === undefined) return parts;
    return parts.map(({ geometry, material }) => {
      const copy = material.clone();
      if (copy instanceof THREE.MeshStandardMaterial) {
        // paint replaces the color outright (a retro vinyl couch); shade
        // only dims or tints what is there
        if (paint !== undefined) copy.color.set(paint);
        if (shade !== undefined) copy.color.multiply(new THREE.Color(shade));
      }
      return { geometry, material: copy };
    });
  }, [parts, shade, paint]);
  useEffect(
    () => () => {
      if (shaded !== parts) for (const p of shaded) p.material.dispose();
    },
    [shaded, parts],
  );
  return shaded;
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
  shade,
  paint,
  screen,
  ...rest
}: {
  model: string;
  yaw?: number;
  dir?: string;
  /** A color every material is multiplied by (dust, dim, a neon wash). */
  shade?: THREE.ColorRepresentation;
  /** A color every material is set to, keeping its maps (before `shade`). */
  paint?: THREE.ColorRepresentation;
  /** A furniture look (game/home/palette.ts); 0 keeps the model's colors. */
  tint?: number;
  /** A picture for the model's "screen" material (a TV showing something). */
  screen?: THREE.Texture;
} & Fit &
  Omit<ThreeElements["group"], "children">) {
  const fitted0 = useFittedParts(model, { width, depth, height }, dir);
  const fitted = useShaded(fitted0, shade, paint);
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

/** Many copies of one prop: `at` is [x, y, z, yaw]. One instanced draw per
 * material when `allParts` (the House Interior models have several), else just
 * the model's first part, as the single-mesh props always drew. */
export function PropSet({
  model,
  width,
  depth,
  height,
  at,
  dir,
  shade,
  paint,
  allParts = false,
}: {
  model: string;
  at: readonly (readonly [number, number, number, number])[];
  dir?: string;
  shade?: THREE.ColorRepresentation;
  paint?: THREE.ColorRepresentation;
  allParts?: boolean;
} & Fit) {
  const every = useShaded(
    useFittedParts(model, { width, depth, height }, dir),
    shade,
    paint,
  );
  const parts = useMemo(
    () => (allParts ? every : every.slice(0, 1)),
    [allParts, every],
  );
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    for (const mesh of refs.current) {
      if (!mesh) continue;
      at.forEach(([x, y, z, yaw], i) => {
        q.setFromAxisAngle(up, yaw);
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, one));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [at, parts]);
  return (
    <>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          args={[p.geometry, p.material, at.length]}
        />
      ))}
    </>
  );
}
