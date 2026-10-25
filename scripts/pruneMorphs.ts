// Drops the morph targets (shape keys) that move none of a mesh's vertices.
//
// Every doll part is exported with all 30 of the body's shape keys, so the
// sliders can drive whatever is worn. Blender writes the ones that don't
// touch a part (a nose shape on a ponytail) as empty sparse accessors, but
// gltf-transform's optimize expands those into full arrays of zeros: on a
// hair file that is 28 dead targets, most of its download. This runs on
// Blender's output before optimize (scripts/optimize-doll.sh). The client
// looks shape keys up by name (HumanDoll's setMorph), so a missing one is
// simply skipped.
//
//   node --experimental-strip-types scripts/pruneMorphs.ts in.glb out.glb

import { readFileSync, writeFileSync } from "node:fs";

/** A target smaller than this (meters, on every axis) moves nothing visible. */
const STILL = 1e-4;

interface Accessor {
  min?: number[];
  max?: number[];
}

interface Primitive {
  targets?: Record<string, number>[];
}

interface Mesh {
  weights?: number[];
  extras?: { targetNames?: string[] };
  primitives: Primitive[];
}

/** The parts of a glTF document this script reads or edits. */
export interface Gltf {
  accessors: Accessor[];
  meshes: Mesh[];
}

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function isGltf(json: unknown): json is Gltf {
  return (
    typeof json === "object" &&
    json !== null &&
    "accessors" in json &&
    Array.isArray(json.accessors) &&
    "meshes" in json &&
    Array.isArray(json.meshes)
  );
}

/** Splits a GLB into its JSON document and binary chunk. */
export function readGlb(glb: Uint8Array): { json: Gltf; bin: Uint8Array } {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("Not a GLB.");
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK)
    throw new Error("GLB has no JSON chunk first.");
  const text = new TextDecoder().decode(glb.subarray(20, 20 + jsonLength));
  const json: unknown = JSON.parse(text);
  if (!isGltf(json)) throw new Error("GLB has no accessors or meshes.");
  const at = 20 + jsonLength;
  if (at >= glb.byteLength) return { json, bin: new Uint8Array() };
  const binLength = view.getUint32(at, true);
  if (view.getUint32(at + 4, true) !== BIN_CHUNK)
    throw new Error("GLB's second chunk is not binary.");
  return { json, bin: glb.subarray(at + 8, at + 8 + binLength) };
}

/** Packs a JSON document and binary chunk back into a GLB. */
export function writeGlb(json: Gltf, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const pad = (n: number) => (4 - (n % 4)) % 4;
  const jsonLength = text.length + pad(text.length);
  const binLength = bin.length + pad(bin.length);
  const total = 12 + 8 + jsonLength + (bin.length ? 8 + binLength : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, JSON_CHUNK, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + jsonLength); // JSON pads with spaces
  if (bin.length) {
    const at = 20 + jsonLength;
    view.setUint32(at, binLength, true);
    view.setUint32(at + 4, BIN_CHUNK, true);
    out.set(bin, at + 8);
  }
  return out;
}

/** How far a target's POSITION accessor moves any vertex, from its bounds. */
function reach(accessor: Accessor): number {
  // glTF requires min and max on POSITION; without them, keep the target
  if (!accessor.min || !accessor.max) return Infinity;
  return Math.max(...accessor.min.map(Math.abs), ...accessor.max.map(Math.abs));
}

/**
 * Removes every morph target that no primitive of its mesh moves, with its
 * weight and name. Orphaned accessors stay for optimize's prune to drop.
 */
export function pruneMorphs(glb: Uint8Array): {
  glb: Uint8Array;
  dropped: number;
} {
  const { json, bin } = readGlb(glb);
  let dropped = 0;
  for (const mesh of json.meshes) {
    const count = mesh.primitives[0]?.targets?.length ?? 0;
    const keep: number[] = [];
    for (let i = 0; i < count; i++) {
      const moves = mesh.primitives.some((p) => {
        const position = p.targets?.[i]?.POSITION;
        const accessor =
          position === undefined ? undefined : json.accessors[position];
        return accessor !== undefined && reach(accessor) >= STILL;
      });
      if (moves) keep.push(i);
    }
    if (keep.length === count) continue;
    dropped += count - keep.length;
    for (const p of mesh.primitives) {
      const targets = keep
        .map((i) => p.targets?.[i])
        .filter((t) => t !== undefined);
      if (targets.length) p.targets = targets;
      else delete p.targets;
    }
    const names = mesh.extras?.targetNames;
    if (keep.length) {
      if (mesh.weights) mesh.weights = keep.map((i) => mesh.weights?.[i] ?? 0);
      if (names && mesh.extras)
        mesh.extras.targetNames = keep.map((i) => names[i] ?? "");
    } else {
      delete mesh.weights;
      if (mesh.extras) delete mesh.extras.targetNames;
    }
  }
  return { glb: writeGlb(json, bin), dropped };
}

if (import.meta.main) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw new Error("Usage: pruneMorphs.ts <in.glb> <out.glb>");
  const { glb, dropped } = pruneMorphs(readFileSync(input));
  writeFileSync(output, glb);
  console.log(`${input}: dropped ${dropped} still morph targets`);
}
