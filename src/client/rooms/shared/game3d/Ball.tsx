// A game ball (volleyball, beach ball): a lit sphere with seams that rolls
// as it flies. The game supplies `track`, which writes where the ball is
// this frame and says whether it's in play, so nothing allocates per frame.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../../game/motion/ball.ts";

const at: Vec3 = [0, 0, 0];

/** A ball that follows `track`; hidden while `track` returns false. */
export function Ball({
  track,
  radius = 0.11,
  color = "#fff6d8",
  stripe = "#2f7fff",
}: {
  /** Writes the ball's position into `out`; false hides it. */
  track: (out: Vec3) => boolean;
  radius?: number;
  color?: string;
  stripe?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const last = useRef<Vec3>([0, 0, 0]);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const was = g.visible;
    g.visible = track(at);
    if (!g.visible) return;
    // roll along the direction of travel (from where it is, on a fresh serve)
    const p = last.current;
    if (!was) {
      p[0] = at[0];
      p[1] = at[1];
      p[2] = at[2];
    }
    const dx = at[0] - p[0];
    const dz = at[2] - p[2];
    g.rotation.x += dz / radius;
    g.rotation.z -= dx / radius;
    g.position.set(at[0], at[1], at[2]);
    p[0] = at[0];
    p[1] = at[1];
    p[2] = at[2];
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[radius, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* two seam bands, like a volleyball's panels */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.002, radius * 0.08, 6, 24]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radius * 1.002, radius * 0.08, 6, 24]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
    </group>
  );
}
