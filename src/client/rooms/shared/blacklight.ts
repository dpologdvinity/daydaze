// The UV night's blacklight, as one patch for every lit material in the room:
// in the fragment shader, saturated colors (hair, paint, felt, neon trim) and
// whites (shirts, teeth, chalk) glow on their own, scaled by one shared uniform
// the night turns up and down. The surface's own light stays as it is, so the
// room can go dark around it. Patched before a material first compiles, the
// patch costs no recompile; on one already compiled it needs `needsUpdate`.

import * as THREE from "three";

/** The glow strength every patched material reads; 0 is off. */
export const uvGlow = { value: 0 };

/** The GLSL that makes a surface fluoresce, added after the emissive map. */
const CHUNK = `
  {
    // sRGB-ish, so a pale tan reads pale and not "saturated"
    vec3 uvc = sqrt(max(diffuseColor.rgb, vec3(0.0)));
    float uvHi = max(uvc.r, max(uvc.g, uvc.b));
    float uvLo = min(uvc.r, min(uvc.g, uvc.b));
    float uvSat = uvHi > 0.0 ? (uvHi - uvLo) / uvHi : 0.0;
    float paint = smoothstep(0.55, 0.85, uvSat) * smoothstep(0.4, 0.75, uvHi);
    float chalk = smoothstep(0.72, 0.92, uvLo);
    totalEmissiveRadiance += uUvGlow * (diffuseColor.rgb * paint * 1.8
      + vec3(0.5, 0.38, 1.0) * chalk * 0.7);
  }`;

/** `fragmentShader` with the blacklight glow in, or as it was if it has no emissive chunk. */
export function injectBlacklight(fragmentShader: string): string {
  const hook = "#include <emissivemap_fragment>";
  if (!fragmentShader.includes(hook)) return fragmentShader;
  return fragmentShader
    .replace("void main() {", "uniform float uUvGlow;\nvoid main() {")
    .replace(hook, hook + CHUNK);
}

const patched = new WeakSet<THREE.Material>();

/** True for the lit materials the patch knows how to extend. */
function isLit(m: THREE.Material): boolean {
  return (
    m instanceof THREE.MeshStandardMaterial ||
    m instanceof THREE.MeshToonMaterial ||
    m instanceof THREE.MeshPhongMaterial ||
    m instanceof THREE.MeshLambertMaterial
  );
}

/** Patch `m` once, chaining after any hook it already has (box mapping, doll toon). */
export function patchBlacklight(m: THREE.Material): void {
  if (patched.has(m) || !isLit(m)) return;
  patched.add(m);
  // the cache key of the hook it has now, read before replacing the hook
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    before.call(m, shader, renderer);
    shader.uniforms.uUvGlow = uvGlow;
    shader.fragmentShader = injectBlacklight(shader.fragmentShader);
  };
  m.customProgramCacheKey = () => `${key}|uv`;
  // a material that has already been drawn needs a fresh program
  if (m.version > 0) m.needsUpdate = true;
}
