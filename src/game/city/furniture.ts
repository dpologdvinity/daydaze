// The city's street furniture: models drawn instanced by the client
// (src/client/city/CityFurniture.tsx) at spots the city plan hands over, the
// way street trees are. Pure types and the per-kind draw rules; the spots
// themselves are laid out in dressing.ts (FURNITURE) and plan.ts (lamps).

/** The kinds that have a model under public/models/street/<kind>.glb. */
export const FURNITURE_KINDS = [
  "lamp",
  "hydrant",
  "trashcan",
  "bench",
  "mailbox",
  "newsbox",
  "meter",
  "bikerack",
  "busstop",
  "sign-stop",
  "sign-noparking",
] as const;

export type FurnitureKind = (typeof FURNITURE_KINDS)[number];

/** One piece of furniture: where it stands, which way it faces (yaw about y) and its size. */
export type FurnitureSpot = {
  kind: FurnitureKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
};

/**
 * How far (meters) a kind is drawn from the player on the low tier and on the
 * high tier: small props vanish early, tall landmarks (lamps, bus shelters)
 * stay.
 */
export const FURNITURE_RANGE: Record<
  FurnitureKind,
  readonly [low: number, high: number]
> = {
  lamp: [90, 200],
  hydrant: [35, 80],
  trashcan: [35, 80],
  bench: [40, 90],
  mailbox: [40, 90],
  newsbox: [35, 80],
  meter: [30, 70],
  bikerack: [35, 80],
  busstop: [70, 140],
  "sign-stop": [50, 110],
  "sign-noparking": [40, 90],
};

/** Whether a spot at `distance` meters from the player is drawn. */
export const furnitureVisible = (
  kind: FurnitureKind,
  distance: number,
  low: boolean,
): boolean => distance <= FURNITURE_RANGE[kind][low ? 0 : 1];
