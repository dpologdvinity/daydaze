// The Downtown and Nightlife Row slice: 384 m square, road graph, sidewalks,
// building footprints and street props. Pure data; the renderer and the
// walk rules both read it. Axis-aligned throughout, so every surface is a
// rectangle that the cell grid can clip.
import type { WalkArea } from "../area.ts";
import { FOOD_STOREFRONTS } from "../food/storefronts.ts";
import type { RoomId, Spawn } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";

export type Neighborhood = "downtown" | "nightlife-row" | "beachside";

export type RoadNode = { id: string; position: Vec2 };
export type RoadEdge = {
  from: string;
  to: string;
  /** Metres of asphalt across the edge. */
  width: number;
  /** Lanes in both directions. */
  lanes: number;
  /** Metres per second. */
  speedLimit: number;
};

const HALF_CITY = 192;
/** Beachside runs south of the old city edge to the water. */
const SOUTH_EDGE = 384;
/** Sidewalk width, outside the kerb. */
const SIDEWALK = 4;

export const CITY_BOUNDS: readonly Vec2[] = [
  [-HALF_CITY, -HALF_CITY],
  [HALF_CITY, -HALF_CITY],
  [HALF_CITY, SOUTH_EDGE],
  [-HALF_CITY, SOUTH_EDGE],
];

// Beachside, south of the old city: the Shore Boulevard runs east-west at
// SHORE_Z with the two cross streets coming down to it; south of its
// sidewalk the boardwalk, then the sand, then the water from WATER_Z.
export const SHORE_Z = 256;
export const BOARDWALK = { z0: 267, z1: 279 };
export const WATER_Z = 340;

export const ROAD_NODES: readonly RoadNode[] = [
  { id: "west", position: [-192, 0] },
  { id: "a-mid", position: [-64, 0] },
  { id: "b-mid", position: [64, 0] },
  { id: "east", position: [192, 0] },
  { id: "a-north", position: [-64, -192] },
  { id: "a-south", position: [-64, 192] },
  { id: "b-north", position: [64, -192] },
  { id: "b-south", position: [64, 192] },
  { id: "shore-w", position: [-192, SHORE_Z] },
  { id: "a-shore", position: [-64, SHORE_Z] },
  { id: "b-shore", position: [64, SHORE_Z] },
  { id: "shore-e", position: [192, SHORE_Z] },
];

/** Main Avenue runs east-west; two cross streets run north-south. */
export const ROAD_EDGES: readonly RoadEdge[] = [
  { from: "west", to: "a-mid", width: 14, lanes: 2, speedLimit: 13 },
  { from: "a-mid", to: "b-mid", width: 14, lanes: 2, speedLimit: 13 },
  { from: "b-mid", to: "east", width: 14, lanes: 2, speedLimit: 13 },
  { from: "a-north", to: "a-mid", width: 10, lanes: 1, speedLimit: 9 },
  { from: "a-mid", to: "a-south", width: 10, lanes: 1, speedLimit: 9 },
  { from: "b-north", to: "b-mid", width: 10, lanes: 1, speedLimit: 9 },
  { from: "b-mid", to: "b-south", width: 10, lanes: 1, speedLimit: 9 },
  // Beachside: the cross streets run on down to Shore Boulevard
  { from: "a-south", to: "a-shore", width: 10, lanes: 1, speedLimit: 9 },
  { from: "b-south", to: "b-shore", width: 10, lanes: 1, speedLimit: 9 },
  { from: "shore-w", to: "a-shore", width: 14, lanes: 2, speedLimit: 11 },
  { from: "a-shore", to: "b-shore", width: 14, lanes: 2, speedLimit: 11 },
  { from: "b-shore", to: "shore-e", width: 14, lanes: 2, speedLimit: 11 },
];

export type BuildingStyle =
  | "tower"
  | "glass"
  | "billboard"
  | "storefront"
  | "deck"
  | "brick"
  | "club"
  | "warehouse"
  | "velvet"
  | "gate";

export type Door = {
  position: Vec2;
  radius: number;
  label: string;
  target: RoomId;
  targetSpawn: Spawn;
};

export type Building = {
  id: string;
  neighborhood: Neighborhood;
  footprint: readonly Vec2[];
  height: number;
  style: BuildingStyle;
  /** Paint over the style's own colour (pastel beach houses). */
  color?: string;
  sign?: { text: string; color: string };
  /** A line of people waits on the forecourt. */
  queue?: boolean;
  door?: Door;
};

export type Surface = {
  kind: "road" | "sidewalk" | "square" | "boardwalk" | "sand";
  polygon: readonly Vec2[];
};

