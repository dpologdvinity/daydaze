import type { Material } from "three";

/**
 * One clock and one motion switch for every animated city material. CityScene
 * sets them once a frame, so the motion costs no per-instance CPU work.
 */
export const CITY_CLOCK = { uTime: { value: 0 }, uMotion: { value: 1 } };

/**
 * What a material moves, all in the vertex or fragment shader:
 * - blink: slow sign blinks on about 40% of the panels
 * - flicker: about one window in eight stutters, the rest hold steady
 * - drift: steam rises and fades
 * - sway: palm fronds lift and settle, more at the tip
 * - bob: idle dolls sway in place
 * - fade: the fade also applies to alpha, for see-through steam
 * - atlas: the instance picks its name from the label atlas
 */
export type Motion = {
  blink?: boolean;
  flicker?: boolean;
  drift?: boolean;
  bob?: boolean;
  sway?: boolean;
  fade?: boolean;
  atlas?: boolean;
};

/** Hooks the shared clock into a material; reduced motion freezes all of it. */
export function animate<M extends Material>(material: M, motion: Motion): M {
  material.customProgramCacheKey = () => JSON.stringify(motion);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = CITY_CLOCK.uTime;
    shader.uniforms.uMotion = CITY_CLOCK.uMotion;
    shader.vertexShader = [
      "attribute vec4 aUv;",
      "uniform float uTime;",
      "uniform float uMotion;",
      "varying float vFx;",
      shader.vertexShader,
    ].join("\n");
    shader.vertexShader = shader.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
#ifdef USE_MAP
${motion.atlas ? "vMapUv = (mapTransform * vec3(uv * aUv.zw + aUv.xy, 1.0)).xy;" : ""}
#endif`,
    );
    // a phase per instance: the same place always blinks or sways the same way
    const phase = motion.bob
      ? "vec3 ip = vec3(instanceMatrix[3].x, 0.0, instanceMatrix[3].z);"
      : "vec3 ip = instanceMatrix[3].xyz;";
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
${phase}
float ph = fract(sin(dot(ip, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
float sy = max(instanceMatrix[1].y, 0.001);
vFx = 1.0;
${motion.blink ? "if (ph > 0.6) vFx = mix(1.0, step(0.3, fract(uTime * (0.25 + ph) + ph * 7.0)) * 0.75 + 0.25, uMotion);" : ""}
${motion.flicker ? "if (ph > 0.88) vFx = mix(1.0, 0.35 + 0.65 * step(0.45, fract(uTime * (0.7 + ph * 3.0) + ph * 11.0)), uMotion);" : ""}
${motion.drift ? "float life = fract(ph + uTime * 0.07 * uMotion); transformed.y += life * 4.0 / sy; vFx = (1.0 - life) * 0.9;" : ""}
${motion.sway ? "transformed.z += sin(uTime * 1.6 + ph * 6.2831) * 0.12 * (position.y + 0.5) * uMotion;" : ""}
${motion.bob ? "transformed.y += sin(uTime * 2.4 + ph * 6.2831) * 0.035 * uMotion / sy;" : ""}`,
    );
    shader.fragmentShader = ["varying float vFx;", shader.fragmentShader].join(
      "\n",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
gl_FragColor.rgb *= vFx;
${motion.fade ? "gl_FragColor.a *= vFx;" : ""}`,
    );
  };
  return material;
}
