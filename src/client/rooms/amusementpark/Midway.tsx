import { useMemo } from "react";
import * as THREE from "three";
import { stringPoints, type Vec3 } from "../../../game/amusementPark.ts";
import { BOOTHS, type Booth as BoothSpec } from "./layout.ts";
import { Bulbs } from "./Bulbs.tsx";
import { Boxes, type Box } from "./Instanced.tsx";
import { useStripes } from "./Rides.tsx";
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

// A booth's counter and back wall, in the midway's own frame, turned into world
// boxes once so every booth shares a single instanced draw call.
const BOOTH_BOXES: readonly Box[] = BOOTHS.flatMap(
  ({ at, rot, accent }): Box[] => {
    const toWorld = (
      lx: number,
      ly: number,
      lz: number,
    ): [number, number, number] => [
      at[0] + lx * Math.cos(rot) + lz * Math.sin(rot),
      ly,
      at[1] - lx * Math.sin(rot) + lz * Math.cos(rot),
    ];
    return [
      {
        position: toWorld(0, 0.55, 0),
        size: [2.6, 1.1, 1],
        yaw: rot,
        color: "#2b1238",
      },
      {
        position: toWorld(0, 1.9, -0.4),
        size: [2.8, 2.6, 0.12],
        yaw: rot,
        color: accent,
      },
    ];
  },
);

/** One booth's awning and neon sign on the front. */
function Booth({ sign, color, accent, at, rot }: BoothSpec) {
  const awning = useStripes(color, accent);
  return (
    <group position={[at[0], 0, at[1]]} rotation-y={rot}>
      <mesh position={[0, 3.25, 0.2]} material={LACQUER}>
        <boxGeometry args={[3.1, 0.14, 1.9]} />
      </mesh>
      <mesh position={[0, 3.35, 0.2]}>
        <boxGeometry args={[3.0, 0.26, 1.7]} />
        <meshStandardMaterial map={awning} roughness={0.5} />
      </mesh>
      <NeonText
        text={sign}
        color={color}
        font={MARQUEE}
        width={2.5}
        position={[0, 2.55, 0.56]}
        flicker
      />
    </group>
  );
}

/** The midway: game booths on both flanks and strings of bulbs overhead. */
export function Midway() {
  return (
    <>
      <Boxes items={BOOTH_BOXES} />
      {BOOTHS.map((b) => (
        <Booth key={b.sign} {...b} />
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
    </>
  );
}
