// Merges a far doll's garment twins (top, bottom, outerwear...) into one
// skinned mesh tinted per vertex and textured from one atlas, so
// mix-and-match clothes cost one draw call at a distance, like the single
// outfit model they replaced.
import * as THREE from "three";

/** Where a piece's detail map sits in the atlas, in atlas UVs: x, y, width,
 * height. A zero-size rect points every vertex at one spot (a white cell,
 * for a piece with no map). */
export type Rect = readonly [number, number, number, number];

/** A built garment mesh (bound to the body's bones), its tint, and where its
 * map is in the atlas (pieces given no rect make an untextured merge). */
export type Piece = {
  mesh: THREE.SkinnedMesh;
  color: THREE.ColorRepresentation;
  rect?: Rect | undefined;
};

const TOLERANCE = 1e-4;

/** The far twins' atlas: at most this many pixels a side, one cell per
 * detail map and a white cell (for untextured garments) last. */
export const ATLAS = 1024;

/** Each image's cell in the atlas grid, the white cell last. */
export const atlasCols = (images: number) => Math.ceil(Math.sqrt(images + 1));

/** Where image `i` of `count` sits in the atlas, inset a texel or two so
 * mipmaps blend less of the next cell in; `i === count` is the white cell. */
export function atlasRect(i: number, count: number): Rect {
  const cols = atlasCols(count);
  const size = 1 / cols;
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * size;
  if (i === count) return [x + size / 2, y + size / 2, 0, 0];
  const inset = 2 / ATLAS;
  return [x + inset, y + inset, size - 2 * inset, size - 2 * inset];
}

/** The morph attributes a merge carries. */
const MORPHS = ["position", "normal"] as const;

/** Every component of an attribute as plain floats (meshopt files store
 * quantized, normalized or interleaved data). */
function floats(
  attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) {
  const out = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++)
    for (let c = 0; c < attr.itemSize; c++)
      out[i * attr.itemSize + c] = attr.getComponent(i, c);
  return out;
}

const near = (a: THREE.Matrix4, b: THREE.Matrix4) =>
  a.elements.every((x, i) => Math.abs(x - (b.elements[i] ?? 0)) < TOLERANCE);

/**
 * One skinned mesh holding every piece, or null when they can't share one
 * skeleton (the caller then keeps them apart). Each file may store its
 * vertices in its own frame (quantization folds a scale and offset into its
 * inverse bind matrices); a piece's vertices move into the first piece's
 * frame, found from a joint they share, and the frame must agree on every
 * joint the piece uses. Positions, normals, weights and every morph target
 * (zeros where a piece lacks one) come along. Each vertex takes its piece's
 * tint; when the pieces carry atlas rects their UVs move into them, so one
 * atlas texture (made by the caller) keeps denim and stripes.
 */
