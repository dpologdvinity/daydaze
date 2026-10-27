// The city's street furniture: models drawn instanced by the client
// (src/client/city/CityFurniture.tsx) at spots the city plan hands over, the
// way street trees are. Pure types and the per-kind draw rules; the spots
// themselves are laid out in dressing.ts (FURNITURE) and plan.ts (lamps).

/** The kinds that have a model under public/models/street/<kind>.glb (the park's under park/). */
export const FURNITURE_KINDS = [
  "lamp",
  "hydrant",
  "trashcan",
  "bench",
  "mailbox",
  "newsbox",
  "meter",
  "bikerack",
  "planter",
  "palm",
  "trafficlight",
  "fountain",
  "gazebo",
  "rowboat",
  "duck",
  "picnic-table",
  "basket",
  "blanket",
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
  /** Height of the ground it stands on, when it is not the street (the park's lawn). */
  y?: number;
};

/** Lamps are drawn, with their glow, out to this distance on every tier. */
export const LAMP_RANGE = 80;

/**
 * How far (meters) a kind is drawn from the player on the low tier and on the
 * high tier: small props vanish early, tall landmarks (lamps, bus shelters)
 * stay.
 */
export const FURNITURE_RANGE: Record<
  FurnitureKind,
  readonly [low: number, high: number]
> = {
  // the plan culls the lamp's night glow at the same distance (plan.ts)
  lamp: [LAMP_RANGE, LAMP_RANGE],
  hydrant: [25, 70],
  trashcan: [25, 70],
  bench: [30, 80],
  mailbox: [30, 80],
  newsbox: [30, 80],
  meter: [22, 60],
  bikerack: [25, 70],
  planter: [30, 80],
  palm: [45, 110],
  trafficlight: [60, 120],
  fountain: [80, 150],
  gazebo: [80, 150],
  rowboat: [70, 120],
  duck: [60, 110],
  "picnic-table": [45, 100],
  basket: [30, 70],
  blanket: [40, 90],
  busstop: [60, 140],
  "sign-stop": [50, 110],
  "sign-noparking": [40, 90],
};

/** Whether a spot at `distance` meters from the player is drawn. */
export const furnitureVisible = (
  kind: FurnitureKind,
  distance: number,
  low: boolean,
): boolean => distance <= FURNITURE_RANGE[kind][low ? 0 : 1];

/**
 * Where the signal lenses sit on the traffic light model (art/street/build_street.py
 * scales it to match): the top lens' height, the gap between lenses, and how far
 * the lens face stands out from the pole. Traffic.tsx draws the lit bulbs there.
 */
export const SIGNAL = {
  top: 4.06,
  gap: 0.535,
  out: 0.245,
  radius: 0.2,
} as const;

/** The park's kinds, whose models live in public/models/park/. */
export const PARK_KINDS: ReadonlySet<FurnitureKind> = new Set([
  "fountain",
  "gazebo",
  "rowboat",
  "duck",
  "picnic-table",
  "basket",
  "blanket",
]);
