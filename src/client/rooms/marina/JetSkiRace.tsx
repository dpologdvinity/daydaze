import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CarState } from "../../../game/driving/car.ts";
import { advance } from "../../../game/driving/fixedStep.ts";
import { JET_SKI } from "../../../game/driving/roster.ts";
import { startRace, stepSession } from "../../../game/speedway/session.ts";
import { HARBOR_RUN } from "../../../game/speedway/track.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { driving, releaseControls } from "../../world/driving.ts";
import { ChaseCamera } from "../speedway/ChaseCamera.tsx";

/** The course sits out past the yachts, on the water. */
const ORIGIN: Vec2 = [0, -52];
const WATER_Y = -0.5;
const BOTS = 5;
const COLORS = [
  "#ffffff",
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#b06bff",
  "#7dff6b",
];
const BUOY_EVERY = 3;

/** A sit-down jet ski: a pointed hull, the seat and the bars. */
function JetSki({
  color,
  ref,
}: {
  color: string;
  ref: (g: THREE.Group | null) => void;
}) {
  return (
    <group ref={ref} visible={false}>
      <mesh position-y={0.25} scale={[0.55, 0.25, 1.4]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, -0.25]}>
        <boxGeometry args={[0.35, 0.14, 0.9]} />
        <meshStandardMaterial color="#141018" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, 0.45]}>
        <boxGeometry args={[0.7, 0.05, 0.05]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Buoys down both sides of the course, orange and white. */
function Buoys() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    const pts = HARBOR_RUN.centerline;
    const half = HARBOR_RUN.width / 2 + 0.6;
    for (let i = 0; i < pts.length; i += BUOY_EVERY) {
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[(i + 1) % pts.length];
      const p = pts[i];
      if (!a || !b || !p) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len;
      const nz = (b[0] - a[0]) / len;
      for (const side of [1, -1])
        out.push([p[0] + nx * half * side, p[1] + nz * half * side]);
    }
    return out;
  }, []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const orange = new THREE.Color("#ff7a2a");
    const white = new THREE.Color("#f4f4f8");
    spots.forEach(([x, z], i) => {
      o.position.set(ORIGIN[0] + x, WATER_Y + 0.15, ORIGIN[1] + z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, i % 4 < 2 ? orange : white);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spots]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, spots.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.35, 10, 8]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

/** Puts one craft between the last two ticks, turning the short way. */
function place(
  g: THREE.Group | null | undefined,
  a: CarState,
  b: CarState,
  alpha: number,
) {
  if (!g) return;
  g.visible = true;
  g.position.set(
    ORIGIN[0] + a.position[0] + (b.position[0] - a.position[0]) * alpha,
    WATER_Y,
    ORIGIN[1] + a.position[1] + (b.position[1] - a.position[1]) * alpha,
  );
  const turn = b.yaw - a.yaw;
  g.rotation.y = a.yaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * alpha;
}

/**
 * The jet-ski race at the Marina: the Speedway's race rules on a buoyed
 * course out on the water, five rivals on the grid. Started from the
 * Marina's race panel; the chase camera follows your ski.
 */
export function JetSkiRace() {
  const canvas = useThree((s) => s.gl.domElement);
  const skis = useRef<(THREE.Group | null)[]>([]);
  const mine = useRef<THREE.Group | null>(null);
  const live = useRef(false);
  useEffect(() => {
    live.current = true;
    const id = window.setInterval(() => {
      const s = driving.session;
      canvas.dataset.racePhase = s?.kind === "race" ? s.race.phase : "walk";
    }, 100);
    return () => {
      live.current = false;
      window.clearInterval(id);
      if (driving.session?.kind === "race") driving.session = null;
      releaseControls();
    };
  }, [canvas]);
  useFrame((_, dt) => {
    if (!live.current) return;
    const request = driving.request;
    if (request === "race-harbor") {
      driving.request = null;
      releaseControls();
      driving.session = startRace(HARBOR_RUN, JET_SKI, BOTS, "easy");
    } else if (request === "leave") {
      driving.request = null;
      driving.session = null;
    }
    const s = driving.session;
    if (s?.kind !== "race") {
      for (const g of skis.current) if (g) g.visible = false;
      mine.current = null;
      return;
    }
    const alpha = advance(s.clock, dt, () => stepSession(s, driving.input));
    s.race.cars.forEach((car, i) => {
      const prev = s.prev.cars[i];
      if (prev) place(skis.current[i], prev.state, car.state, alpha);
    });
    mine.current = skis.current[0] ?? null;
  });
  return (
    <>
      {/* open sea past the room's own water, where the course runs */}
      <mesh position={[0, WATER_Y - 0.02, -120]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[400, 240]} />
        <meshStandardMaterial
          color="#0b2a4a"
          metalness={0.5}
          roughness={0.25}
        />
      </mesh>
      <Buoys />
      {COLORS.map((color, i) => (
        <JetSki
          key={i}
          color={color}
          ref={(g) => {
            skis.current[i] = g;
          }}
        />
      ))}
      <ChaseCamera target={mine} />
    </>
  );
}
