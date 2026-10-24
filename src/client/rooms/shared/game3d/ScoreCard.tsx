// A judge's score card on a stick: a white paddle with the score in heavy
// numerals, drawn on a canvas texture. Pops up when the score arrives.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../../motion.ts";
import { canvasTex } from "../materials.ts";

/** A held-up score card showing `score`; hidden while `score` is null. */
export function ScoreCard({
  score,
  ink = "#1d1440",
  ...rest
}: {
  score: string | null;
  ink?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const tex = useMemo(
    () =>
      canvasTex(256, 192, (ctx) => {
        ctx.fillStyle = "#fffdf6";
        ctx.fillRect(0, 0, 256, 192);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, 240, 176);
        ctx.fillStyle = ink;
        ctx.font = "800 120px 'Futura', 'Century Gothic', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(score ?? "", 128, 102, 228);
      }),
    [score, ink],
  );
  const calm = useReducedMotion();
  const group = useRef<THREE.Group>(null);
  const shown = useRef(0);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // the card is raised with a little spring, straight up under reduced motion
    const goal = score === null ? 0 : 1;
    shown.current = calm
      ? goal
      : shown.current + (goal - shown.current) * Math.min(1, dt * 9);
    g.visible = shown.current > 0.02;
    g.scale.setScalar(shown.current);
  });
  return (
    <group {...rest}>
      <group ref={group} visible={false}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.012]} />
          <meshStandardMaterial key={tex.uuid} map={tex} roughness={0.8} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
          <meshStandardMaterial color="#c79a5a" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
