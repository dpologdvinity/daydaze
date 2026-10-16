import * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { useCanvasTexture } from "./canvasTextures.ts";
import { NEON } from "./neon.ts";
import { pitMarkingPaint, posterPaint } from "./speedwayArt.ts";
import type { Box } from "./strips.ts";
import { Tyres, type Tyre } from "./Tyres.tsx";

/** The pit garage stands behind the apron's left corner. */
export const GARAGE_ORIGIN: Vec2 = [-15.5, -12];

const PAINT = "#17132e";
const TRIM = new THREE.Color("#2a2448");

// Open front: the walls, roof and bench are solid, the door is rolled up.
const SHELL: Box[] = [
  // back, left and right walls, roof
  {
    x: 0,
    y: 0,
    z: -2.4,
    yaw: 0,
    length: 6,
    height: 4,
    depth: 0.25,
    color: undefined,
  },
  {
    x: -2.875,
    y: 0,
    z: 0,
    yaw: 0,
    length: 0.25,
    height: 4,
    depth: 5,
    color: undefined,
  },
  {
    x: 2.875,
    y: 0,
    z: 0,
    yaw: 0,
    length: 0.25,
    height: 4,
    depth: 5,
    color: undefined,
  },
  {
    x: 0,
    y: 3.85,
    z: 0,
    yaw: 0,
    length: 6,
    height: 0.3,
    depth: 5,
    color: undefined,
  },
  // the rolled-up door housing above the opening
  {
    x: 0,
    y: 3.55,
    z: 2.4,
    yaw: 0,
    length: 6,
    height: 0.3,
    depth: 0.4,
    color: TRIM,
  },
  // a workbench along the back wall
  {
    x: 0,
    y: 0,
    z: -1.8,
    yaw: 0,
    length: 4.6,
    height: 0.95,
    depth: 0.8,
    color: TRIM,
  },
];
const GLOW: Box[] = [
  // pink door edges and the rolled door's lit bottom bar
  {
    x: -2.85,
    y: 0,
    z: 2.5,
    yaw: 0,
    length: 0.12,
    height: 3.5,
    depth: 0.1,
    color: NEON.pink,
  },
  {
    x: 2.85,
    y: 0,
    z: 2.5,
    yaw: 0,
    length: 0.12,
    height: 3.5,
    depth: 0.1,
    color: NEON.pink,
  },
  {
    x: 0,
    y: 3.5,
    z: 2.5,
    yaw: 0,
    length: 5.6,
    height: 0.1,
    depth: 0.1,
    color: NEON.pink,
  },
  // ceiling strip lights, unlit boxes so they cost no real light
  {
    x: -1.2,
    y: 3.78,
    z: 0.5,
    yaw: 0,
    length: 1.6,
    height: 0.05,
    depth: 0.2,
    color: NEON.cyan,
  },
  {
    x: 1.6,
    y: 3.78,
    z: -0.6,
    yaw: 0,
    length: 1.6,
    height: 0.05,
    depth: 0.2,
    color: NEON.pink,
  },
  // sign strip on the roof
  {
    x: 0,
    y: 4.2,
    z: 2.2,
    yaw: 0,
    length: 5.6,
    height: 0.3,
    depth: 0.1,
    color: NEON.cyan,
  },
];
// flat tyres stacked in the back corner, off the bench
const TYRES: Tyre[] = [0.16, 0.48, 0.8].map((y) => ({
  at: [-2.1, -1.2],
  y,
}));

/** A dark garage with an open front: a bench, tyres and a poster inside, the door rolled up. */
export function PitGarage() {
  const poster = useCanvasTexture("poster", 256, 256, posterPaint);
  const markings = useCanvasTexture("pit-markings", 768, 384, pitMarkingPaint);
  return (
    <group position={[GARAGE_ORIGIN[0], 0, GARAGE_ORIGIN[1]]}>
      <Boxes boxes={SHELL} color={PAINT} />
      <Boxes boxes={GLOW} glow />
      <Tyres tyres={TYRES} />
      <mesh position={[0, 2.1, -2.26]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={poster} toneMapped={false} />
      </mesh>
      {/* bay lines painted on the apron in front of the garage */}
      <mesh position={[0, 0.02, 6.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial
          map={markings}
          transparent
          depthWrite={false}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}
