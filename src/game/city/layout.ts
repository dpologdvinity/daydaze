// The Downtown and Nightlife Row slice: 384 m square, road graph, sidewalks,
// building footprints and street props. Pure data; the renderer and the
// walk rules both read it. Axis-aligned throughout, so every surface is a
// rectangle that the cell grid can clip.
import type { WalkArea } from "../area.ts";
import type { RoomId, Spawn } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";

export type Neighborhood = "downtown" | "nightlife-row";

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
/** Sidewalk width, outside the kerb. */
const SIDEWALK = 4;

export const CITY_BOUNDS: readonly Vec2[] = [
  [-HALF_CITY, -HALF_CITY],
  [HALF_CITY, -HALF_CITY],
  [HALF_CITY, HALF_CITY],
  [-HALF_CITY, HALF_CITY],
];

export const ROAD_NODES: readonly RoadNode[] = [
  { id: "west", position: [-192, 0] },
  { id: "a-mid", position: [-64, 0] },
  { id: "b-mid", position: [64, 0] },
  { id: "east", position: [192, 0] },
  { id: "a-north", position: [-64, -192] },
  { id: "a-south", position: [-64, 192] },
  { id: "b-north", position: [64, -192] },
  { id: "b-south", position: [64, 192] },
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
  sign?: { text: string; color: string };
  /** A line of people waits on the forecourt. */
  queue?: boolean;
  door?: Door;
};

export type Surface = {
  kind: "road" | "sidewalk" | "square";
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

export const BUILDINGS: readonly Building[] = [
  // Downtown, south of the avenue
  {
    id: "glass-tower",
    neighborhood: "downtown",
    footprint: rect(-184, 14, -146, 52),
    height: 64,
    style: "glass",
    sign: { text: "SKYLINE", color: "#4fe3ff" },
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
    id: "prism-club",
    neighborhood: "nightlife-row",
    footprint: rect(100, 14, 126, 40),
    height: 22,
    style: "club",
    queue: true,
    sign: { text: "PRISM", color: "#ff4fb3" },
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
      for (let z = -180; z <= 180; z += 60) {
        if (Math.abs(z) < 11) continue;
        props.push({ kind: "tree", position: [x, z] });
      }
    }
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