export function mergeGarments(
  pieces: readonly Piece[],
  shoeTuck?: string,
): THREE.SkinnedMesh | null {
  const first = pieces[0];
  if (!first) return null;
  // the shared skeleton: each body bone once, with its inverse bind matrix
  // in the first piece's frame (the bind matrix folded in)
  const bones: THREE.Bone[] = [];
  const binds: THREE.Matrix4[] = [];
  const slot = new Map<THREE.Bone, number>();
  const names: string[] = [];
  for (const { mesh } of pieces)
    for (const name of Object.keys(mesh.morphTargetDictionary ?? {}))
      if (
        (!name.startsWith("in_") || name === shoeTuck) &&
        !names.includes(name)
      )
        names.push(name);
  const withNormals = pieces.every(
    ({ mesh }) =>
      !mesh.morphTargetDictionary ||
      Object.keys(mesh.morphTargetDictionary).length === 0 ||
      mesh.geometry.morphAttributes.normal !== undefined,
  );
  const geoms: THREE.BufferGeometry[] = [];
  const linear = new THREE.Color();
  const atlas = pieces.some((p) => p.rect);
  for (const { mesh, color, rect } of pieces) {
    const src = mesh.geometry;
    const pos = src.getAttribute("position");
    const nrm = src.getAttribute("normal");
    const index = src.getAttribute("skinIndex");
    const weight = src.getAttribute("skinWeight");
    if (!pos || !nrm || !index || !weight) return null;
    // the per-joint bind of this piece, and the frame change into the first
    const own = mesh.skeleton.bones.map((_, i) =>
      (mesh.skeleton.boneInverses[i] ?? new THREE.Matrix4())
        .clone()
        .multiply(mesh.bindMatrix),
    );
    let frame: THREE.Matrix4 | null = null;
    for (const [i, bone] of mesh.skeleton.bones.entries()) {
      const at = slot.get(bone);
      const mine = own[i];
      if (at === undefined || !mine) continue;
      frame = binds[at]?.clone().invert().multiply(mine) ?? null;
      break;
    }
    frame ??= new THREE.Matrix4();
    // joints new to the skeleton take this piece's bind, moved into the frame
    const toShared = frame.clone().invert();
    const used = new Set<number>();
    for (let v = 0; v < index.count; v++)
      for (let c = 0; c < 4; c++)
        if (weight.getComponent(v, c) > 0) used.add(index.getComponent(v, c));
    const remap: number[] = [];
    for (const [i, bone] of mesh.skeleton.bones.entries()) {
      const mine = own[i];
      if (!mine) return null;
      let at = slot.get(bone);
      if (at === undefined) {
        at = bones.length;
        slot.set(bone, at);
        bones.push(bone);
        binds.push(mine.clone().multiply(toShared));
      } else if (used.has(i)) {
        // the frame must hold for every joint that moves this piece
        const check = binds[at]?.clone().multiply(frame);
        if (!check || !near(check, mine)) return null;
      }
      remap[i] = at;
    }
    const g = new THREE.BufferGeometry();
    const p = floats(pos);
    const n = floats(nrm);
    // normals turn with the frame but keep their length (quantization
    // scales uniformly), so a normal and its morph deltas stay in step
    const normalFrame = new THREE.Matrix3().getNormalMatrix(frame);
    const size = Math.cbrt(Math.abs(normalFrame.determinant()));
    if (size > 0) normalFrame.multiplyScalar(1 / size);
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromArray(p, i * 3)
        .applyMatrix4(frame)
        .toArray(p, i * 3);
      v3.fromArray(n, i * 3)
        .applyMatrix3(normalFrame)
        .normalize()
        .toArray(n, i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
    const joints = new Uint16Array(index.count * 4);
    for (let i = 0; i < index.count; i++)
      for (let c = 0; c < 4; c++)
        joints[i * 4 + c] = remap[index.getComponent(i, c)] ?? 0;
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(floats(weight), 4));
    linear.set(color);
    const tint = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) linear.toArray(tint, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(tint, 3));
    if (atlas) {
      // the piece's UVs, clamped into its cell (no map: the cell's corner)
      const [x, y, w, h] = rect ?? [0, 0, 0, 0];
      const uv = src.getAttribute("uv");
      const out = new Float32Array(pos.count * 2);
      const clamp = (t: number) => Math.min(1, Math.max(0, t));
      for (let i = 0; i < pos.count; i++) {
        out[i * 2] = x + (uv ? clamp(uv.getX(i)) : 0) * w;
        out[i * 2 + 1] = y + (uv ? clamp(uv.getY(i)) : 0) * h;
      }
      g.setAttribute("uv", new THREE.BufferAttribute(out, 2));
    }
    const order = src.index
      ? floats(src.index)
      : Float32Array.from({ length: pos.count }, (_, i) => i);
    g.setIndex(Array.from(order));
    // morph deltas turn with the frame's linear part only
    const turn = new THREE.Matrix3().setFromMatrix4(frame);
    for (const kind of withNormals ? MORPHS : MORPHS.slice(0, 1)) {
      g.morphAttributes[kind] = names.map((name) => {
        const k = mesh.morphTargetDictionary?.[name];
        const from =
          k === undefined ? undefined : src.morphAttributes[kind]?.[k];
        const d = from ? floats(from) : new Float32Array(pos.count * 3);
        if (from)
          for (let i = 0; i < pos.count; i++)
            v3.fromArray(d, i * 3)
              .applyMatrix3(kind === "normal" ? normalFrame : turn)
              .toArray(d, i * 3);
        const attr = new THREE.BufferAttribute(d, 3);
        attr.name = name;
        return attr;
      });
    }
    g.morphTargetsRelative = true;
    geoms.push(g);
  }
  const merged = mergeAll(geoms);
  if (!merged) return null;
  const out = new THREE.SkinnedMesh(
    merged,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
  );
  out.updateMorphTargets();
  out.morphTargetInfluences?.fill(0);
  // the binds already carry each piece's bind matrix: bind at identity
  out.bind(new THREE.Skeleton(bones, binds), new THREE.Matrix4());
  out.frustumCulled = false;
  return out;
}

/** Concatenates geometries that share the same attributes and morphs. */
function mergeAll(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const out = new THREE.BufferGeometry();
  const total = geoms.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const index: number[] = [];
  let base = 0;
  for (const g of geoms) {
    for (const i of g.index?.array ?? []) index.push(i + base);
    base += g.getAttribute("position").count;
  }
  out.setIndex(index);
  const join = (parts: THREE.BufferAttribute[], size: number) => {
    const first = parts[0];
    const data =
      first?.array instanceof Uint16Array
        ? new Uint16Array(total * size)
        : new Float32Array(total * size);
    let at = 0;
    for (const a of parts) {
      data.set(a.array, at);
      at += a.array.length;
    }
    const attr = new THREE.BufferAttribute(data, size);
    attr.name = first?.name ?? "";
    return attr;
  };
  const attrs = (g: THREE.BufferGeometry, name: string) => {
    const a = g.getAttribute(name);
    return a instanceof THREE.BufferAttribute ? a : null;
  };
  for (const [name, size] of [
    ["position", 3],
    ["normal", 3],
    ["skinIndex", 4],
    ["skinWeight", 4],
    ["color", 3],
    ["uv", 2],
  ] as const) {
    // only an atlas merge has UVs
    if (name === "uv" && !geoms[0]?.getAttribute("uv")) continue;
    const parts = geoms.map((g) => attrs(g, name));
    if (parts.some((a) => !a)) return null;
    out.setAttribute(
      name,
      join(
        parts.filter((a) => a !== null),
        size,
      ),
    );
  }
  for (const kind of MORPHS) {
    if (!geoms[0]?.morphAttributes[kind]) continue;
    const count = geoms[0]?.morphAttributes[kind]?.length ?? 0;
    out.morphAttributes[kind] = Array.from({ length: count }, (_, k) =>
      join(
        geoms.flatMap((g) => {
          const a = g.morphAttributes[kind]?.[k];
          return a instanceof THREE.BufferAttribute ? [a] : [];
        }),
        3,
      ),
    );
  }
  out.morphTargetsRelative = true;
  return out;
}
