// Snack vending machines (public/models/street/vending.glb): the soda they sell,
// where the indoor ones stand (Skyline Supply, Player 2, Boardwalk Arcade; the
// street's stand in the city plan as "vending" furniture) and when the player
// is close enough to use one. Pure: the rooms read the machines' footprints for
// their blockers, the client draws them and opens the panel.
import { spend } from "./wallet.ts";
import type { Vec2 } from "./walk.ts";

/** One machine: where it stands and which way its front faces (yaw about y, front +z). */
export type Machine = { x: number; z: number; yaw: number };

/** The model's footprint in meters (art/vending/build_vending.py): width, depth. */
export const SIZE = { width: 1.19, depth: 0.76 } as const;
/** How near (meters from its center) the player must be to use a machine. */
export const REACH = 2.4;

/** The soda: made-up brands, a few coins each. */
export const DRINKS = [
  { id: "peach-fizz", name: "Pip's Peach Fizz", price: 2 },
  { id: "glow-berry", name: "Glow Berry Pop", price: 2 },
  { id: "mango-moon", name: "Mango Moon Soda", price: 3 },
] as const;

/** The machines inside the venues, each against a wall facing into the room. */
export const ROOM_MACHINES = {
  // the east wall, between the shelving and the checkouts
  market: [{ x: 8.57, z: -2.8, yaw: -Math.PI / 2 }],
  // the west wall by the door, past the pinball table
  "arcade-bar": [{ x: -5.57, z: 4.4, yaw: Math.PI / 2 }],
  // the west wall, past the pinballs
  "boardwalk-arcade": [{ x: -8.57, z: 3.9, yaw: Math.PI / 2 }],
} as const satisfies Record<string, readonly Machine[]>;

export type VendingRoom = keyof typeof ROOM_MACHINES;

/** A machine's footprint as a blocker polygon, turned by its yaw. */
export function machineBox(m: Machine): Vec2[] {
  const hw = SIZE.width / 2;
  const hd = SIZE.depth / 2;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  // local (x right, z front) to the room: x' = x c + z s, z' = -x s + z c
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([x, z]): Vec2 => [m.x + x * c + z * s, m.z - x * s + z * c]);
}

/** Whether (x, z) is within reach of any of `machines`. */
export const machineNear = (
  machines: readonly Machine[],
  x: number,
  z: number,
): boolean => machines.some((m) => Math.hypot(m.x - x, m.z - z) <= REACH);

/** The wallet after buying drink `id`, or null when it is unknown or too dear. */
export function buyDrink(coins: number, id: string): number | null {
  const drink = DRINKS.find((d) => d.id === id);
  return drink ? spend(coins, drink.price) : null;
}
