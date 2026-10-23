import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BELT,
  onBelt,
  plateKind,
  plateX,
  PLATES,
  ROUND_SECONDS,
  SEAT_X,
} from "../../../game/sushiCatch.ts";
import { secondsIn, sushi, tick } from "./session.ts";

/** The belt runs the counter's length (6 m) at this scale. */
const K = 6 / BELT;
const MAX = Math.ceil(BELT / 0.8) + 2;
const Y = 1.2;
const Z = -0.7;
const COLORS = PLATES.map((p) => new THREE.Color(p.color));
const m = new THREE.Matrix4();
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * The conveyor along the counter: plates, each with its piece of sushi in
 * the plate's color, riding left to right. Out of a round it idles at the
 * starting speed; in one it is the round's own belt.
 */
export function SushiBelt(): JSX.Element {
  const plates = useRef<THREE.InstancedMesh>(null);
  const pieces = useRef<THREE.InstancedMesh>(null);
  const plateMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f4f0e8", roughness: 0.4 }),
    [],
  );
  const pieceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    [],
  );
  useFrame(() => {
    const p = plates.current;
    const q = pieces.current;
    if (!p || !q) return;
    const now = performance.now();
    tick(now);
    const s = sushi.get();
    const t = s.on
      ? Math.min(secondsIn(now), ROUND_SECONDS)
      : (now / 1000) % 20;
    const seed = s.on ? s.round.seed : 1;
    const { first, last } = onBelt(t);
    let i = 0;
    for (let n = first; n <= last && i < MAX; n++, i++) {
      const gone = s.on && s.round.taken.includes(n);
      if (gone) {
        p.setMatrixAt(i, hidden);
        q.setMatrixAt(i, hidden);
        continue;
      }
      const x = plateX(n, t) * K;
      m.makeTranslation(x, Y, Z);
      p.setMatrixAt(i, m);
      m.makeTranslation(x, Y + 0.05, Z);
      q.setMatrixAt(i, m);
      const kind = PLATES.findIndex((k) => k.id === plateKind(seed, n));
      const c = COLORS[kind];
      if (c) q.setColorAt(i, c);
    }
    for (; i < MAX; i++) {
      p.setMatrixAt(i, hidden);
      q.setMatrixAt(i, hidden);
    }
    p.instanceMatrix.needsUpdate = true;
    q.instanceMatrix.needsUpdate = true;
    if (q.instanceColor) q.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      {/* the belt itself, and your spot marked on it */}
      <mesh position={[0, Y - 0.03, Z]}>
        <boxGeometry args={[6, 0.04, 0.32]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.6} />
      </mesh>
      <mesh position={[SEAT_X * K, Y - 0.005, Z + 0.17]}>
        <boxGeometry args={[0.5, 0.012, 0.02]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      <instancedMesh ref={plates} args={[undefined, plateMat, MAX]}>
        <cylinderGeometry args={[0.12, 0.09, 0.03, 16]} />
      </instancedMesh>
      <instancedMesh ref={pieces} args={[undefined, pieceMat, MAX]}>
        <boxGeometry args={[0.12, 0.05, 0.07]} />
      </instancedMesh>
    </group>
  );
}
