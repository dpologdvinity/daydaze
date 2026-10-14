import * as THREE from "three";

// 4-step ramp; the darkest step stays fairly high so skin never goes muddy
// under the coloured club lights.
export const gradientMap = (() => {
  const t = new THREE.DataTexture(
    new Uint8Array([110, 170, 225, 255]),
    4,
    1,
    THREE.RedFormat,
  );
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

export const hairTime = { value: 0 };

type ToonOpts = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rim?: THREE.ColorRepresentation;
  rimStrength?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  gloss?: number;
};

// Toon material with a hard-edged fresnel rim, so dolls pop off the dark room.
export function makeToon({
  color = "#ffffff",
  map = null,
  rim = "#ff7ad9",
  rimStrength = 0.55,
  emissive = "#000000",
  emissiveIntensity = 1,
  gloss = 0,
}: ToonOpts) {
  const m = new THREE.MeshToonMaterial({
    color,
    map,
    gradientMap,
    emissive,
    emissiveIntensity,
  });
  const uRim = { value: new THREE.Color(rim).multiplyScalar(rimStrength) };
  const uGloss = { value: gloss };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = uRim;
    shader.uniforms.uGloss = uGloss;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform vec3 uRim;\nuniform float uGloss;\nvoid main() {",
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          vec3 V = normalize(vViewPosition);
          vec3 N = normalize(normal);
          float f = 1.0 - max(dot(N, V), 0.0);
          outgoingLight += uRim * smoothstep(0.62, 0.7, f);
          vec3 H = normalize(normalize(vec3(0.35, 0.75, 0.55)) + V);
          outgoingLight += vec3(1.0, 0.93, 0.97) * uGloss * smoothstep(0.955, 0.97, dot(N, H));
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => "doll-toon";
  m.userData.uRim = uRim;
  return m;
}

const SWAY = `
  float hang = clamp(-transformed.y - 0.06, 0.0, 1.0);
  transformed.x += sin(uHairTime * 1.7 + transformed.y * 5.0) * 0.012 * hang;
  transformed.z += cos(uHairTime * 1.3 + transformed.y * 4.0) * 0.01 * hang;
`;

// Toon hair with a Kajiya-Kay style highlight band driven by a per-vertex
// strand direction, plus a gentle sway on everything below the ears.
export function makeHair(color: THREE.ColorRepresentation) {
  const base = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const shine = new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, hsl.s * 0.9),
    Math.min(0.92, hsl.l * 0.6 + 0.5),
  );
  const m = new THREE.MeshToonMaterial({ color: base, gradientMap });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHairTime = hairTime;
    shader.uniforms.uShine = { value: shine };
    shader.uniforms.uSheen = { value: base.clone().multiplyScalar(0.6) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "attribute vec3 strandDir;\nvarying vec3 vStrand;\nvarying vec3 vObj;\nuniform float uHairTime;\nvoid main() {",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        ${SWAY}
        vStrand = normalize(normalMatrix * strandDir);
        vObj = position;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "varying vec3 vStrand;\nvarying vec3 vObj;\nuniform vec3 uShine;\nuniform vec3 uSheen;\nvoid main() {",
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(vec3(0.25, 0.9, 0.55));
          vec3 H = normalize(L + V);
          // halo ring (N.H band) with per-strand jitter for an illustrated, zig-zag
          // edge; strength follows the strand tangent so it reads anisotropic
          float jit = sin(vObj.x * 160.0 + vObj.z * 90.0) * sin(vObj.z * 140.0 - vObj.y * 30.0);
          vec3 N = normalize(normal);
          float ndh = dot(N, H);
          float ring = 1.0 - smoothstep(0.015, 0.04, abs(ndh - 0.84 - 0.018 * jit));
          float ring2 = 1.0 - smoothstep(0.0, 0.012, abs(ndh - 0.95 - 0.01 * jit));
          float th = dot(normalize(vStrand), H);
          float aniso = pow(sqrt(max(0.0, 1.0 - th * th)), 12.0);
          float sheen = pow(max(ndh, 0.0), 6.0);
          outgoingLight += uShine * (ring * 0.8 + ring2 * 0.5) * aniso
            + uSheen * sheen * 0.35;
          float f = 1.0 - max(dot(normalize(normal), V), 0.0);
          outgoingLight += vec3(0.9, 0.35, 0.8) * smoothstep(0.66, 0.74, f) * 0.35;
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => "doll-hair";
  return m;
}

// Inverted-hull outline that shares the hair sway, so lines stay glued on.
export function makeOutline(thickness: number, sway: boolean) {
  const m = new THREE.MeshBasicMaterial({
    color: "#14040f",
    side: THREE.BackSide,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHairTime = hairTime;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "uniform float uHairTime;\nvoid main() {")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        ${sway ? SWAY : ""}
        transformed += normalize(normal) * ${thickness.toFixed(4)};`,
      );
  };
  m.customProgramCacheKey = () => `outline-${thickness}-${sway}`;
  return m;
}
