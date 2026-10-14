import { useMemo } from "react";
import * as THREE from "three";
import { canvasTex, GOLD, LACQUER, neonMat } from "../shared/materials.ts";
import { ROOM } from "./layout.ts";

// Tufted velvet walls with a lacquer wainscot and neon cornice.
export function Walls() {
  const tufted = useMemo(
    () =>
      canvasTex(
        256,
        256,
        (ctx) => {
          ctx.fillStyle = "#4a1046";
          ctx.fillRect(0, 0, 256, 256);
          // quilted diamonds: highlight top-left, shade bottom-right
          for (const [cx, cy] of [
            [128, 128],
            [0, 0],
            [256, 0],
            [0, 256],
            [256, 256],
          ]) {
            const g = ctx.createRadialGradient(
              cx - 30,
              cy - 30,
              6,
              cx,
              cy,
              130,
            );
            g.addColorStop(0, "rgba(255,140,220,0.30)");
            g.addColorStop(0.6, "rgba(120,20,100,0.0)");
            g.addColorStop(1, "rgba(10,0,15,0.55)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 128);
            ctx.lineTo(cx + 128, cy);
            ctx.lineTo(cx, cy + 128);
            ctx.lineTo(cx - 128, cy);
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(20,0,20,0.8)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 128);
          ctx.lineTo(128, 0);
          ctx.lineTo(256, 128);
          ctx.lineTo(128, 256);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = "#f6c46a";
          for (const [x, y] of [
            [0, 128],
            [128, 0],
            [256, 128],
            [128, 256],
          ]) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        [14, 6],
      ),
    [],
  );
  const velvet = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tufted,
        roughness: 0.75,
        metalness: 0.05,
      }),
    [tufted],
  );
  const H = 4.6;
  const wall = (pos: [number, number, number], ry: number) => (
    <group position={pos} rotation-y={ry}>
      <mesh position-y={H / 2} material={velvet}>
        <planeGeometry args={[12, H]} />
      </mesh>
      {/* black lacquer wainscot with gold rail */}
      <mesh position={[0, 0.5, 0.02]} material={LACQUER}>
        <boxGeometry args={[12, 1, 0.04]} />
      </mesh>
      <mesh position={[0, 1.02, 0.05]} material={GOLD}>
        <boxGeometry args={[12, 0.05, 0.06]} />
      </mesh>
      {[-5, -3, -1, 1, 3, 5].map((x) => (
        <mesh key={x} position={[x, H / 2, 0.03]} material={GOLD}>
          <boxGeometry args={[0.04, H, 0.04]} />
        </mesh>
      ))}
      {/* cornice neon */}
      <mesh position={[0, H - 0.25, 0.06]} material={neonMat("#b14dff", 3)}>
        <boxGeometry args={[12, 0.025, 0.025]} />
      </mesh>
      <mesh position={[0, 0.06, 0.06]} material={neonMat("#ff2f9a", 2.2)}>
        <boxGeometry args={[12, 0.02, 0.02]} />
      </mesh>
    </group>
  );
  return (
    <>
      {wall([0, 0, -ROOM], 0)}
      {wall([-ROOM, 0, 0], Math.PI / 2)}
      {wall([ROOM, 0, 0], -Math.PI / 2)}
    </>
  );
}
