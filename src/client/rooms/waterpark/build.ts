// Geometry helpers for the Water Park: `Props` merges tinted parts into one
// vertex-colored mesh (one draw call), and `instanced` builds an instanced mesh
// that is never frustum culled.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = readonly [number, number, number];

/**
 * Unit geometry placed, tinted and merged into one mesh with vertex colors
 * (see `PROPS`), so a whole prop or area costs one draw call. `within` opens a
 * sub-frame for a prop's own parts.
 */
export class Props {
  private readonly parts: THREE.BufferGeometry[];
  private readonly frame: THREE.Matrix4;

  constructor(frame = new THREE.Matrix4(), parts: THREE.BufferGeometry[] = []) {
    this.frame = frame;
    this.parts = parts;
  }

  /** The same collection in a frame moved to (x, y, z), turned by ry and scaled by s. */
  within(x: number, y: number, z: number, ry = 0, s = 1): Props {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(s, s, s),
    );
    return new Props(this.frame.clone().multiply(local), this.parts);
  }

  /**
   * Places a copy of `geo` at `at` (meters), Euler `rot` (radians) and `scale`
   * inside this frame, tinted `color`. Only position and normal survive (UVs
   * are dropped), and `geo` itself is not changed.
   */
  add(
    geo: THREE.BufferGeometry,
    color: string,
    at: V3 = [0, 0, 0],
    rot: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
  ): this {
    const g = this.posed(geo, ["position", "normal"], at, rot, scale);
    const c = new THREE.Color(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  /**
   * Like `add`, for a model that carries its own vertex colors as a float
   * vec3 (the beach props, see useBeachProps): they are kept instead of
   * tinted. Throws if `geo` has none.
   */
  addPainted(
    geo: THREE.BufferGeometry,
    at: V3 = [0, 0, 0],
    rot: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
  ): this {
    if (!geo.getAttribute("color"))
      throw new Error("addPainted: the model has no vertex colors");
    this.parts.push(
      this.posed(geo, ["position", "normal", "color"], at, rot, scale),
    );
    return this;
  }

  /** A de-indexed copy of `geo` with only the `keep` attributes, moved into this frame. */
  private posed(
    geo: THREE.BufferGeometry,
    keep: readonly string[],
    at: V3,
    rot: V3,
    scale: V3,
  ): THREE.BufferGeometry {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!keep.includes(name)) g.deleteAttribute(name);
    }
    g.applyMatrix4(this.frame.clone().multiply(local));
    return g;
  }

  /**
   * Merges every part added so far, including parts added through `within`
   * frames, into one geometry. Throws if the parts do not share attributes.
   */
  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts);
    if (!merged) throw new Error("Props parts do not share attributes.");
    return merged;
  }
}

/**
 * An instanced mesh that skips frustum culling. Its bounds come from the
 * instances, not the base geometry at the origin, so culling would drop it.
 */
export function instanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  return mesh;
}
