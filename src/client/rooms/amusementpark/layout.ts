import {
  buildTrack,
  type FerrisWheel,
  type Vec3,
} from "../../../game/amusementPark.ts";

// Amusement Park coordinates match ROOMS["amusement-park"]: the midway walks
// x -9..9 and z -8..7.5, and the rides stand just behind its back edge at z -8.

export const FERRIS: FerrisWheel = { hub: [-6.5, 7.6, -10], radius: 6 };
export const FERRIS_SPOT: readonly [number, number] = [-6.5, -7];
export const CAROUSEL_AT: readonly [number, number] = [-4.5, -20];
export const TEACUPS_AT: readonly [number, number] = [-11.5, -20];
export const SWING_AT: readonly [number, number] = [-1.5, -28];
export const DROP_TOWER_AT: readonly [number, number] = [-11.5, -28];

// Control points of the coaster loop; the station is the first point.
export const COASTER_CONTROLS: readonly Vec3[] = [
  [6.5, 1.4, -10.5],
  [11.5, 3.8, -12],
  [14.5, 9.5, -16.5],
  [12.5, 13.5, -21],
  [7, 10, -23.5],
  [2.5, 5, -20],
  [3.5, 1.4, -14],
];
export const COASTER_TRACK = buildTrack(COASTER_CONTROLS);
export const COASTER_SPOT: readonly [number, number] = [6.5, -7];

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
