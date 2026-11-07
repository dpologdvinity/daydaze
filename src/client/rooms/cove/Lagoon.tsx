// Mermaid Cove's lagoon: one lit plane whose ripples (two drifting copies of
// the water park's normal map) catch the moon, deepening from turquoise at
// the beach to navy by the cave, with lacy foam round each rock's waterline
// and a wash that laps at the sand. Reduced motion stills it. Not walkable.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SAND, WATER_Y } from "../../../game/mermaidCove.ts";
import { useReducedMotion } from "../../motion.ts";
import { causticTex, rippleTex } from "../waterpark/materials.ts";

/** Where a rock meets the water: an ellipse with half-axes ax (across) and
 * az (along), turned by yaw like the rock. */
export type Waterline = {
  x: number;
  z: number;
  yaw: number;
  ax: number;
  az: number;
};

const SHALLOW = "#1fa8a8";
const DEEP = "#062238";
const FOAM = "#e4f8ff";

function lagoonMaterial(rocks: readonly Waterline[]) {
  const uniforms = {
    uTime: { value: 0 },
    uRock: {
      value: rocks.map((r) => new THREE.Vector4(r.x, r.z, r.ax, r.az)),
    },
    uTurn: {
      value: rocks.map(
        (r) => new THREE.Vector2(Math.cos(r.yaw), Math.sin(r.yaw)),
      ),
    },
    uShore: { value: SAND.z0 },
    uShallow: { value: new THREE.Color(SHALLOW) },
    uDeep: { value: new THREE.Color(DEEP) },
    uFoam: { value: new THREE.Color(FOAM) },
    uLace: { value: causticTex() },
  };
  const n = rocks.length;
  const m = new THREE.MeshStandardMaterial({
    roughness: 0.16,
    metalness: 0,
    normalMap: rippleTex(),
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec2 vSea;\nvoid main() {")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvSea = (modelMatrix * vec4(transformed, 1.0)).xz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        [
          "uniform float uTime;",
          `uniform vec4 uRock[${n}];`,
          `uniform vec2 uTurn[${n}];`,
          "uniform float uShore;",
          "uniform vec3 uShallow;",
          "uniform vec3 uDeep;",
          "uniform vec3 uFoam;",
          "uniform sampler2D uLace;",
          "varying vec2 vSea;",
          "void main() {",
        ].join("\n"),
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          // deeper away from the beach, shallow again round each rock
          "float coveDeep = smoothstep(0.0, 14.0, uShore - vSea.y);",
          "float coveFoam = 0.0;",
          // lace: two drifting copies of the caustic net break the foam up
          "float lace = 0.6 * texture2D(uLace, vSea * 0.45 + uTime * vec2(0.012, 0.02)).r",
          "  + 0.6 * texture2D(uLace, vSea * 0.8 - uTime * vec2(0.017, 0.009)).r;",
          `for (int i = 0; i < ${n}; i++) {`,
          "  vec2 d = vSea - uRock[i].xy;",
          // into the rock's own frame (inverse of its yaw), then ellipse units
          "  vec2 l = vec2(uTurn[i].x * d.x - uTurn[i].y * d.y, uTurn[i].y * d.x + uTurn[i].x * d.y);",
          "  float r = length(l / uRock[i].zw);",
          "  coveDeep = min(coveDeep, smoothstep(1.0, 2.4, r));",
          "  float ring = 1.0 - smoothstep(1.0, 1.24 + 0.05 * sin(uTime * 1.3 + float(i) * 2.0), r);",
          "  coveFoam = max(coveFoam, ring * (0.4 + lace));",
          "}",
          // the wash: a foam line lapping in and out, lace trailing behind it
          "float toShore = vSea.y - (uShore - 0.3 - 0.3 * sin(uTime * 0.9));",
          "coveFoam = max(coveFoam, smoothstep(-0.12, 0.0, toShore) * 0.95);",
          "coveFoam = max(coveFoam, smoothstep(-1.4, 0.0, toShore) * lace * 0.7);",
          "coveFoam = clamp(coveFoam, 0.0, 1.0);",
          "diffuseColor.rgb = mix(mix(uShallow, uDeep, coveDeep), uFoam, coveFoam);",
        ].join("\n"),
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.9, coveFoam);",
      )
      // the plane is flat, so the ripples' slopes give the world normal
      // directly; foam calms them
      .replace(
        "#include <normal_fragment_maps>",
        [
          "vec3 rippleA = texture2D(normalMap, vSea * 0.22 + uTime * vec2(0.018, 0.011)).xyz * 2.0 - 1.0;",
          "vec3 rippleB = texture2D(normalMap, vSea * 0.37 - uTime * vec2(0.013, 0.02)).xyz * 2.0 - 1.0;",
          "vec2 slope = (rippleA.xy + rippleB.xy) * normalScale * (1.0 - 0.7 * coveFoam);",
          "normal = normalize((viewMatrix * vec4(normalize(vec3(slope.x, 1.0, slope.y)), 0.0)).xyz);",
        ].join("\n"),
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          // the lagoon glows faintly from below, most in the shallows
          "totalEmissiveRadiance += uShallow * (0.05 + 0.24 * (1.0 - coveDeep)) + uFoam * coveFoam * 0.16;",
        ].join("\n"),
      );
  };
  return { material: m, uniforms };
}

/** The lagoon, from the beach out past the cave; `rocks` get foam rings. */
export function Lagoon({ rocks }: { rocks: readonly Waterline[] }) {
  const calm = useReducedMotion();
  const { material, uniforms } = useMemo(() => lagoonMaterial(rocks), [rocks]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    uniforms.uTime.value = calm ? 0 : clock.elapsedTime;
  });
  return (
    <mesh
      position={[0, WATER_Y, SAND.z0 - 20]}
      rotation-x={-Math.PI / 2}
      material={material}
      raycast={() => {}}
    >
      <planeGeometry args={[60, 40]} />
    </mesh>
  );
}
