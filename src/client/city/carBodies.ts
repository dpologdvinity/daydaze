// Loading the downloaded car bodies (public/models/cars/, see
// src/game/driving/bodies.ts): float geometry per material bucket for the
// player's own car (CarMesh), and one merged geometry per body for instanced
// traffic (trafficBodies.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BODY_BUCKETS, type BodyBucket } from "../../game/driving/bodies.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";

/** A body's geometry by bucket; a bucket is missing when the body has none. */
export type BodyGeometry = Partial<Record<BodyBucket, THREE.BufferGeometry>>;

const isBucket = (name: string): name is BodyBucket =>
  BODY_BUCKETS.some((b) => b === name);

/** The bucket a mesh belongs to: its name, else its material's ("CarPaint"). */
function bucketOf(mesh: THREE.Mesh): BodyBucket | null {
  if (isBucket(mesh.name)) return mesh.name;
  const material = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  const name = material?.name.replace(/^Car/, "").toLowerCase() ?? "";
  return isBucket(name) ? name : null;
}

/** The vertex colors as plain floats, three to a vertex (the GLB stores bytes). */
function floatColors(g: THREE.BufferGeometry): void {
  const c = g.getAttribute("color");
  const out = new Float32Array(g.getAttribute("position").count * 3);
  for (let i = 0; i < c.count; i++) {
    out[i * 3] = c.getX(i);
    out[i * 3 + 1] = c.getY(i);
    out[i * 3 + 2] = c.getZ(i);
  }
  g.setAttribute("color", new THREE.BufferAttribute(out, 3));
}

const made = new WeakMap<THREE.Object3D, BodyGeometry>();

/**
 * The buckets of a loaded body GLB as float geometry with the node transforms
 * baked in (the optimized files are quantized). Cached per scene, shared by
 * every car wearing the body: never dispose it.
 */
export function bodyGeometry(scene: THREE.Object3D): BodyGeometry {
  const cached = made.get(scene);
  if (cached) return cached;
  scene.updateMatrixWorld(true);
  const out: BodyGeometry = {};
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const bucket = bucketOf(o);
    if (!bucket) return;
    const g = bakedGeometry(o);
    g.deleteAttribute("uv");
    floatColors(g);
    out[bucket] = g;
  });
  if (!out.paint) throw new Error("car body has no paint mesh");
  made.set(scene, out);
  return out;
}

/** What `aPart` holds on a vertex: body, paint (takes the car's color) or lamp. */
export const PART = { other: 0, paint: 1, light: 2 } as const;

/**
 * One geometry for a whole body: every bucket merged, with `aPart` telling the
 * traffic shader which vertices take the per-car paint and which glow at night.
 */
export function mergedBody(parts: BodyGeometry): THREE.BufferGeometry {
  const list = BODY_BUCKETS.flatMap((bucket) => {
    const source = parts[bucket];
    if (!source) return [];
    const g = source.clone();
    const part =
      bucket === "paint"
        ? PART.paint
        : bucket === "light"
          ? PART.light
          : PART.other;
    g.setAttribute(
      "aPart",
      new THREE.BufferAttribute(
        new Float32Array(g.getAttribute("position").count).fill(part),
        1,
      ),
    );
    return [g];
  });
  const merged = mergeGeometries(list);
  for (const g of list) g.dispose();
  if (!merged) throw new Error("car body parts failed to merge");
  return merged;
}
