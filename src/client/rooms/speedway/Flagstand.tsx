// Start/finish line and flagstand for the Speedway oval: checkered start line,
// overhead gantry with lights, scoring pylon and flagstand tower from Kenney.

import { useGLTF } from "@react-three/drei";
import { useCanvasTexture } from "./canvasTextures.ts";

const OVERHEAD_URL = "/models/speedway/overhead-lights.glb";
const FLAG_URL = "/models/speedway/flag-checkers.glb";
const PYLON_URL = "/models/speedway/pylon.glb";

useGLTF.preload(OVERHEAD_URL);
useGLTF.preload(FLAG_URL);
useGLTF.preload(PYLON_URL);

/** Start/finish line sits at x: 0, z: -40 in track local coordinates. */
export function Flagstand({
  origin = [0, -84],
}: {
  origin?: readonly [number, number];
}) {
  const { scene: overhead } = useGLTF(OVERHEAD_URL);
  const { scene: flag } = useGLTF(FLAG_URL);
  const { scene: pylon } = useGLTF(PYLON_URL);

  // Checkered start/finish line texture
  const checkered = useCanvasTexture("start-finish", 256, 64, (ctx, w, h) => {
    const size = 16;
    for (let x = 0; x < w; x += size) {
      for (let y = 0; y < h; y += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? "#ffffff" : "#111111";
        ctx.fillRect(x, y, size, size);
      }
    }
  });

  return (
    <group position={[origin[0], 0, origin[1]]}>
      {/* Checkered start/finish line strip */}
      <mesh position={[0, 0.02, -40]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.4, 14]} />
        <meshBasicMaterial map={checkered} toneMapped={false} />
      </mesh>

      {/* Overhead truss spanning across the track */}
      <primitive
        object={overhead.clone(true)}
        position={[0, 0, -40]}
        scale={[7, 7, 7]}
        rotation={[0, 0, 0]}
      />

      {/* the flagstand stands behind the inner wall, off the racing surface */}
      <group position={[-4, 0, -28.5]}>
        <primitive
          object={pylon.clone(true)}
          scale={[2.5, 3.5, 2.5]}
          position={[0, 0, 0]}
        />
        <primitive
          object={flag.clone(true)}
          scale={[3, 3, 3]}
          position={[0, 4.2, 0]}
        />
      </group>
    </group>
  );
}
