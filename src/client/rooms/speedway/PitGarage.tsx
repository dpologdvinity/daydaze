import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { NEON } from "./neon.ts";
import type { Box } from "./strips.ts";

/** The pit garage stands behind the apron's left corner. */
export const GARAGE_ORIGIN: Vec2 = [-15.5, -12];

const BODY: Box[] = [
  {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    length: 6,
    height: 4,
    depth: 5,
    color: undefined,
  },
];
const DOOR: Box[] = [
  {
    x: 0,
    y: 0.2,
    z: 2.52,
    yaw: 0,
    length: 3.8,
    height: 2.8,
    depth: 0.06,
    color: NEON.pink,
  },
];
const SIGN: Box[] = [
  {
    x: 0,
    y: 4,
    z: 2.2,
    yaw: 0,
    length: 5.6,
    height: 0.3,
    depth: 0.1,
    color: NEON.cyan,
  },
];

/** A dark garage with a glowing roll-up door and a sign strip. */
export function PitGarage() {
  return (
    <group position={[GARAGE_ORIGIN[0], 0, GARAGE_ORIGIN[1]]}>
      <Boxes boxes={BODY} color="#17132e" />
      <Boxes boxes={DOOR} glow />
      <Boxes boxes={SIGN} glow />
    </group>
  );
}