export type PropKind = "lamp" | "palm" | "tree";
export type Prop = { kind: PropKind; position: Vec2 };

export function rect(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

function nodeAt(id: string): Vec2 {
  const node = ROAD_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`unknown road node ${id}`);
  return node.position;
}

/** The asphalt of one road edge, a rectangle along its centreline. */
export function roadRect(edge: RoadEdge): Vec2[] {
  const [ax, az] = nodeAt(edge.from);
  const [bx, bz] = nodeAt(edge.to);
  const h = edge.width / 2;
  if (az === bz) {
    return rect(Math.min(ax, bx), az - h, Math.max(ax, bx), az + h);
  }
  return rect(ax - h, Math.min(az, bz), ax + h, Math.max(az, bz));
}

/** The two sidewalks beside one road edge, outside the kerb. */
export function sidewalkRects(edge: RoadEdge): Vec2[][] {
  const [ax, az] = nodeAt(edge.from);
  const [bx, bz] = nodeAt(edge.to);
  const h = edge.width / 2;
  if (az === bz) {
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    return [
      rect(x0, az + h, x1, az + h + SIDEWALK),
      rect(x0, az - h - SIDEWALK, x1, az - h),
    ];
  }
  const z0 = Math.min(az, bz);
  const z1 = Math.max(az, bz);
  return [
    rect(ax + h, z0, ax + h + SIDEWALK, z1),
    rect(ax - h - SIDEWALK, z0, ax - h, z1),
  ];
}

// The Nightlife Row forecourts sit between the avenue sidewalk and the club
// fronts, so the doors have somewhere to stand.
const SQUARE = rect(-50, 11, 50, 44);
const FORECOURT_SOUTH = rect(73, 11, 192, 14);
const FORECOURT_NORTH = rect(73, -14, 192, -11);

export const CITY_SURFACES: readonly Surface[] = [
  ...ROAD_EDGES.map((edge): Surface => ({
    kind: "road",
    polygon: roadRect(edge),
  })),
  ...ROAD_EDGES.flatMap((edge) =>
    sidewalkRects(edge).map((polygon): Surface => ({
      kind: "sidewalk",
      polygon,
    })),
  ),
  { kind: "square", polygon: SQUARE },
  { kind: "sidewalk", polygon: FORECOURT_SOUTH },
  { kind: "sidewalk", polygon: FORECOURT_NORTH },
  {
    kind: "boardwalk",
    polygon: rect(-HALF_CITY, BOARDWALK.z0, HALF_CITY, BOARDWALK.z1),
  },
  { kind: "sand", polygon: rect(-HALF_CITY, BOARDWALK.z1, HALF_CITY, WATER_Z) },
];

// In the square, facing south: the Splash Zone gate stands behind the doll, so
// its sign frames the first view, and no door is in trigger range.
export const CITY_SPAWN: Spawn = { position: [8, 12], yaw: 0 };

const VELVET_DOOR: Door = {
  position: [112, -12.5],
  radius: 2,
  label: "Into the Velvet Room",
  target: "velvet-room",
  // The Velvet Room's own arrival point; see rooms.ts.
  targetSpawn: { position: [0.9, 1.6], yaw: 0.25 },
};

// Nightlife Row's south forecourt: the Pulse door opens onto the sidewalk.
const PULSE_DOOR: Door = {
  position: [113, 12.5],
  radius: 2,
  label: "Into Pulse",
  target: "pulse",
  // Pulse's own arrival point; see rooms.ts
  targetSpawn: { position: [0, 2.6], yaw: Math.PI },
};

const VIOLET_HOUR_DOOR: Door = {
  position: [130, -12.5],
  radius: 2,
  label: "Into The Violet Hour",
  target: "violet-hour",
  // The Violet Hour's own arrival point; see rooms.ts
  targetSpawn: { position: [0, 2.6], yaw: Math.PI },
};

// The apartment door is on the Glass Tower's avenue face; the jail sits on a
// free lot west of the arcade square.
const APARTMENT_DOOR: Door = {
  position: [-165, 12.5],
  radius: 2,
  label: "Up to your apartment",
  target: "apartment",
  // The apartment's own arrival point; see rooms.ts
  targetSpawn: { position: [0, 1.8], yaw: Math.PI },
};

const JAIL_DOOR: Door = {
  position: [-86, 12.5],
  radius: 2,
  label: "Into City Jail",
  target: "jail",
  // The jail's own arrival point; see rooms.ts
  targetSpawn: { position: [0, 2.6], yaw: Math.PI },
};

