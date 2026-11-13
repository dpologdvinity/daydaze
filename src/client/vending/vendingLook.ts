// The vending machine's candy paint. The model's atlas has pure white where the
// body is and the stock painted in color (art/vending/build_vending.py), so a
// tint that multiplies only near-white texels paints the machine and leaves
// the cans, chrome and keypad alone. Street machines carry their color as an
// instance color; a venue's machine passes its color as a uniform.

import * as THREE from "three";

/** How white a texel must be (its dimmest channel, linear) to count as body. */
const BODY_FROM = 0.93;
const BODY_TO = 0.98;

/**
 * Patches `material` to paint its near-white texels with `tint` (a uniform),
 * or, when `tint` is null, with the instance color of the instanced mesh.
 */
export function paintVending(
  material: THREE.MeshStandardMaterial,
  tint: THREE.Color | null,
): void {
  const uniform = { value: tint ?? new THREE.Color(1, 1, 1) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaint = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uPaint;`,
      )
      .replace(
        "#include <color_fragment>",
        `float body = smoothstep(${BODY_FROM.toFixed(2)}, ${BODY_TO.toFixed(2)},
          min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)));
        ${
          tint
            ? "vec3 paint = uPaint;"
            : "#ifdef USE_COLOR\n vec3 paint = vColor.rgb;\n #else\n vec3 paint = vec3(1.0);\n #endif"
        }
        diffuseColor.rgb *= mix(vec3(1.0), paint, body);`,
      );
  };
  // instanced and uniform builds are different programs
  material.customProgramCacheKey = () => (tint ? "vending-uniform" : "vending");
}
