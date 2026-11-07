import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { surface } from "../../city/worldTexture.ts";
import {
  FAN_MODELS,
  PERSON_SCALE,
  usePerson,
} from "../speedway/peopleModel.ts";

// poured-concrete steps, painted
const STEPS = surface("brushed_concrete", {
  scale: 0.8,
  color: "#7a7090",
  roughness: 0.9,
});

/** A bank of stands: `rows` steps rising away from the field, `length`
 * meters long, centered on `at` and facing the way `yaw` turns +z. */
export type Bank = {
  at: readonly [number, number];
  yaw: number;
  length: number;
  rows: number;
};

/** How excited the crowd is, 0..1: set it when something happens, it
 * settles back on its own. */
export const crowd = { cheer: 0 };

/** Seconds between Mexican waves, and how long one takes to go round. */
const WAVE_EVERY = 45;
const WAVE_SECONDS = 7;

const STEP_DEPTH = 0.9;
const STEP_RISE = 0.5;
const SEAT_GAP = 0.65;
type Fan = {
  x: number;
  y: number;
  z: number;
  phase: number;
  /** Where round the ground she sits, 0..1. */
  turn: number;
  /** Turned to face the field. */
  yaw: number;
  /** Which of the eight baked poses she is (look x standing or cheering). */
  model: number;
  /** A little taller or shorter than the next fan. */
  size: number;
};

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(1, 1, 1),
  up: new THREE.Vector3(0, 1, 0),
};

/** One baked fan pose as an instanced mesh, handed to Stands to place each frame. */
function FanMesh({
  name,
  capacity,
  mesh,
}: {
  name: string;
  capacity: number;
  mesh: (m: THREE.InstancedMesh | null) => void;
}) {
  const person = usePerson(name);
  if (!person || capacity === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[person.geometry, person.material, capacity]}
      frustumCulled={false}
    />
  );
}

/**
 * Stands and the fans in them: the steps in one draw call, the fans' bodies
 * and heads in two more, bobbing in their seats and jumping up when the
 * crowd cheers. Fill is the share of seats taken.
 */
export function Stands({
  banks,
  fill = 0.75,
  seed = 1,
}: {
  banks: readonly Bank[];
  fill?: number;
  seed?: number;
}) {
  const calm = useReducedMotion();
  const poses = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { steps, fans } = useMemo(() => {
    let r = seed * 9301 + 49297;
    const rand = () => {
      r = (r * 9301 + 49297) % 233280;
      return r / 233280;
    };
    const steps: {
      x: number;
      y: number;
      z: number;
      yaw: number;
      len: number;
    }[] = [];
    const fans: Fan[] = [];
    for (const bank of banks) {
      const cos = Math.cos(bank.yaw);
      const sin = Math.sin(bank.yaw);
      // local (along, back) to world: back is away from the field (-facing)
      const place = (along: number, back: number) => [
        bank.at[0] + along * cos - back * sin,
        bank.at[1] - along * sin - back * cos,
      ];
      for (let row = 0; row < bank.rows; row++) {
        const back = row * STEP_DEPTH + STEP_DEPTH / 2;
        const [x, z] = place(0, back);
        steps.push({
          x,
          y: (row + 0.5) * STEP_RISE,
          z,
          yaw: bank.yaw,
          len: bank.length,
        });
        const seats = Math.floor(bank.length / SEAT_GAP);
        for (let k = 0; k < seats; k++) {
          if (rand() > fill) continue;
          const along = (k - (seats - 1) / 2) * SEAT_GAP;
          const [fx, fz] = place(along, back);
          fans.push({
            x: fx,
            y: (row + 0.5) * STEP_RISE,
            z: fz,
            phase: rand() * 6,
            turn: 0,
            yaw: bank.yaw,
            // four looks, about a quarter of them cheering
            model: Math.floor(rand() * 4) * 2 + (rand() < 0.28 ? 1 : 0),
            size: 0.88 + rand() * 0.12,
          });
        }
      }
    }
    // each fan's place round the ground, 0..1, for the wave to sweep
    const cx = fans.reduce((t, f) => t + f.x, 0) / Math.max(1, fans.length);
    const cz = fans.reduce((t, f) => t + f.z, 0) / Math.max(1, fans.length);
    for (const f of fans)
      f.turn = (Math.atan2(f.z - cz, f.x - cx) / (Math.PI * 2) + 1) % 1;
    return { steps, fans };
  }, [banks, fill, seed]);

  // how many fans of each pose there are, and each fan's slot in its pose's mesh
  const { perPose, slots } = useMemo(() => {
    const perPose = new Array<number>(FAN_MODELS.length).fill(0);
    const slots = fans.map((f) => perPose[f.model]++);
    return { perPose, slots };
  }, [fans]);

  useFrame(({ clock }, dt) => {
    crowd.cheer = Math.max(0, crowd.cheer - dt * 0.35);
    const t = clock.elapsedTime;
    const { m, q, p, s, up } = scratch;
    const jump = calm ? 0 : crowd.cheer;
    // a Mexican wave goes round every so often
    const front = ((t % WAVE_EVERY) / WAVE_SECONDS) * 1.3 - 0.15;
    for (let i = 0; i < fans.length; i++) {
      const f = fans[i];
      const mesh = poses.current[f.model];
      if (!mesh) continue;
      const bob = calm
        ? 0
        : Math.max(0, Math.sin(t * (2 + jump * 6) + f.phase)) *
          (0.03 + jump * 0.35);
      const d = (f.turn - front) * 10;
      const wave = calm || front > 1.2 ? 0 : Math.exp(-d * d) * 0.45;
      q.setFromAxisAngle(up, f.yaw);
      p.set(f.x, f.y + bob + wave, f.z);
      s.setScalar(PERSON_SCALE * 0.9 * f.size);
      mesh.setMatrixAt(slots[i], m.compose(p, q, s));
    }
    for (const mesh of poses.current) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        args={[undefined, undefined, steps.length]}
        ref={(mesh) => {
          if (!mesh) return;
          const { m, q, p, s } = scratch;
          steps.forEach((st, i) => {
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), st.yaw);
            mesh.setMatrixAt(
              i,
              m.compose(
                p.set(st.x, st.y / 2, st.z),
                q,
                s.set(st.len, st.y, STEP_DEPTH),
              ),
            );
          });
          s.set(1, 1, 1);
          q.identity();
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <boxGeometry />
        <primitive object={STEPS} attach="material" />
      </instancedMesh>
      {FAN_MODELS.map((name, i) => (
        <Suspense key={name} fallback={null}>
          <FanMesh
            name={name}
            capacity={perPose[i] ?? 0}
            mesh={(m) => {
              poses.current[i] = m;
            }}
          />
        </Suspense>
      ))}
    </>
  );
}