const CARNIVAL_DOOR: Door = {
  position: [185, -12.5],
  radius: 2,
  label: "Into the Night Carnival",
  target: "amusement-park",
  // the park's arrival point; see rooms.ts
  targetSpawn: { position: [0, 4.6], yaw: Math.PI },
};

const SPEEDWAY_DOOR: Door = {
  position: [81, -12.5],
  radius: 2,
  label: "Into the Speedway",
  target: "speedway",
  // the Speedway's arrival point; see rooms.ts
  targetSpawn: { position: [-8, 0], yaw: Math.PI / 2 },
};

const SPLASH_DOOR: Door = {
  position: [4, -12.5],
  radius: 2,
  label: "Into the Splash Zone",
  target: "water-park",
  // the water park's arrival point; see rooms.ts
  targetSpawn: { position: [6.5, 2.5], yaw: -2.4 },
};

// Beachside, along the north side of Shore Boulevard: pastel houses and
// beach shops facing the water.
const BEACH_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  color: string;
  sign?: { text: string; color: string };
  style?: BuildingStyle;
}[] = [
  { x: -176, w: 18, h: 9, color: "#ffb3c7" },
  {
    x: -152,
    w: 20,
    h: 11,
    color: "#bfe8ff",
    sign: { text: "SURF SHACK", color: "#3fe0d0" },
    style: "storefront",
  },
  { x: -128, w: 18, h: 8, color: "#fff0a8" },
  {
    x: -104,
    w: 22,
    h: 13,
    color: "#c9b3ff",
    sign: { text: "SUNSET MOTEL", color: "#ff8a3d" },
    style: "brick",
  },
  {
    x: -40,
    w: 18,
    h: 9,
    color: "#a8f0d0",
    sign: { text: "SHAVE ICE", color: "#ff6ac8" },
    style: "storefront",
  },
  { x: -16, w: 18, h: 10, color: "#ffc9a8" },
  {
    x: 16,
    w: 22,
    h: 12,
    color: "#ff9ec2",
    sign: { text: "TIKI BAR", color: "#ffb02e" },
    style: "storefront",
  },
  { x: 40, w: 16, h: 8, color: "#b3e5ff" },
  {
    x: 96,
    w: 24,
    h: 14,
    color: "#d9b3ff",
    sign: { text: "BOARDWALK ARCADE", color: "#4fe3ff" },
    style: "billboard",
  },
  { x: 124, w: 18, h: 9, color: "#fff3c9" },
  {
    x: 148,
    w: 18,
    h: 11,
    color: "#ffb3b3",
    sign: { text: "SWIMWEAR", color: "#ff2f9a" },
    style: "storefront",
  },
  { x: 174, w: 16, h: 8, color: "#b3ffd9" },
];

const BEACH_BUILDINGS: readonly Building[] = [
  ...BEACH_FRONT.map((b, i): Building => ({
    id: `beach-${i}`,
    neighborhood: "beachside",
    footprint: rect(b.x - b.w / 2, SHORE_Z - 34, b.x + b.w / 2, SHORE_Z - 13),
    height: b.h,
    style: b.style ?? "deck",
    color: b.color,
    sign: b.sign,
  })),
];

