import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";

/** A bank of stands: `rows` steps rising away from the field, `length`
 * metres long, centred on `at` and facing the way `yaw` turns +z. */
export type Bank = {
  at: readonly [number, number];
  yaw: number;
  length: number;
  rows: number;
};

/** How excited the crowd is, 0..1: set it when something happens, it
 * settles back on its own. */
export const crowd = { cheer: 0 };

const STEP_DEPTH = 0.9;
const STEP_RISE = 0.5;
const SEAT_GAP = 0.65;
const COLORS = [
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#7dff6b",
  "#b06bff",
  "#ff8a3d",
  "#f4f0ff",
  "#2e7dff",
];
const SKIN = ["#f3d4c4", "#e6b48e", "#c48d68", "#94603f", "#633c29"];

type Fan = { x: number; y: number; z: number; phase: number };

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(1, 1, 1),
  c: new THREE.Color(),
};

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
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
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
          });
        }
      }
    }
    return { steps, fans };
  }, [banks, fill, seed]);

  const colorAll = (mesh: THREE.InstancedMesh | null, palette: string[]) => {
    if (!mesh) return;
    fans.forEach((_, i) =>
      mesh.setColorAt(
        i,
        scratch.c.set(palette[(i * 7 + (i >> 3)) % palette.length]),
      ),
    );
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useFrame(({ clock }, dt) => {
    crowd.cheer = Math.max(0, crowd.cheer - dt * 0.35);
    const t = clock.elapsedTime;
    const b = bodies.current;
    const h = heads.current;
    if (!b || !h) return;
    const { m, q, p, s } = scratch;
    const jump = calm ? 0 : crowd.cheer;
    for (let i = 0; i < fans.length; i++) {
      const f = fans[i];
      const bob = calm
        ? 0
        : Math.max(0, Math.sin(t * (2 + jump * 6) + f.phase)) *
          (0.03 + jump * 0.35);
      p.set(f.x, f.y + 0.35 + bob, f.z);
      b.setMatrixAt(i, m.compose(p, q, s));
      p.y += 0.42;
      h.setMatrixAt(i, m.compose(p, q, s));
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
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
        <meshStandardMaterial color="#2a2440" roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        ref={(mesh) => {
          bodies.current = mesh;
          colorAll(mesh, COLORS);
        }}
        args={[undefined, undefined, fans.length]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.17, 0.36, 2, 6]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh
        ref={(mesh) => {
          heads.current = mesh;
          colorAll(mesh, SKIN);
        }}
        args={[undefined, undefined, fans.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </>
  );
}
