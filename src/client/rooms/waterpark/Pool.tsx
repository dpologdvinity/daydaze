// The Water Park's wave pool: a custom shader for rolling waves, caustics,
// glints and edge foam, the tiled coping, and inflatables that ride the waves.
// Reduced motion freezes the water and the floats.

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { POOL } from "../../../game/waterPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { useQuality } from "../../world/quality.ts";
import { instanced, Props } from "./build.ts";
import { causticTex, rippleTex, stripes, toon, PROPS } from "./materials.ts";

const W = POOL.x1 - POOL.x0;
const D = POOL.z1 - POOL.z0;
/**
 * The pool's center on the deck as [x, z]; the water mesh and waveAt use
 * coordinates relative to it.
 */
export const POOL_CENTER: [number, number] = [
  (POOL.x0 + POOL.x1) / 2,
  (POOL.z0 + POOL.z1) / 2,
];

/** The height of the wave surface at local (x, z), matching the shader. */
export function waveAt(x: number, z: number, t: number) {
  return (
    Math.sin(z * 1.1 - t * 1.8) * 0.07 +
    Math.sin(x * 0.8 + z * 0.5 + t * 1.1) * 0.035
  );
}

function makeWater() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#0a7fc0") },
      uShallow: { value: new THREE.Color("#35e0e6") },
      uFoam: { value: new THREE.Color("#f4ffff") },
      uHalf: { value: new THREE.Vector2(W / 2, D / 2) },
      uCaustic: { value: causticTex() },
      uRipple: { value: rippleTex() },
    },
    vertexShader: `uniform float uTime; varying vec2 vXZ; varying float vH;
      void main() {
        vec3 p = position;
        // rollers travel towards the shallow front edge (+z)
        float h = sin(p.z * 1.1 - uTime * 1.8) * 0.07
          + sin(p.x * 0.8 + p.z * 0.5 + uTime * 1.1) * 0.035
          + sin(p.x * 2.3 - uTime * 2.1) * 0.012;
        p.y += h;
        vH = h;
        vXZ = p.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow;
      uniform vec3 uFoam; uniform vec2 uHalf; uniform sampler2D uCaustic;
      uniform sampler2D uRipple; varying vec2 vXZ; varying float vH;
      void main() {
        float k = smoothstep(-uHalf.y, uHalf.y * 1.2, vXZ.y);
        vec3 c = mix(uDeep, uShallow, k);
        // caustics: two drifting copies of the net, multiplied so only the lines show
        vec2 uv = vXZ * 0.18;
        float net = texture2D(uCaustic, uv + vec2(uTime * 0.021, uTime * 0.013)).r
          * texture2D(uCaustic, uv * 1.6 - vec2(uTime * 0.017, uTime * 0.011)).r;
        c += net * (0.12 + 0.3 * k) * uShallow;
        // ripple normals from two scrolling copies, lit by a high sun for glints
        vec3 na = texture2D(uRipple, vXZ * 0.5 + vec2(uTime * 0.05, 0.0)).rgb * 2.0 - 1.0;
        vec3 nb = texture2D(uRipple, vXZ * 0.37 - vec2(0.0, uTime * 0.04)).rgb * 2.0 - 1.0;
        vec3 n = normalize(vec3(na.xy + nb.xy, 2.0));
        vec3 hv = normalize(vec3(-0.35, 0.45, 0.8) + vec3(0.0, 0.0, 1.0));
        c += pow(max(dot(n, hv), 0.0), 60.0) * 0.8 * uFoam;
        // crest foam, then foam bands that drift along the pool walls
        c = mix(c, uFoam, smoothstep(0.07, 0.09, vH) * 0.6);
        vec2 e = uHalf - abs(vXZ);
        float edge = min(e.x, e.y);
        float band = smoothstep(0.7, 0.95, 0.5 + 0.5 * sin(edge * 36.0 - uTime * 2.4));
        float rim = 1.0 - smoothstep(0.04, 0.22, edge);
        c = mix(c, uFoam, rim * (0.55 + 0.45 * band));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

const RINGS = "ring";
const BALLS = "ball";
const BALL = stripes(["#ff3f9e", "#ffffff", "#ffd23f", "#ffffff", "#3fc2ff"]);

type Float = {
  at: [number, number];
  kind: "ring" | "ball";
  color: string;
  phase: number;
};
const FLOATS: readonly Float[] = [
  { at: [-6.8, -4.2], kind: RINGS, color: "#ff5fb4", phase: 0 },
  { at: [-2.4, -7.6], kind: RINGS, color: "#ffd23f", phase: 1.7 },
  { at: [-8.6, -7.9], kind: RINGS, color: "#7cf0c8", phase: 3.1 },
  { at: [-4.6, -2.6], kind: BALLS, color: "#ffffff", phase: 0.8 },
  { at: [1.8, -8.4], kind: BALLS, color: "#ffffff", phase: 2.4 },
];
const RING_FLOATS = FLOATS.filter((f) => f.kind === RINGS);
const BALL_FLOATS = FLOATS.filter((f) => f.kind === BALLS);

/** Places one list of inflatables at time t, reusing `dummy` so frames allocate nothing. */
function pose(
  mesh: THREE.InstancedMesh,
  list: readonly Float[],
  t: number,
  dummy: THREE.Object3D,
) {
  list.forEach((f, i) => {
    const y =
      POOL.water +
      0.05 +
      waveAt(f.at[0] - POOL_CENTER[0], f.at[1] - POOL_CENTER[1], t);
    const ring = f.kind === RINGS;
    dummy.position.set(f.at[0], y + (ring ? 0 : 0.12), f.at[1]);
    dummy.rotation.set(
      Math.sin(t * 1.3 + f.phase) * 0.12 - (ring ? Math.PI / 2 : 0),
      ring ? 0 : t * 0.4 + f.phase,
      Math.cos(t * 1.1 + f.phase) * 0.12,
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/** Inflatables riding the waves: two instanced meshes, rings and balls. */
function Floats() {
  const calm = useReducedMotion();
  const { rings, balls, dummy } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const rings = instanced(
      new THREE.TorusGeometry(0.45, 0.17, 12, 28),
      toon("#ffffff"),
      RING_FLOATS.length,
    );
    const balls = instanced(
      new THREE.SphereGeometry(0.28, 20, 14),
      new THREE.MeshToonMaterial({ map: BALL }),
      BALL_FLOATS.length,
    );
    RING_FLOATS.forEach((f, i) =>
      rings.setColorAt(i, new THREE.Color(f.color)),
    );
    pose(rings, RING_FLOATS, 0, dummy);
    pose(balls, BALL_FLOATS, 0, dummy);
    return { rings, balls, dummy };
  }, []);
  useFrame(({ clock }) => {
    if (calm) return;
    const t = clock.elapsedTime;
    pose(rings, RING_FLOATS, t, dummy);
    pose(balls, BALL_FLOATS, t, dummy);
  });
  return (
    <>
      <primitive object={rings} />
      <primitive object={balls} />
    </>
  );
}

/** The wave pool: animated water inside a tiled coping. */
export function Pool() {
  const quality = useQuality();
  const calm = useReducedMotion();
  const water = useMemo(makeWater, []);
  const geometry = useMemo(() => {
    const seg = quality === "high" ? 2 : 1;
    const g = new THREE.PlaneGeometry(W, D, 52 * seg, 32 * seg);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [quality]);
  const trim = useMemo(() => {
    const lip = 0.42;
    const props = new Props();
    // coping: front, back, left, right, each with a tile strip under its lip
    (
      [
        [POOL_CENTER[0], POOL.z1 + lip / 2, W + lip * 2, lip],
        [POOL_CENTER[0], POOL.z0 - lip / 2, W + lip * 2, lip],
        [POOL.x0 - lip / 2, POOL_CENTER[1], lip, D],
        [POOL.x1 + lip / 2, POOL_CENTER[1], lip, D],
      ] as const
    ).forEach(([x, z, w, d]) => {
      props
        .add(new THREE.BoxGeometry(w, 0.18, d), "#fff1dc", [x, 0.09, z])
        .add(new THREE.BoxGeometry(w + 0.06, 0.01, d + 0.06), "#1b9fd0", [
          x,
          0.005,
          z,
        ]);
    });
    return props.geometry();
  }, []);
  useFrame((_, dt) => {
    // reduced motion freezes the rollers
    if (!calm) water.uniforms.uTime.value += dt;
  });
  return (
    <group>
      <mesh
        geometry={geometry}
        material={water}
        position={[POOL_CENTER[0], POOL.water, POOL_CENTER[1]]}
      />
      <mesh geometry={trim} material={PROPS} />
      <Floats />
    </group>
  );
}
