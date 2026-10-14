import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { hdr } from "../shared/materials.ts";
import { toon } from "./materials.ts";

// Tropical noon: deep blue overhead, warm haze on the horizon.
const SKY = new THREE.ShaderMaterial({
  uniforms: {
    uTop: { value: new THREE.Color("#2f8fe8") },
    uMid: { value: new THREE.Color("#8fdcff") },
    uHaze: { value: new THREE.Color("#ffe7c4") },
  },
  vertexShader: `varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHaze; varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 c = mix(uMid, uTop, smoothstep(0.05, 0.6, h));
      c = mix(c, uHaze, pow(1.0 - smoothstep(-0.02, 0.2, h), 2.0) * 0.8);
      gl_FragColor = vec4(c, 1.0);
    }`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});

const CLOUDS: readonly { at: [number, number, number]; s: number }[] = [
  { at: [-30, 22, -60], s: 3.2 },
  { at: [6, 26, -70], s: 4 },
  { at: [38, 20, -55], s: 2.6 },
  { at: [-55, 18, -30], s: 3 },
  { at: [60, 24, -20], s: 3.4 },
];

const PUFFS: readonly [number, number, number, number][] = [
  [0, 0, 0, 1.4],
  [1.5, -0.2, 0.2, 1.1],
  [-1.5, -0.3, 0, 1.0],
  [0.6, 0.8, -0.2, 0.9],
  [-0.7, 0.6, 0.3, 0.8],
];

function Clouds() {
  const group = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame((_, dt) => {
    if (!group.current || calm) return;
    for (const c of group.current.children) {
      c.position.x += dt * 0.6;
      if (c.position.x > 80) c.position.x = -80;
    }
  });
  const white = toon("#ffffff");
  return (
    <group ref={group}>
      {CLOUDS.map((c, i) => (
        <group key={i} position={c.at} scale={c.s}>
          {PUFFS.map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]} material={white}>
              <sphereGeometry args={[r, 14, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Sky dome, sun, drifting clouds and jungle hills round the park. */
export function Sky() {
  const hills = ["#3f9a55", "#2f8048", "#4fae5f", "#358c4c"];
  return (
    <>
      <mesh material={SKY} renderOrder={-1}>
        <sphereGeometry args={[95, 32, 16]} />
      </mesh>
      <mesh position={[-34, 40, -70]}>
        <circleGeometry args={[4.5, 32]} />
        <meshBasicMaterial color={hdr("#fff3c4", 2.2)} toneMapped={false} />
      </mesh>
      <Clouds />
      {Array.from({ length: 12 }, (_, i) => {
        const a = Math.PI * 0.95 + (i / 11) * Math.PI * 1.1;
        const r = 48 + (i % 3) * 6;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, -2, Math.sin(a) * r]}
            scale={[14 + (i % 4) * 3, 9 + (i % 3) * 4, 10]}
            material={toon(hills[i % hills.length])}
          >
            <sphereGeometry args={[1, 20, 12]} />
          </mesh>
        );
      })}
      {/* sand round the deck, out to the hills */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[70, 48]} />
        <meshToonMaterial color="#f2d39a" />
      </mesh>
    </>
  );
}
