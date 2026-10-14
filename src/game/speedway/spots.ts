import type { Vec2 } from "../walk.ts";

/** Where the player taps to start a race or ride the bumper cars. */
export const SPEEDWAY_SPOTS: readonly {
  id: "race-oval" | "race-boardwalk" | "bumper-cars";
  position: Vec2;
  radius: number;
  label: string;
}[] = [
  {
    id: "race-oval",
    position: [-5, 0],
    radius: 1.2,
    label: "Race the Neon Oval",
  },
  {
    id: "race-boardwalk",
    position: [-1.5, 0],
    radius: 1.2,
    label: "Race the Boardwalk Loop",
  },
  { id: "bumper-cars", position: [5.5, 0], radius: 1.2, label: "Bumper cars" },
];
