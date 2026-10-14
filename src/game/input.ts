import type { Vec2 } from "./walk.ts";

// Keyboard codes that mean "move", as [right, forward]. Keys and the touch
// stick both feed the same move action, so new devices only add a source.
const MOVE_KEYS: Readonly<Record<string, Vec2>> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export const MOVE_CODES: ReadonlySet<string> = new Set(Object.keys(MOVE_KEYS));

/**
 * The move action as a unit vector: x is right, z is forward, both from the
 * player's point of view. Held keys and the stick add up, then the result is
 * clamped to length 1 so a diagonal is not faster. Null when nothing is held.
 */
export function moveAction(
  held: Iterable<string>,
  stick: { readonly x: number; readonly z: number },
): Vec2 | null {
  let x = stick.x;
  let z = stick.z;
  for (const code of held) {
    const k = MOVE_KEYS[code];
    if (k) {
      x += k[0];
      z += k[1];
    }
  }
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const len = Math.hypot(x, z);
  if (len === 0) return null;
  // only shrink: a half stick stays half speed
  const scale = len > 1 ? 1 / len : 1;
  return [x * scale, z * scale];
}
