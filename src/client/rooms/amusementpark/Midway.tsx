import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { stringPoints, type Vec3 } from "../../../game/amusementPark.ts";
import { BOOTHS, type Booth as BoothSpec } from "./layout.ts";
import { Bulbs } from "./Bulbs.tsx";
import { Copies, type Copy } from "./Instanced.tsx";
import { merged } from "./models.ts";
import { LACQUER } from "../shared/materials.ts";
import { MARQUEE, NeonText } from "../shared/Neon.tsx";

// Strings of bulbs strung between the poles along the midway. Each is
// [from, to, sag] and the bulbs follow stringPoints.
const STRINGS: readonly [Vec3, Vec3, number][] = [
  [[-12, 6.2, -7.5], [12, 6.2, -7.5], 1.6],
  [[-12, 5.6, 0], [12, 5.6, 0], 1.4],
  [[-12, 5.2, 5.5], [12, 5.2, 5.5], 1.2],
];
const BULBS = STRINGS.flatMap(([a, b, sag]) => stringPoints(a, b, 0.5, sag));
const POLES: readonly [number, number][] = [
  [-12, -7.5],
  [12, -7.5],
  [-12, 0],
  [12, 0],
  [-12, 5.5],
  [12, 5.5],
];

// Prizes sit on each counter: plush toys and wrapped gift boxes, alternating.
const PLUSH = merged([
  {
    g: new THREE.SphereGeometry(1, 10, 8),
    size: [0.13, 0.12, 0.13],
    at: [0, 0.13, 0],
  },
  {
    g: new THREE.SphereGeometry(1, 8, 6),
    size: [0.1, 0.1, 0.1],
    at: [0, 0.27, 0],
  },
  {
    g: new THREE.SphereGeometry(1, 6, 4),
    size: [0.035, 0.035, 0.035],
    at: [-0.07, 0.36, 0],
  },
  {
    g: new THREE.SphereGeometry(1, 6, 4),
    size: [0.035, 0.035, 0.035],
    at: [0.07, 0.36, 0],
  },
]);
const GIFT = merged([
  {
    g: new THREE.BoxGeometry(1, 1, 1),
    size: [0.18, 0.14, 0.14],
    at: [0, 0.07, 0],
  },
  {
    g: new THREE.BoxGeometry(1, 1, 1),
    size: [0.19, 0.145, 0.03],
    at: [0, 0.07, 0],
  },
  {
    g: new THREE.BoxGeometry(1, 1, 1),
    size: [0.03, 0.145, 0.19],
    at: [0, 0.07, 0],
  },
]);
const PRIZE_COLORS = ["#ff6ac8", "#3fe0d0", "#ffb02e", "#9b5cff", "#3dff9a"];
const COUNTER_SLOTS = [-0.9, -0.3, 0.3, 0.9];
const PLUSH_ITEMS: Copy[] = [];
const GIFT_ITEMS: Copy[] = [];
BOOTHS.forEach((booth, b) =>
  COUNTER_SLOTS.forEach((x, i) => {
    // local counter point, turned with the booth so the prizes face the midway
    const at = new THREE.Vector3(x, 1.1, 0.15).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      booth.rot,
    );
    const copy: Copy = {
      position: [booth.at[0] + at.x, 1.1, booth.at[1] + at.z],
      yaw: booth.rot,
      color: PRIZE_COLORS[(b + i) % PRIZE_COLORS.length],
    };
    (i % 2 ? GIFT_ITEMS : PLUSH_ITEMS).push(copy);
  }),
);

function Wire({ a, b, sag }: { a: Vec3; b: Vec3; sag: number }) {
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2 - sag,
      (a[2] + b[2]) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...a),
      mid,
      new THREE.Vector3(...b),
    );
    return new THREE.TubeGeometry(curve, 32, 0.012, 4);
  }, [a, b, sag]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#1a0d1d" />
    </mesh>
  );
}

const PRIZE = new THREE.MeshStandardMaterial({ roughness: 0.6 });

// Kenney's Coaster Kit stalls (CC0), one look per booth in turn
const STALLS = ["stall-food", "stall-drinks", "stall-information"] as const;
const STALL_SCALE = 2.3;

/** A downloaded stall model, front to +z like the booth's counter. */
function Stall({ kind }: { kind: (typeof STALLS)[number] }) {
  const gltf = useGLTF(`/models/fair/${kind}.glb`);
  const root = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <primitive object={root} scale={STALL_SCALE} />;
}

/** One booth: a stall with a neon sign over its roof. */
function Booth({
  sign,
  color,
  at,
  rot,
  kind,
}: BoothSpec & { kind: (typeof STALLS)[number] }) {
  return (
    <group position={[at[0], 0, at[1]]} rotation-y={rot}>
      <Stall kind={kind} />
      <NeonText
        text={sign}
        color={color}
        font={MARQUEE}
        width={2.5}
        position={[0, 4.1, 0.2]}
        flicker
      />
    </group>
  );
}

/** The midway: game booths on both flanks and strings of bulbs overhead. */
export function Midway() {
  return (
    <>
      {BOOTHS.map((b, i) => (
        <Booth
          key={b.sign}
          {...b}
          kind={STALLS[i % STALLS.length] ?? "stall-food"}
        />
      ))}
      {STRINGS.map(([a, b, sag], i) => (
        <Wire key={i} a={a} b={b} sag={sag} />
      ))}
      {POLES.map(([x, z], i) => (
        <mesh key={i} position={[x, 3.1, z]} material={LACQUER}>
          <cylinderGeometry args={[0.07, 0.07, 6.2, 8]} />
        </mesh>
      ))}
      <Bulbs points={BULBS} />
      <Copies geometry={PLUSH} material={PRIZE} items={PLUSH_ITEMS} />
      <Copies geometry={GIFT} material={PRIZE} items={GIFT_ITEMS} />
    </>
  );
}
