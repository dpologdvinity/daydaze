// Wet asphalt and planks catch elongated color from nearby planned signs.
import { Color, Vector3, type MeshStandardMaterial } from "three";
import type { Light } from "../../game/city/instanceTypes.ts";
import { POINT_LIGHTS } from "../../game/city/tuning.ts";

const positions = Array.from(
  { length: POINT_LIGHTS.high },
  () => new Vector3(),
);
const colors = positions.map(() => new Color(0));
const wetUniforms = {
  uWetness: { value: 0 },
  uWetNeon: { value: 0 },
  uWetSignCount: { value: 0 },
  uWetSigns: { value: positions },
  uWetSignColors: { value: colors },
};

export function setWetWeather(rain: number, neon: number): void {
  wetUniforms.uWetness.value = rain;
  wetUniforms.uWetNeon.value = neon;
}

export function setWetSigns(signs: readonly Light[]): void {
  const count = Math.min(signs.length, positions.length);
  wetUniforms.uWetSignCount.value = count;
  for (let i = 0; i < count; i++) {
    const { x, y, z, color } = signs[i];
    positions[i].set(x, y, z);
    colors[i].set(color);
  }
}

/** Add weather to a world-mapped material without another mesh or render pass. */
export function wetSurface(
  material: MeshStandardMaterial,
): MeshStandardMaterial {
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, wetUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        /* glsl */ `
uniform float uWetness;
uniform float uWetNeon;
uniform int uWetSignCount;
uniform vec3 uWetSigns[${POINT_LIGHTS.high}];
uniform vec3 uWetSignColors[${POINT_LIGHTS.high}];
void main() {`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        /* glsl */ `
diffuseColor.rgb *= 1.0 - 0.34 * uWetness;
roughnessFactor = mix(roughnessFactor, 0.16, uWetness * 0.9);
#include <normal_fragment_begin>`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `
#include <emissivemap_fragment>
if (uWetness > 0.0) {
  vec2 eye = cameraPosition.xz - vWorldXZ;
  float grazing = 1.0 - abs(cameraPosition.y) / max(length(vec3(eye, cameraPosition.y)), 0.01);
  totalEmissiveRadiance += vec3(0.045, 0.057, 0.072) * grazing * grazing * uWetness;
  if (uWetNeon > 0.0) {
    for (int i = 0; i < ${POINT_LIGHTS.high}; i++) {
      if (i >= uWetSignCount) break;
      vec3 signPos = uWetSigns[i];
      vec2 toEye = cameraPosition.xz - signPos.xz;
      float distanceToEye = max(length(toEye), 0.01);
      vec2 direction = toEye / distanceToEye;
      vec2 offset = vWorldXZ - signPos.xz;
      float along = dot(offset, direction);
      float across = dot(offset, vec2(-direction.y, direction.x));
      float reach = min(distanceToEye * signPos.y / max(signPos.y + cameraPosition.y, 1.0), 23.0);
      float width = 0.48 + max(along, 0.0) * 0.047;
      float streak = (1.0 - smoothstep(width * 0.22, width, abs(across)))
        * smoothstep(-0.3, 2.0, along)
        * (1.0 - smoothstep(reach * 0.42, max(2.1, reach), along));
      totalEmissiveRadiance += uWetSignColors[i] * streak * uWetNeon * uWetness * 0.78;
    }
  }
}`,
      );
  };
  material.customProgramCacheKey = () => `${key.call(material)}|wet`;
  return material;
}
