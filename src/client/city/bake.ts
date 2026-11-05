// Merges many copies of one small shape into a single geometry. Chrome's
// software WebGL (SwiftShader, used where the GPU is blocklisted and in
// headless tests) runs every instance of an instanced draw as a draw of its
// own, so the city's thousands of window panes and sills cost far more as
// instances than as one merged mesh. The city rebakes on each streaming
// reload, never per frame.
import * as THREE from "three";

const matrix = new THREE.Matrix4();
const normalMatrix = new THREE.Matrix3();
const color = new THREE.Color();
const v = new THREE.Vector3();
const bounds = new THREE.Box3();

/**
 * Writes `count` copies of `shape` into `into`, each placed by `place(i,
 * matrix, color)` (handed an identity matrix and white). Each vertex also
 * carries its copy's origin in `aOrigin`, so shaders can give every copy its
 * own phase. Returns `into` when its buffers are big enough (it then draws
 * only the first `count` copies), or a new geometry with room to grow after
 * disposing `into`.
 */
export function bakeShapes(
  into: THREE.BufferGeometry,
  shape: THREE.BufferGeometry,
  count: number,
  place: (i: number, matrix: THREE.Matrix4, color: THREE.Color) => void,
): THREE.BufferGeometry {
  const pos = shape.getAttribute("position");
  const nor = shape.getAttribute("normal");
  const uv = shape.getAttribute("uv");
  const nv = pos.count;
  const shapeIndex = shape.getIndex();
  const ni = shapeIndex ? shapeIndex.count : nv;

  let g = into;
  // a fresh geometry has no buffers yet, even for an empty bake
  const room = g.getIndex() ? g.getAttribute("position").count : -1;
  if (room < count * nv) {
    into.dispose();
    // room for half again as many, so a slightly busier view doesn't regrow
    const copies = Math.ceil(count * 1.5);
    g = new THREE.BufferGeometry();
    const attr = (size: number) =>
      new THREE.BufferAttribute(new Float32Array(copies * nv * size), size);
    g.setAttribute("position", attr(3));
    g.setAttribute("normal", attr(3));
    if (uv) g.setAttribute("uv", attr(2));
    g.setAttribute("color", attr(3));
    g.setAttribute("aOrigin", attr(3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(copies * ni), 1));
  }
  const P = g.getAttribute("position");
  const N = g.getAttribute("normal");
  const U = g.getAttribute("uv");
  const C = g.getAttribute("color");
  const O = g.getAttribute("aOrigin");
  const I = g.getIndex();
  if (!I) throw new Error("baked geometry is indexed");

  bounds.makeEmpty();
  for (let i = 0; i < count; i++) {
    matrix.identity();
    color.setRGB(1, 1, 1);
    place(i, matrix, color);
    normalMatrix.getNormalMatrix(matrix);
    const e = matrix.elements;
    const base = i * nv;
    for (let j = 0; j < nv; j++) {
      v.fromBufferAttribute(pos, j).applyMatrix4(matrix);
      P.setXYZ(base + j, v.x, v.y, v.z);
      bounds.expandByPoint(v);
      if (nor) {
        v.fromBufferAttribute(nor, j).applyMatrix3(normalMatrix).normalize();
        N.setXYZ(base + j, v.x, v.y, v.z);
      }
      if (uv) U.setXY(base + j, uv.getX(j), uv.getY(j));
      C.setXYZ(base + j, color.r, color.g, color.b);
      O.setXYZ(base + j, e[12], e[13], e[14]);
    }
    for (let k = 0; k < ni; k++)
      I.setX(i * ni + k, (shapeIndex ? shapeIndex.getX(k) : k) + base);
  }
  for (const a of [P, N, U, C, O, I]) if (a) a.needsUpdate = true;
  g.setDrawRange(0, count * ni);
  // only the copies drawn count toward the bounds, not stale ones past them
  g.boundingSphere = bounds.getBoundingSphere(
    g.boundingSphere ?? new THREE.Sphere(),
  );
  g.boundingBox = null;
  return g;
}
