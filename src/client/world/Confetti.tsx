import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../motion.ts";
import { prizeDesk } from "../ui/prizeDesk.ts";

const COUNT = 160;
const SECONDS = 3.6;
const COLORS = [
  "#ff2f9a",
  "#ffb02e",
  "#4fe3ff",
  "#7dff6b",
  "#d9c8ff",
  "#fff1a8",
];

/**
 * A burst of confetti in front of the camera whenever a prize is posted:
 * one instanced draw, hidden between bursts. Pieces fall and flutter; an S
 * grade throws twice as many. Off under reduced motion.
 */
export function Confetti() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seen = useRef(0);
  const live = useRef(0);
  const state = useMemo(
    () => ({
      pos: new Float32Array(COUNT * 3),
      vel: new Float32Array(COUNT * 3),
      spin: new Float32Array(COUNT * 3),
      started: 0,
    }),
    [],
  );
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(1, 1, 1),
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
    }),
    [],
  );
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++)
      m.setColorAt(i, c.set(COLORS[i % COLORS.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const { shown, at } = prizeDesk.get();
    if (!calm && shown && at !== seen.current) {
      seen.current = at;
      live.current = shown.grade === "S" ? COUNT : COUNT / 2;
      state.started = performance.now();
      // burst from a point ahead of and above the eye, fanning out
      camera.getWorldDirection(tmp.fwd);
      tmp.right.crossVectors(tmp.fwd, camera.up).normalize();
      tmp.up.crossVectors(tmp.right, tmp.fwd).normalize();
      tmp.p.copy(camera.position).addScaledVector(tmp.fwd, 4);
      tmp.p.addScaledVector(tmp.up, 1.2);
      for (let i = 0; i < live.current; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 3.2;
        state.pos.set([tmp.p.x, tmp.p.y, tmp.p.z], i * 3);
        const side = Math.cos(a) * r;
        const lift = 2 + Math.random() * 3;
        const depth = Math.sin(a) * r * 0.5;
        const { right, up, fwd } = tmp;
        state.vel[i * 3] = right.x * side + up.x * lift + fwd.x * depth;
        state.vel[i * 3 + 1] = right.y * side + up.y * lift + fwd.y * depth;
        state.vel[i * 3 + 2] = right.z * side + up.z * lift + fwd.z * depth;
        state.spin.set(
          [Math.random() * 6, Math.random() * 6, Math.random() * 6],
          i * 3,
        );
      }
      m.count = live.current;
    }
    const age = (performance.now() - state.started) / 1000;
    m.visible = live.current > 0 && age < SECONDS;
    if (!m.visible) return;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < live.current; i++) {
      const k = i * 3;
      // gravity, and air drag that sets the pieces fluttering down
      state.vel[k + 1] -= 6 * step;
      for (let j = 0; j < 3; j++) {
        state.vel[k + j] *= 1 - 1.6 * step;
        state.pos[k + j] += state.vel[k + j] * step;
      }
      state.pos[k] += Math.sin(age * 5 + i) * 0.4 * step;
      tmp.e.set(
        state.spin[k] * age,
        state.spin[k + 1] * age,
        state.spin[k + 2] * age,
      );
      tmp.q.setFromEuler(tmp.e);
      tmp.p.set(state.pos[k], state.pos[k + 1], state.pos[k + 2]);
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, COUNT]}
      visible={false}
      frustumCulled={false}
    >
      <planeGeometry args={[0.09, 0.05]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}
