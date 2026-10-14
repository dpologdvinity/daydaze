import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { POOL } from "../../../game/waterPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { useQuality } from "../../world/quality.ts";
import { stripes, toon } from "./materials.ts";

const W = POOL.x1 - POOL.x0;
const D = POOL.z1 - POOL.z0;
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
      uniform vec3 uFoam; uniform vec2 uHalf; varying vec2 vXZ; varying float vH;
      void main() {
        float k = smoothstep(-uHalf.y, uHalf.y * 1.2, vXZ.y);
        vec3 c = mix(uDeep, uShallow, k);
        // toon caustics: two drifting sine lattices cut into hard bands
        float n = sin(vXZ.x * 3.1 + uTime * 0.7 + sin(vXZ.y * 2.3 + uTime * 0.5))
          * sin(vXZ.y * 2.7 - uTime * 0.6 + sin(vXZ.x * 1.7));
        c = mix(c, uShallow * 1.3 + 0.1, step(0.6, n) * 0.55);
        // white caps on the crests, and foam where water meets the walls
        c = mix(c, uFoam, step(0.085, vH) * 0.75);
        vec2 e = uHalf - abs(vXZ);
        float edge = min(e.x, e.y);
        c = mix(c, uFoam, (1.0 - smoothstep(0.04, 0.2, edge)) * 0.8);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

const BALL = stripes(["#ff3f9e", "#ffffff", "#ffd23f", "#ffffff", "#3fc2ff"]);

const FLOATS: readonly {
  at: [number, number];
  kind: "ring" | "ball";
  color: string;
  phase: number;
}[] = [
  { at: [-6.8, -4.2], kind: "ring", color: "#ff5fb4", phase: 0 },
  { at: [-2.4, -7.6], kind: "ring", color: "#ffd23f", phase: 1.7 },
  { at: [-8.6, -7.9], kind: "ring", color: "#7cf0c8", phase: 3.1 },
  { at: [-4.6, -2.6], kind: "ball", color: "#ffffff", phase: 0.8 },
  { at: [1.8, -8.4], kind: "ball", color: "#ffffff", phase: 2.4 },
];

/** Inflatables riding the waves. */
function Floats() {
  const group = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (!group.current || calm) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((g, i) => {
      const f = FLOATS[i];
      const lx = f.at[0] - POOL_CENTER[0];
      const lz = f.at[1] - POOL_CENTER[1];
      g.position.y = POOL.water + 0.05 + waveAt(lx, lz, t);
      g.rotation.x = Math.sin(t * 1.3 + f.phase) * 0.12;
      g.rotation.z = Math.cos(t * 1.1 + f.phase) * 0.12;
      if (f.kind === "ball") g.rotation.y = t * 0.4 + f.phase;
    });
  });
  return (
    <group ref={group}>
      {FLOATS.map((f, i) => (
        <group key={i} position={[f.at[0], POOL.water + 0.05, f.at[1]]}>
          {f.kind === "ring" ? (
            <mesh rotation-x={-Math.PI / 2} material={toon(f.color)}>
              <torusGeometry args={[0.45, 0.17, 12, 28]} />
            </mesh>
          ) : (
            <mesh position-y={0.12}>
              <sphereGeometry args={[0.28, 20, 14]} />
              <meshToonMaterial map={BALL} />
            </mesh>
          )}
        </group>
      ))}
    </group>
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
  useFrame((_, dt) => {
    // reduced motion freezes the rollers
    if (!calm) water.uniforms.uTime.value += dt;
  });
  const coping = toon("#fff1dc");
  const tile = toon("#1b9fd0");
  const lip = 0.42;
  return (
    <group>
      <mesh
        geometry={geometry}
        material={water}
        position={[POOL_CENTER[0], POOL.water, POOL_CENTER[1]]}
      />
      {/* coping: front, back, left, right */}
      {(
        [
          [POOL_CENTER[0], POOL.z1 + lip / 2, W + lip * 2, lip],
          [POOL_CENTER[0], POOL.z0 - lip / 2, W + lip * 2, lip],
          [POOL.x0 - lip / 2, POOL_CENTER[1], lip, D],
          [POOL.x1 + lip / 2, POOL_CENTER[1], lip, D],
        ] as const
      ).map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, 0.09, z]} material={coping}>
            <boxGeometry args={[w, 0.18, d]} />
          </mesh>
          <mesh position={[x, 0.005, z]} material={tile}>
            <boxGeometry args={[w + 0.06, 0.01, d + 0.06]} />
          </mesh>
        </group>
      ))}
      <Floats />
    </group>
  );
}
