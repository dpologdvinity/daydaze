// City street-food stops, menus and walk-up rules. No renderer or wallet side effects.
import { streetLoop, type StreetPose } from "./streetLoop.ts";
import type { Vec2 } from "../walk.ts";
import { isCoins, spend } from "../wallet.ts";

export const ICE_CREAM_STOPS = [
  {
    name: "Park Avenue",
    at: [254, -264] as const,
    road: [254, -260.5] as const,
    yaw: Math.PI,
  },
  {
    name: "Beach boardwalk",
    at: [24, 265] as const,
    road: [24, 260.7] as const,
    yaw: 0,
  },
];
export const ICE_CREAM_ROUTE = streetLoop(
  ICE_CREAM_STOPS,
  [
    [
      [-67.7, -260.5],
      [-67.7, 260.7],
    ],
    [
      [323, 260.7],
      [323, -260.5],
    ],
  ],
  30,
  8,
);
export const FOOD_MENUS = {
  "ice-cream": [
    { id: "vanilla", name: "Vanilla cone", price: 5 },
    { id: "strawberry", name: "Strawberry swirl", price: 6 },
    { id: "mango", name: "Mango ice pop", price: 4 },
  ],
  "hot-dog": [
    { id: "classic", name: "Classic hot dog", price: 6 },
    { id: "veggie", name: "Veggie dog", price: 6 },
  ],
  pretzel: [
    { id: "salted", name: "Salted pretzel", price: 4 },
    { id: "cinnamon", name: "Cinnamon pretzel", price: 5 },
  ],
  halal: [
    { id: "chicken", name: "Chicken and rice", price: 9 },
    { id: "falafel", name: "Falafel and rice", price: 8 },
  ],
  churro: [
    { id: "sugar", name: "Cinnamon churro", price: 4 },
    { id: "chocolate", name: "Chocolate churro", price: 5 },
  ],
} as const;
export type FoodKind = keyof typeof FOOD_MENUS;
export const FOOD_NAMES: Record<FoodKind, string> = {
  "ice-cream": "Ice-cream truck",
  "hot-dog": "Hot dogs",
  pretzel: "Pretzels",
  halal: "Halal cart",
  churro: "Churros",
};
export const FOOD_CARTS: readonly {
  kind: Exclude<FoodKind, "ice-cream">;
  at: Vec2;
  service: Vec2;
  color: string;
}[] = [
  { kind: "hot-dog", at: [-18, 13], service: [-18, 15.6], color: "#eab895" },
  { kind: "halal", at: [20, 13], service: [20, 15.6], color: "#b8d8bd" },
  {
    kind: "pretzel",
    at: [246, -270],
    service: [246, -267.4],
    color: "#edcda2",
  },
  { kind: "churro", at: [262, -270], service: [262, -267.4], color: "#e8b6c9" },
];
export const FOOD_DRAW_RANGE = 42;
export const VENDOR_RANGE = 12;
export const FOOD_ORDER_RANGE = 4;
export function canOrderFood(
  kind: FoodKind,
  at: Vec2,
  truck: StreetPose,
  walking: boolean,
): boolean {
  if (!walking) return false;
  if (kind === "ice-cream")
    return truck.stop >= 0 && Math.hypot(at[0] - truck.x, at[1] - truck.z) <= 6;
  const cart = FOOD_CARTS.find((c) => c.kind === kind);
  return (
    !!cart &&
    Math.hypot(at[0] - cart.service[0], at[1] - cart.service[1]) <=
      FOOD_ORDER_RANGE
  );
}
export function buyStreetFood(
  coins: number,
  kind: FoodKind,
  itemId: string,
): number | null {
  if (!isCoins(coins)) return null;
  const item = FOOD_MENUS[kind].find((i) => i.id === itemId);
  return item ? spend(coins, item.price) : null;
}

/** Cart bodies are solid; the open service side stays walkable. */
export const FOOD_BLOCKERS: readonly (readonly Vec2[])[] = FOOD_CARTS.map(
  ({ at: [x, z] }) => [
    [x - 1.2, z - 1],
    [x + 1.2, z - 1],
    [x + 1.2, z + 1],
    [x - 1.2, z + 1],
  ],
);