export const BUILDINGS: readonly Building[] = [
  // Downtown, south of the avenue
  {
    id: "glass-tower",
    neighborhood: "downtown",
    footprint: rect(-184, 14, -146, 52),
    height: 64,
    style: "glass",
    sign: { text: "SKYLINE", color: "#4fe3ff" },
    door: APARTMENT_DOOR,
  },
  {
    id: "billboard-block",
    neighborhood: "downtown",
    footprint: rect(-140, 14, -100, 52),
    height: 36,
    style: "billboard",
    sign: { text: "SKYLINE SUPPLY", color: "#ff4fb3" },
  },
  {
    id: "pixel-arcade",
    neighborhood: "downtown",
    footprint: rect(-184, 58, -146, 96),
    height: 16,
    style: "storefront",
    sign: { text: "PIXEL PIER", color: "#7dff6b" },
  },
  {
    id: "parking-deck",
    neighborhood: "downtown",
    footprint: rect(-140, 58, -100, 96),
    height: 22,
    style: "deck",
  },
  {
    id: "exchange-block",
    neighborhood: "downtown",
    footprint: rect(-184, 104, -120, 150),
    height: 28,
    style: "brick",
    sign: { text: "EXCHANGE CAFE", color: "#ffd84f" },
  },
  {
    id: "arcade-square",
    neighborhood: "downtown",
    footprint: rect(-46, 48, -14, 84),
    height: 18,
    style: "storefront",
    sign: { text: "ARCADE SQUARE", color: "#ffd84f" },
  },
  {
    id: "vesper-hotel",
    neighborhood: "downtown",
    footprint: rect(18, 48, 46, 96),
    height: 52,
    style: "glass",
    sign: { text: "VESPER HOTEL", color: "#b06bff" },
  },
  {
    id: "noodle-lane",
    neighborhood: "downtown",
    footprint: rect(-46, 92, -14, 120),
    height: 12,
    style: "storefront",
    sign: { text: "NOODLE NIGHT", color: "#ff8a3d" },
  },
  {
    id: "skydeck",
    neighborhood: "downtown",
    footprint: rect(18, 104, 46, 132),
    height: 30,
    style: "glass",
    sign: { text: "SKYDECK", color: "#4fe3ff" },
  },
  // Downtown, north of the avenue
  {
    id: "bus-shelter-block",
    neighborhood: "downtown",
    footprint: rect(-46, -60, -14, -16),
    height: 12,
    style: "storefront",
    sign: { text: "BUS 9", color: "#ffd84f" },
  },
  {
    id: "mural-wall",
    neighborhood: "downtown",
    footprint: rect(18, -60, 46, -16),
    height: 20,
    style: "brick",
    sign: { text: "DAYDAZE DINER", color: "#ff4fb3" },
  },
  {
    id: "city-trust",
    neighborhood: "downtown",
    footprint: rect(-184, -60, -146, -16),
    height: 58,
    style: "tower",
    sign: { text: "CITY TRUST", color: "#4fe3ff" },
  },
  {
    id: "pawn-gadgets",
    neighborhood: "downtown",
    footprint: rect(-140, -40, -100, -16),
    height: 14,
    style: "storefront",
    sign: { text: "PAWN AND GADGETS", color: "#ffd84f" },
  },
  {
    id: "cine-noir",
    neighborhood: "downtown",
    footprint: rect(-184, -120, -146, -70),
    height: 34,
    style: "billboard",
    sign: { text: "CINE NOIR", color: "#ff4fb3" },
  },
  {
    id: "thrift-house",
    neighborhood: "downtown",
    footprint: rect(-140, -96, -100, -64),
    height: 10,
    style: "storefront",
    sign: { text: "THRIFT HOUSE", color: "#7dff6b" },
  },
  // Nightlife Row, south of the avenue
  {
    id: "pulse",
    neighborhood: "nightlife-row",
    footprint: rect(100, 14, 126, 40),
    height: 22,
    style: "club",
    queue: true,
    sign: { text: "PULSE", color: "#ff4fb3" },
    door: PULSE_DOOR,
  },
  {
    id: "sugar-rush-club",
    neighborhood: "nightlife-row",
    footprint: rect(136, 14, 176, 40),
    height: 26,
    style: "club",
    queue: true,
    sign: { text: "SUGAR RUSH", color: "#ffd84f" },
  },
  {
    id: "karaoke-loft",
    neighborhood: "nightlife-row",
    footprint: rect(100, 48, 126, 84),
    height: 30,
    style: "brick",
    sign: { text: "KARAOKE LOFT", color: "#b06bff" },
  },
  {
    id: "bassline",
    neighborhood: "nightlife-row",
    footprint: rect(136, 48, 176, 90),
    height: 18,
    style: "warehouse",
    sign: { text: "BASSLINE", color: "#4fe3ff" },
  },
  {
    id: "city-jail",
    neighborhood: "downtown",
    footprint: rect(-96, 14, -76, 40),
    height: 12,
    style: "brick",
    sign: { text: "CITY JAIL", color: "#ff5c5c" },
    door: JAIL_DOOR,
  },
  // Nightlife Row, north of the avenue
  {
    id: "velvet-room",
    neighborhood: "nightlife-row",
    footprint: rect(100, -40, 124, -14),
    height: 14,
    style: "velvet",
    sign: { text: "THE VELVET ROOM", color: "#f6c46a" },
    door: VELVET_DOOR,
  },
  {
    // A narrow frontage in the gap between the Velvet Room and the Back Room.
    id: "violet-hour",
    neighborhood: "nightlife-row",
    footprint: rect(126, -40, 134, -14),
    height: 16,
    style: "club",
    sign: { text: "VIOLET HOUR", color: "#b06bff" },
    door: VIOLET_HOUR_DOOR,
  },
  {
    id: "speakeasy",
    neighborhood: "nightlife-row",
    footprint: rect(136, -60, 176, -14),
    height: 20,
    style: "brick",
    sign: { text: "BACK ROOM", color: "#ff8a3d" },
  },
  {
    id: "glitter-bar",
    neighborhood: "nightlife-row",
    footprint: rect(136, -96, 176, -64),
    height: 24,
    style: "club",
    sign: { text: "GLITTER", color: "#ff4fb3" },
  },
  {
    // The gate to the Amusement Park: walking through its door loads the park.
    id: "carnival-gate",
    neighborhood: "nightlife-row",
    footprint: rect(180, -40, 190, -14),
    height: 16,
    style: "gate",
    sign: { text: "NIGHT CARNIVAL", color: "#ff8a3d" },
    door: CARNIVAL_DOOR,
  },
  {
    // The gate to the Water Park, on the north avenue between two blocks.
    id: "splash-gate",
    neighborhood: "downtown",
    footprint: rect(-6, -40, 10, -14),
    height: 12,
    style: "gate",
    sign: { text: "SPLASH ZONE", color: "#4fe3ff" },
    door: SPLASH_DOOR,
  },
  {
    // The gate to the Speedway, on the north avenue sidewalk past the cross street.
    id: "speedway-gate",
    neighborhood: "nightlife-row",
    footprint: rect(76, -40, 86, -14),
    height: 14,
    style: "gate",
    sign: { text: "SPEEDWAY", color: "#ff4fb3" },
    door: SPEEDWAY_DOOR,
  },
  // The food venues: one storefront each, two of them with doors.
  ...FOOD_STOREFRONTS,
  ...BEACH_BUILDINGS,
];

