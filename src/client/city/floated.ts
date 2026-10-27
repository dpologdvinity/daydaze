// Float copies of glTF geometry, for models optimized with meshopt
// quantization (CityFurniture, CityTrees, CityPark bake node transforms in).
import * as THREE from "three";

/**
 * A copy with float positions and normals. The optimized GLBs store them
 * quantized (normalized integers whose node transform restores the scale), and
 * baking a transform into a normalized attribute would clamp it to +-1.
 */
export function floated(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.clone();
  for (const name of ["position", "normal"]) {
    const a = geometry.getAttribute(name);
    if (!a || a instanceof THREE.InterleavedBufferAttribute) {
      if (a) geometry.setAttribute(name, floatCopy(a));
      continue;
    }
    if (a.normalized || !(a.array instanceof Float32Array))
      geometry.setAttribute(name, floatCopy(a));
  }
  return geometry;
}

function floatCopy(
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) {
  const out = new THREE.BufferAttribute(new Float32Array(a.count * 3), 3);
  for (let i = 0; i < a.count; i++)
    out.setXYZ(i, a.getX(i), a.getY(i), a.getZ(i));
  return out;
}
