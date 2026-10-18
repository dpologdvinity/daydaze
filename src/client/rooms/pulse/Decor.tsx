import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { DECO, NeonText } from "../shared/Neon.tsx";
import { canvasTex, neonMat } from "../shared/materials.ts";
import { BACK_Z, DJ_BOOTH } from "./layout.ts";

const WALL_HEIGHT = 4;
const LED_COLORS = ["#ff2f9a", "#9b5cff", "#4fe3ff", "#ffb02e", "#3dff9a"];

// the back wall: violet panels with a glowing pink seam every half meter
const BACK_WALL_TEX = canvasTex(
  256,
  128,
  (ctx) => {
    ctx.fillStyle = "#2a0b3e";
    ctx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 64) {
      ctx.fillStyle = "#ff2f9a";
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x, 0, 3, 128);
      ctx.globalAlpha = 1;
    }
    const g = ctx.createRadialGradient(128, 64, 8, 128, 64, 140);
    g.addColorStop(0, "rgba(155,92,255,0.55)");
    g.addColorStop(1, "rgba(42,11,62,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  },
  [3, 1],
);
const BACK_WALL = new THREE.MeshStandardMaterial({
  map: BACK_WALL_TEX,
  roughness: 0.6,
});
// the mirror ball's facets, as a scatter of bright and dim squares
const DISCO = new THREE.MeshBasicMaterial({
  map: canvasTex(64, 64, (ctx) => {
    for (let x = 0; x < 64; x += 4)
      for (let y = 0; y < 64; y += 4) {
        const v = (x * 7 + y * 13) % 11;
        ctx.fillStyle = v > 6 ? "#ffffff" : v > 3 ? "#9fb8ff" : "#33304a";
        ctx.fillRect(x, y, 4, 4);
      }
  }),
  toneMapped: false,
});

/** The back wall, its PULSE sign, and the LED wall behind the DJ. */
export function Walls() {
  return (
    <>
      <mesh position={[0, WALL_HEIGHT / 2, BACK_Z]} material={BACK_WALL}>
        <boxGeometry args={[13.2, WALL_HEIGHT, 0.2]} />
      </mesh>
      <NeonText
        text="PULSE"
        color="#ff4fb3"
        font={DECO}
        width={3.4}
        k={4}
        position={[0, 2.9, BACK_Z + 0.25]}
      />
      <LedWall />
    </>
  );
}

/**
 * A grid of colored LED pixels that scrolls sideways. Only the texture
 * offset moves, so it costs one draw call and no allocation per frame.
 */
function LedWall() {
  const calm = useReducedMotion();
  const tex = useMemo(
    () =>
      canvasTex(
        256,
        128,
        (ctx) => {
          for (let x = 0; x < 16; x++)
            for (let y = 0; y < 8; y++) {
              ctx.fillStyle = LED_COLORS[(x * 3 + y * 2) % LED_COLORS.length];
              ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12);
            }
        },
        [1, 1],
      ),
    [],
  );
  useFrame(({ clock }) => {
    if (!calm) tex.offset.x = (clock.elapsedTime * 0.06) % 1;
  });
  return (
    <mesh position={[DJ_BOOTH.x, 1.9, BACK_Z + 1.45]}>
      <planeGeometry args={[2.9, 1.3]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** A mirror ball over the dance floor, its facets turning in the light. */
export function MirrorBall() {
  const ball = useRef<THREE.Mesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (ball.current && !calm)
      ball.current.rotation.y = clock.elapsedTime * 0.5;
  });
  return (
    <group position={[0, 3.2, 1.2]}>
      <mesh ref={ball} material={DISCO}>
        <sphereGeometry args={[0.38, 20, 14]} />
      </mesh>
      <mesh position-y={0.55} material={neonMat("#c9b7d8", 0.6)}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
      </mesh>
    </group>
  );
}
