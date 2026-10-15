import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { hdr } from "../shared/materials.ts";
import { instanced, Props } from "./build.ts";
import { PROPS, toon } from "./materials.ts";

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

const HILLS = ["#3f9a55", "#2f8048", "#4fae5f", "#358c4c"];

/** Each cloud puff, as its offset in the cloud and its local transform. */
const PARTS = CLOUDS.flatMap((c, ci) =>
  PUFFS.map(([x, y, z, r]) => ({
    ci,
    local: new THREE.Matrix4().compose(
      new THREE.Vector3(x * c.s, y * c.s, z * c.s),
      new THREE.Quaternion(),
      new THREE.Vector3(r * c.s, r * c.s, r * c.s),
    ),
  })),
);

/** Writes every puff's matrix from its cloud's current x. Allocates nothing. */
function placePuffs(
  mesh: THREE.InstancedMesh,
  xs: number[],
  tmp: THREE.Matrix4,
) {
  PARTS.forEach((p, k) => {
    const c = CLOUDS[p.ci];
    tmp.makeTranslation(xs[p.ci], c.at[1], c.at[2]).multiply(p.local);
    mesh.setMatrixAt(k, tmp);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/** Every cloud puff is one instance; drift moves each cloud along x. */
function Clouds() {
  const calm = useReducedMotion();
  const { mesh, xs, tmp } = useMemo(() => {
    const mesh = instanced(
      new THREE.SphereGeometry(1, 14, 10),
      toon("#ffffff"),
      PARTS.length,
    );
    const xs = CLOUDS.map((c) => c.at[0]);
    const tmp = new THREE.Matrix4();
    placePuffs(mesh, xs, tmp);
    return { mesh, xs, tmp };
  }, []);
  useFrame((_, dt) => {
    if (calm) return;
    for (let c = 0; c < xs.length; c++) {
      xs[c] += dt * 0.6;
      if (xs[c] > 80) xs[c] = -80;
    }
    placePuffs(mesh, xs, tmp);
  });
  return <primitive object={mesh} />;
}

/** Sky dome, sun, drifting clouds and jungle hills round the park. */
export function Sky() {
  const hills = useMemo(() => {
    const props = new Props();
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.95 + (i / 11) * Math.PI * 1.1;
      const r = 48 + (i % 3) * 6;
      props.add(
        new THREE.SphereGeometry(1, 20, 12),
        HILLS[i % HILLS.length],
        [Math.cos(a) * r, -2, Math.sin(a) * r],
        [0, 0, 0],
        [14 + (i % 4) * 3, 9 + (i % 3) * 4, 10],
      );
    }
    return props.geometry();
  }, []);
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
      <mesh geometry={hills} material={PROPS} />
      {/* sand round the deck, out to the hills */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[70, 48]} />
        <meshToonMaterial color="#f2d39a" />
      </mesh>
    </>
  );
}
