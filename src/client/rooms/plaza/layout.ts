import { ROOMS } from "../../../game/rooms.ts";

// Plaza coordinates match ROOMS.plaza.walkable: the sidewalk runs x -12..12
// and z -7..7. Shopfronts face +z with their glass at z = SHOP_Z, the curb sits
// at z = CURB_Z and the road runs on towards the camera.
export const SHOP_Z = -7.05;
export const CURB_Z = 7;
export const HALF_WIDTH = 12;
export const SHOP_HEIGHT = 5.6;

const [door] = ROOMS.plaza.portals;
/** The Mango Room entrance, centred on its portal. */
export const MANGO_DOOR_X = door.position[0];

export type Shop = {
  id: string;
  name: string;
  /** Centre and width along x. */
  x: number;
  width: number;
  color: string;
  accent: string;
  open: boolean;
};

export const SHOPS: readonly Shop[] = [
  {
    id: "arcade",
    name: "Arcade",
    x: -10.1,
    width: 3.8,
    color: "#3fe0d0",
    accent: "#7b4dff",
    open: false,
  },
  {
    id: "club",
    name: "AFTERGLOW",
    x: -5.4,
    width: 5.4,
    color: "#ff2f9a",
    accent: "#9b5cff",
    open: false,
  },
  {
    id: "mango-room",
    name: "the mango room",
    x: MANGO_DOOR_X,
    width: 4.6,
    color: "#ffb02e",
    accent: "#ff2f9a",
    open: true,
  },
  {
    id: "bar",
    name: "The Pit",
    x: 5.0,
    width: 4.6,
    color: "#ff7a1f",
    accent: "#3dff9a",
    open: false,
  },
  {
    id: "boutique",
    name: "Glaze",
    x: 9.7,
    width: 4.6,
    color: "#ff6ac8",
    accent: "#f7e7c6",
    open: false,
  },
];

/** Planter boxes cut into the curb; they match the notches in the floor. */
export const PLANTERS: readonly { x0: number; x1: number; z0: number }[] = [
  { x0: -6, x1: -3, z0: 5.5 },
  { x0: 3, x1: 6, z0: 5.5 },
];

/** Lamp posts along the curb; the string lights hang from them. */
export const LAMPS: readonly [number, number][] = [
  [-10.5, CURB_Z + 0.45],
  [-1.5, CURB_Z + 0.45],
  [7.5, CURB_Z + 0.45],
];
export const LAMP_TOP = 4.6;
