// Merges the street pieces in view (src/game/city/streetPieces.ts) into one
// geometry per material, so the whole street dressing is two draw calls
// however many crosswalks, manholes and corners are loaded. Each piece's
// vertices are copied out of the kit model, turned, stretched and moved to its
// spot; CityScene hands over a new list every time the player has walked far
// enough to reload the plan, which is when this runs (never per frame).
import * as THREE from "three";
import {
  STREET_KINDS,
  type StreetKind,
  type StreetPiece,
} from "../../game/city/streetPieces.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";

/** One kit piece, float attributes with its node transform baked in. */
export type PieceModel = {
  position: THREE.BufferAttribute;
  normal: THREE.BufferAttribute;
  /** Atlas coordinates, on the paint decals only. */
  uv: THREE.BufferAttribute | null;
  /** Vertex colors, on the solids only. */
  color: THREE.BufferAttribute | null;
  index: ArrayLike<number>;
};

/** Where each kind sits above the road (0.04) and sidewalks (0.14). */
export const PIECE_HEIGHT: Readonly<Record<StreetKind, number>> = {
  // paint a hair above the asphalt; polygonOffset settles the rest
  crosswalk: 0.05,
  stop: 0.05,
  slow: 0.05,
  doubleYellow: 0.05,
  // the corner's base is on the ground, its top flush with the sidewalks
  corner: 0,
  manhole: 0.04,
  drain: 0.04,
  bollard: 0.14,
};

const isKind = (name: string): name is StreetKind =>
  (STREET_KINDS as readonly string[]).includes(name);

/** The kit's pieces by name, read from the loaded scene. */
export function pieceModels(
  scene: THREE.Object3D,
): Map<StreetKind, PieceModel> {
  scene.updateMatrixWorld(true);
  const models = new Map<StreetKind, PieceModel>();
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !isKind(o.name)) return;
    const geometry = bakedGeometry(o);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    if (
      !(position instanceof THREE.BufferAttribute) ||
      !(normal instanceof THREE.BufferAttribute)
    )
      return;
    const optional = (name: string) => {
      const a = geometry.getAttribute(name);
      return a instanceof THREE.BufferAttribute ? a : null;
    };
    const index = geometry.getIndex();
    if (!index) return;
    models.set(o.name, {
      position,
      normal,
      uv: optional("uv"),
      color: optional("color"),
      index: index.array,
    });
  });
  return models;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const n = new THREE.Matrix3();
const v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The pieces of the listed kinds as one geometry (positions, normals and,
 * for paint, atlas coordinates; for solids, vertex colors), or null when
 * there are none.
 */
export function mergePieces(
  pieces: readonly StreetPiece[],
  models: ReadonlyMap<StreetKind, PieceModel>,
  kinds: readonly StreetKind[],
): THREE.BufferGeometry | null {
  const wanted = pieces.filter(
    (piece) => kinds.includes(piece.kind) && models.has(piece.kind),
  );
  if (wanted.length === 0) return null;
  let vertices = 0;
  let indices = 0;
  for (const piece of wanted) {
    const model = models.get(piece.kind);
    if (!model) continue;
    vertices += model.position.count;
    indices += model.index.length;
  }
  const position = new Float32Array(vertices * 3);
  const normal = new Float32Array(vertices * 3);
  const uv = new Float32Array(vertices * 2);
  const color = new Float32Array(vertices * 3);
  const index = new Uint32Array(indices);
  let vi = 0;
  let ii = 0;
  for (const piece of wanted) {
    const model = models.get(piece.kind);
    if (!model) continue;
    q.setFromAxisAngle(UP, piece.yaw);
    p.set(piece.x, PIECE_HEIGHT[piece.kind], piece.z);
    s.set(piece.sx, 1, piece.sz);
    m.compose(p, q, s);
    n.getNormalMatrix(m);
    for (let i = 0; i < model.position.count; i++) {
      v.fromBufferAttribute(model.position, i).applyMatrix4(m);
      position.set([v.x, v.y, v.z], (vi + i) * 3);
      v.fromBufferAttribute(model.normal, i).applyMatrix3(n).normalize();
      normal.set([v.x, v.y, v.z], (vi + i) * 3);
      if (model.uv) uv.set([model.uv.getX(i), model.uv.getY(i)], (vi + i) * 2);
      if (model.color)
        color.set(
          [model.color.getX(i), model.color.getY(i), model.color.getZ(i)],
          (vi + i) * 3,
        );
    }
    for (let i = 0; i < model.index.length; i++)
      index[ii + i] = (model.index[i] ?? 0) + vi;
    vi += model.position.count;
    ii += model.index.length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  if (wanted.some((piece) => models.get(piece.kind)?.uv))
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (wanted.some((piece) => models.get(piece.kind)?.color))
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return geometry;
}
