// Amusement Park decor coordinates. Ride tuning and paths live in
// src/game/amusementPark.ts; the midway walks x -9..9 and z -8..7.5, and the
// rides stand just behind its back edge at z -8.

// the turning rides stand where the game logic puts them (their seats too)
export {
  CAROUSEL_AT,
  DROP_TOWER_AT,
  SWING_AT,
  TEACUPS_AT,
} from "../../../game/amusementPark.ts";

// The entrance arch stands just outside the exit portal at z 6.9.
export const ENTRANCE_Z = 7.4;

export type Booth = {
  sign: string;
  color: string;
  accent: string;
  at: readonly [number, number];
  /** Rotation about y so the counter faces the midway. */
  rot: number;
};

export const BOOTHS: readonly Booth[] = [
  {
    sign: "TICKETS",
    color: "#ffb02e",
    accent: "#ff2f9a",
    at: [-11.5, 5.5],
    rot: Math.PI / 2,
  },
  {
    sign: "STEP RIGHT UP",
    color: "#ff2f9a",
    accent: "#3fe0d0",
    at: [-11.5, 0.5],
    rot: Math.PI / 2,
  },
  {
    sign: "RING TOSS",
    color: "#3fe0d0",
    accent: "#ffb02e",
    at: [-11.5, -4.5],
    rot: Math.PI / 2,
  },
  {
    sign: "SUGAR CLOUDS",
    color: "#ff6ac8",
    accent: "#9b5cff",
    at: [11.5, 4],
    rot: -Math.PI / 2,
  },
  {
    sign: "GALLERY",
    color: "#9b5cff",
    accent: "#ffb02e",
    at: [11.5, 0],
    rot: -Math.PI / 2,
  },
  {
    sign: "WHACK-A-MOLE",
    color: "#3dff9a",
    accent: "#ff2f9a",
    at: [11.5, -4.5],
    rot: -Math.PI / 2,
  },
];