// x of each north-south street; each has two edges, so dedupe.
const CROSS_STREETS = [
  ...new Set(
    ROAD_EDGES.filter((e) => nodeAt(e.from)[0] === nodeAt(e.to)[0]).map(
      (e) => nodeAt(e.from)[0],
    ),
  ),
];

function nearCross(x: number): boolean {
  return CROSS_STREETS.some((cx) => Math.abs(x - cx) < 11);
}

// Street props sit on the sidewalks; the avenue lamps and palms alternate,
// and cross streets get trees every 60 m. Props block the walk like a post.
function buildProps(): Prop[] {
  const props: Prop[] = [];
  for (let x = -180; x <= 180; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [-9, 9]) props.push({ kind: "lamp", position: [x, z] });
  }
  for (let x = -165; x <= 165; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [-9, 9]) props.push({ kind: "palm", position: [x, z] });
  }
  for (const cx of CROSS_STREETS) {
    for (const x of [cx - 7, cx + 7]) {
      for (let z = -180; z <= 240; z += 60) {
        if (Math.abs(z) < 11) continue;
        props.push({ kind: "tree", position: [x, z] });
      }
    }
  }
  // Beachside: palms down both sides of Shore Boulevard, lamps along the
  // boardwalk's sea edge, and palms scattered over the sand
  for (let x = -174; x <= 174; x += 36) {
    if (nearCross(x)) continue;
    for (const z of [SHORE_Z - 9, SHORE_Z + 9])
      props.push({ kind: "palm", position: [x, z] });
  }
  for (let x = -186; x <= 186; x += 31)
    props.push({ kind: "lamp", position: [x, BOARDWALK.z1 - 0.6] });
  for (let i = 0; i < 9; i++) {
    // a fixed scatter, not random: the same beach every visit
    const x = -170 + ((i * 113) % 340);
    const z = BOARDWALK.z1 + 8 + ((i * 37) % 44);
    props.push({ kind: "palm", position: [x, z] });
  }
  return props;
}

export const PROPS: readonly Prop[] = buildProps();

const PROP_HALF = 0.25;

/** Everything solid: building footprints, then the prop posts. */
const CITY_BLOCKERS: readonly (readonly Vec2[])[] = [
  ...BUILDINGS.map((b) => b.footprint),
  ...PROPS.map(({ position: [x, z] }) =>
    rect(x - PROP_HALF, z - PROP_HALF, x + PROP_HALF, z + PROP_HALF),
  ),
];

/** The walk rules for the whole city: surfaces, solid blockers and doors. */
export const CITY_AREA: WalkArea = {
  surfaces: CITY_SURFACES.map((s) => s.polygon),
  blockers: CITY_BLOCKERS,
  portals: BUILDINGS.flatMap((b) =>
    b.door
      ? [
          {
            id: `door-${b.id}`,
            position: b.door.position,
            radius: b.door.radius,
            label: b.door.label,
            target: b.door.target,
            targetSpawn: b.door.targetSpawn,
          },
        ]
      : [],
  ),
};
