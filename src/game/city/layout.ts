// The Downtown and Nightlife Row slice: 384 m square, road graph, sidewalks,
// building footprints and street props. Pure data; the renderer and the
// walk rules both read it. Axis-aligned throughout, so every surface is a
// rectangle that the cell grid can clip.
import type { WalkArea } from "../area.ts";
import { FOOD_STOREFRONTS } from "../food/storefronts.ts";
import type { RoomId, Spawn } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";

export type Neighborhood =
  | "downtown"
  | "nightlife-row"
  | "beachside"
  | "little-manila"
  | "arts-district"
  | "chinatown-koreatown"
  | "uptown"
  | "suburbia"
  | "fairground";

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
/** Little Manila runs west of Downtown along the avenue. */
export const WEST_EDGE = -448;
/** Little Manila's cross street. */
export const MANILA_X = -320;
/** Chinatown and Koreatown run east of Nightlife Row along the avenue. */
export const EAST_EDGE = 448;
export const ASIA_X = 320;
/** The Arts District runs north of Downtown to Gallery Row and beyond. */
const NORTH_EDGE = -320;
export const GALLERY_Z = -256;
/** Sidewalk width, outside the kerb. */
const SIDEWALK = 4;

export const CITY_BOUNDS: readonly Vec2[] = [
  [WEST_EDGE, NORTH_EDGE],
  [EAST_EDGE, NORTH_EDGE],
  [EAST_EDGE, SOUTH_EDGE],
  [WEST_EDGE, SOUTH_EDGE],
];

// Beachside, south of the old city: the Shore Boulevard runs east-west at
// SHORE_Z with the two cross streets coming down to it; south of its
// sidewalk the boardwalk, then the sand, then the water from WATER_Z.
export const SHORE_Z = 256;
// The Fairground, south-east between the avenue's old edge and Shore
// Boulevard: its gates stand on a forecourt along the boulevard's north side.
export const FAIR_FORECOURT_Z = 239;
export const BOARDWALK = { z0: 267, z1: 279 };
export const WATER_Z = 340;
/** The pier: planks from the sand out over the water, wider at its head. */
export const PIER = { x: 24, half: 3, end: 378, head: 9 };
/** Uptown's Park and Gardens: a lawn north of Park Avenue. */
export const PARK = { x0: 204, x1: 300, z0: -316, z1: -266 };

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
  { id: "arts-w", position: [-192, GALLERY_Z] },
  { id: "a-arts", position: [-64, GALLERY_Z] },
  { id: "b-arts", position: [64, GALLERY_Z] },
  { id: "arts-e", position: [192, GALLERY_Z] },
  { id: "asia-mid", position: [ASIA_X, 0] },
  { id: "asia-e", position: [EAST_EDGE, 0] },
  { id: "asia-north", position: [ASIA_X, -192] },
  { id: "asia-south", position: [ASIA_X, 192] },
  { id: "up-mid", position: [ASIA_X, GALLERY_Z] },
  { id: "up-e", position: [EAST_EDGE, GALLERY_Z] },
  { id: "sub-mid", position: [MANILA_X, GALLERY_Z] },
  { id: "sub-w", position: [WEST_EDGE, GALLERY_Z] },
  { id: "shore-far-w", position: [WEST_EDGE, SHORE_Z] },
  { id: "m-shore", position: [MANILA_X, SHORE_Z] },
  { id: "asia-shore", position: [ASIA_X, SHORE_Z] },
  { id: "shore-far-e", position: [EAST_EDGE, SHORE_Z] },
  { id: "manila-w", position: [WEST_EDGE, 0] },
  { id: "m-mid", position: [MANILA_X, 0] },
  { id: "m-north", position: [MANILA_X, -192] },
  { id: "m-south", position: [MANILA_X, 192] },
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
  // Arts District: the cross streets run north to Gallery Row
  { from: "a-arts", to: "a-north", width: 10, lanes: 1, speedLimit: 9 },
  { from: "b-arts", to: "b-north", width: 10, lanes: 1, speedLimit: 9 },
  { from: "arts-w", to: "a-arts", width: 12, lanes: 2, speedLimit: 10 },
  { from: "a-arts", to: "b-arts", width: 12, lanes: 2, speedLimit: 10 },
  { from: "b-arts", to: "arts-e", width: 12, lanes: 2, speedLimit: 10 },
  // Chinatown and Koreatown: the avenue carries on east past Nightlife Row
  { from: "east", to: "asia-mid", width: 14, lanes: 2, speedLimit: 11 },
  { from: "asia-mid", to: "asia-e", width: 14, lanes: 2, speedLimit: 11 },
  { from: "asia-north", to: "asia-mid", width: 10, lanes: 1, speedLimit: 9 },
  { from: "asia-mid", to: "asia-south", width: 10, lanes: 1, speedLimit: 9 },
  // Uptown: Gallery Row carries on east as Park Avenue, and the Chinatown
  // street runs north to meet it
  { from: "arts-e", to: "up-mid", width: 12, lanes: 2, speedLimit: 10 },
  { from: "up-mid", to: "up-e", width: 12, lanes: 2, speedLimit: 10 },
  { from: "up-mid", to: "asia-north", width: 10, lanes: 1, speedLimit: 9 },
  // Suburbia: Gallery Row carries on west as Maple Drive, and Little
  // Manila's street runs north to meet it
  { from: "sub-w", to: "sub-mid", width: 10, lanes: 1, speedLimit: 9 },
  { from: "sub-mid", to: "arts-w", width: 10, lanes: 1, speedLimit: 9 },
  { from: "sub-mid", to: "m-north", width: 10, lanes: 1, speedLimit: 9 },
  // the coast: Shore Boulevard runs the city's whole width, and the
  // Little Manila and Chinatown streets run down to it
  { from: "shore-far-w", to: "m-shore", width: 14, lanes: 2, speedLimit: 11 },
  { from: "m-shore", to: "shore-w", width: 14, lanes: 2, speedLimit: 11 },
  { from: "shore-e", to: "asia-shore", width: 14, lanes: 2, speedLimit: 11 },
  {
    from: "asia-shore",
    to: "shore-far-e",
    width: 14,
    lanes: 2,
    speedLimit: 11,
  },
  { from: "m-south", to: "m-shore", width: 10, lanes: 1, speedLimit: 9 },
  { from: "asia-south", to: "asia-shore", width: 10, lanes: 1, speedLimit: 9 },
  // Little Manila: the avenue carries on west, crossed by its own street
  { from: "manila-w", to: "m-mid", width: 14, lanes: 2, speedLimit: 11 },
  { from: "m-mid", to: "west", width: 14, lanes: 2, speedLimit: 11 },
  { from: "m-north", to: "m-mid", width: 10, lanes: 1, speedLimit: 9 },
  { from: "m-mid", to: "m-south", width: 10, lanes: 1, speedLimit: 9 },
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
  kind: "road" | "sidewalk" | "square" | "boardwalk" | "sand" | "lawn";
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

// Suburbia, along Maple Drive: pastel two-storey houses behind front lawns,
// a 2000s strip mall, the supermarket, a drive-in diner and the high school.
const SUBURB_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  north: boolean;
  color: string;
  sign?: { text: string; color: string };
  style: BuildingStyle;
  /** Houses sit back behind a lawn; shops come up to the sidewalk. */
  house?: boolean;
}[] = [
  {
    x: -436,
    w: 14,
    h: 8,
    north: false,
    color: "#ffd6e0",
    style: "deck",
    house: true,
  },
  {
    x: -416,
    w: 14,
    h: 8,
    north: false,
    color: "#c1fba4",
    style: "deck",
    house: true,
  },
  {
    x: -396,
    w: 14,
    h: 9,
    north: false,
    color: "#a0c4ff",
    style: "deck",
    house: true,
  },
  {
    x: -374,
    w: 16,
    h: 8,
    north: false,
    color: "#fdffb6",
    style: "deck",
    house: true,
  },
  {
    x: -352,
    w: 14,
    h: 8,
    north: false,
    color: "#ffc6ff",
    style: "deck",
    house: true,
  },
  {
    x: -282,
    w: 30,
    h: 10,
    north: false,
    color: "#ffadad",
    sign: { text: "STRIP MALL", color: "#4fe3ff" },
    style: "storefront",
  },
  {
    x: -246,
    w: 34,
    h: 12,
    north: false,
    color: "#caffbf",
    sign: { text: "SUPERMARKET", color: "#ff2f9a" },
    style: "warehouse",
  },
  {
    x: -210,
    w: 22,
    h: 8,
    north: false,
    color: "#ffd166",
    sign: { text: "DRIVE-IN DINER", color: "#ff2f9a" },
    style: "storefront",
  },
  {
    x: -432,
    w: 18,
    h: 9,
    north: true,
    color: "#bdb2ff",
    style: "deck",
    house: true,
  },
  {
    x: -408,
    w: 16,
    h: 8,
    north: true,
    color: "#ffd6a5",
    style: "deck",
    house: true,
  },
  {
    x: -384,
    w: 18,
    h: 9,
    north: true,
    color: "#9bf6ff",
    style: "deck",
    house: true,
  },
  {
    x: -358,
    w: 16,
    h: 8,
    north: true,
    color: "#fffffc",
    style: "deck",
    house: true,
  },
  {
    x: -270,
    w: 60,
    h: 14,
    north: true,
    color: "#e5989b",
    sign: { text: "HIGH SCHOOL", color: "#ffd166" },
    style: "brick",
  },
  {
    x: -216,
    w: 22,
    h: 10,
    north: true,
    color: "#b5838d",
    sign: { text: "VIDEO RENTALS", color: "#4fe3ff" },
    style: "storefront",
  },
];

// front lawns: houses stand 9 m back from the sidewalk behind one
const SUBURB_BUILDINGS: readonly Building[] = SUBURB_FRONT.map(
  (b, i): Building => {
    const back = b.house ? 9 : 0;
    return {
      id: `suburb-${i}`,
      neighborhood: "suburbia",
      footprint: b.north
        ? rect(
            b.x - b.w / 2,
            GALLERY_Z - 40 - back,
            b.x + b.w / 2,
            GALLERY_Z - 10 - back,
          )
        : rect(
            b.x - b.w / 2,
            GALLERY_Z + 10 + back,
            b.x + b.w / 2,
            GALLERY_Z + 40 + back,
          ),
      height: b.h,
      style: b.style,
      color: b.color,
      sign: b.sign,
    };
  },
);

const SUBURB_LAWNS: readonly Surface[] = SUBURB_FRONT.filter(
  (b) => b.house,
).map((b): Surface => ({
  kind: "lawn",
  polygon: b.north
    ? rect(b.x - b.w / 2 - 1, GALLERY_Z - 19, b.x + b.w / 2 + 1, GALLERY_Z - 10)
    : rect(
        b.x - b.w / 2 - 1,
        GALLERY_Z + 10,
        b.x + b.w / 2 + 1,
        GALLERY_Z + 19,
      ),
}));

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
  // the Aquarium's forecourt, up to its doors from Park Avenue's sidewalk
  { kind: "sidewalk", polygon: rect(228, GALLERY_Z + 10, 248, GALLERY_Z + 12) },
  // the Fairground forecourt, either side of the Chinatown street
  { kind: "sidewalk", polygon: rect(200, FAIR_FORECOURT_Z, 310, SHORE_Z - 11) },
  { kind: "sidewalk", polygon: rect(330, FAIR_FORECOURT_Z, 440, SHORE_Z - 11) },
  {
    kind: "boardwalk",
    polygon: rect(WEST_EDGE, BOARDWALK.z0, EAST_EDGE, BOARDWALK.z1),
  },
  { kind: "sand", polygon: rect(WEST_EDGE, BOARDWALK.z1, EAST_EDGE, WATER_Z) },
  { kind: "lawn", polygon: rect(PARK.x0, PARK.z0, PARK.x1, PARK.z1) },
  ...SUBURB_LAWNS,
  {
    kind: "boardwalk",
    polygon: rect(
      PIER.x - PIER.half,
      WATER_Z,
      PIER.x + PIER.half,
      PIER.end - 10,
    ),
  },
  {
    kind: "boardwalk",
    polygon: rect(
      PIER.x - PIER.head,
      PIER.end - 10,
      PIER.x + PIER.head,
      PIER.end,
    ),
  },
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

// The Aquarium's door, on a strip of pavement between Park Avenue's south
// sidewalk and its glass front; see rooms.ts for where the exit lands.
const AQUARIUM_CITY_DOOR: Door = {
  position: [238, GALLERY_Z + 11.4],
  radius: 2,
  label: "Into the Aquarium",
  target: "aquarium",
  targetSpawn: { position: [0, 5.2], yaw: Math.PI },
};

const CARNIVAL_DOOR: Door = {
  position: [256, FAIR_FORECOURT_Z + 1.5],
  radius: 2,
  label: "Into the Night Carnival",
  target: "amusement-park",
  // the park's arrival point; see rooms.ts
  targetSpawn: { position: [0, 4.6], yaw: Math.PI },
};

const SPEEDWAY_DOOR: Door = {
  position: [384, FAIR_FORECOURT_Z + 1.5],
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

// Little Manila, both sides of the avenue west of Downtown: bakeries,
// canteens, karaoke and a sari-sari store under parol lanterns.
const MANILA_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  north: boolean;
  color: string;
  sign: { text: string; color: string };
  style: BuildingStyle;
}[] = [
  {
    x: -432,
    w: 20,
    h: 12,
    north: false,
    color: "#ffd166",
    sign: { text: "PANADERYA", color: "#ff8a3d" },
    style: "storefront",
  },
  {
    x: -406,
    w: 24,
    h: 16,
    north: false,
    color: "#ff6b8b",
    sign: { text: "KARAOKE GABI", color: "#4fe3ff" },
    style: "club",
  },
  {
    x: -378,
    w: 22,
    h: 10,
    north: false,
    color: "#7fd1ae",
    sign: { text: "SARI-SARI", color: "#ffe066" },
    style: "storefront",
  },
  {
    x: -350,
    w: 22,
    h: 13,
    north: false,
    color: "#c39bd3",
    sign: { text: "TURO-TURO", color: "#ff2f9a" },
    style: "storefront",
  },
  {
    x: -290,
    w: 24,
    h: 14,
    north: false,
    color: "#f7a072",
    sign: { text: "LECHON MANOK", color: "#ffd166" },
    style: "storefront",
  },
  {
    x: -262,
    w: 22,
    h: 18,
    north: false,
    color: "#9bd1f7",
    sign: { text: "BALIKBAYAN BOXES", color: "#ffffff" },
    style: "brick",
  },
  {
    x: -230,
    w: 26,
    h: 11,
    north: false,
    color: "#ffb3c7",
    sign: { text: "HALO-HALO", color: "#9b5cff" },
    style: "storefront",
  },
  {
    x: -432,
    w: 20,
    h: 14,
    north: true,
    color: "#a8e6cf",
    sign: { text: "SIOPAO", color: "#ff6b8b" },
    style: "storefront",
  },
  {
    x: -404,
    w: 26,
    h: 20,
    north: true,
    color: "#ffaaa5",
    sign: { text: "BARANGAY HALL", color: "#ffd166" },
    style: "brick",
  },
  {
    x: -374,
    w: 22,
    h: 12,
    north: true,
    color: "#dcedc1",
    sign: { text: "UBE & CO", color: "#9b5cff" },
    style: "storefront",
  },
  {
    x: -348,
    w: 18,
    h: 10,
    north: true,
    color: "#ffd3b6",
    sign: { text: "PALENGKE", color: "#3fe0d0" },
    style: "warehouse",
  },
  {
    x: -292,
    w: 22,
    h: 16,
    north: true,
    color: "#bdb2ff",
    sign: { text: "TITA'S KITCHEN", color: "#ff8a3d" },
    style: "storefront",
  },
  {
    x: -264,
    w: 22,
    h: 12,
    north: true,
    color: "#ffc6ff",
    sign: { text: "BIBINGKA", color: "#ffe066" },
    style: "storefront",
  },
  {
    x: -232,
    w: 26,
    h: 22,
    north: true,
    color: "#caffbf",
    sign: { text: "PADALA", color: "#4fe3ff" },
    style: "tower",
  },
];

// The Arts District: warehouses and studios either side of Gallery Row,
// painted fronts for the murals, record and thrift shops, the tattoo studio
// and the techno warehouse club.
const ARTS_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  north: boolean;
  color: string;
  sign?: { text: string; color: string };
  style: BuildingStyle;
}[] = [
  {
    x: -170,
    w: 30,
    h: 16,
    north: false,
    color: "#ff6b6b",
    sign: { text: "VINYL VAULT", color: "#ffe066" },
    style: "warehouse",
  },
  { x: -132, w: 30, h: 22, north: false, color: "#4ecdc4", style: "warehouse" },
  {
    x: -96,
    w: 26,
    h: 14,
    north: false,
    color: "#ffe066",
    sign: { text: "THRIFT TEMPLE", color: "#ff2f9a" },
    style: "brick",
  },
  {
    x: -32,
    w: 28,
    h: 12,
    north: false,
    color: "#c77dff",
    sign: { text: "ESPRESSO LAB", color: "#ffd166" },
    style: "storefront",
  },
  { x: 2, w: 24, h: 18, north: false, color: "#ff9f1c", style: "warehouse" },
  {
    x: 36,
    w: 28,
    h: 14,
    north: false,
    color: "#2ec4b6",
    sign: { text: "GALLERY 44", color: "#ffffff" },
    style: "glass",
  },
  {
    x: 104,
    w: 40,
    h: 24,
    north: false,
    color: "#3a0ca3",
    sign: { text: "WAREHOUSE", color: "#4fe3ff" },
    style: "club",
  },
  { x: 156, w: 30, h: 16, north: false, color: "#f72585", style: "warehouse" },
  {
    x: -168,
    w: 32,
    h: 20,
    north: true,
    color: "#b5179e",
    sign: { text: "LOFT STUDIOS", color: "#ffe066" },
    style: "brick",
  },
  {
    x: -126,
    w: 26,
    h: 12,
    north: true,
    color: "#90be6d",
    sign: { text: "INK & NEEDLE", color: "#ff2f9a" },
    style: "storefront",
  },
  {
    x: -90,
    w: 22,
    h: 10,
    north: true,
    color: "#f9c74f",
    sign: { text: "ZINE SHOP", color: "#3fe0d0" },
    style: "storefront",
  },
  { x: -30, w: 30, h: 26, north: true, color: "#577590", style: "warehouse" },
  {
    x: 10,
    w: 26,
    h: 14,
    north: true,
    color: "#f94144",
    sign: { text: "PRINT HOUSE", color: "#ffffff" },
    style: "warehouse",
  },
  {
    x: 100,
    w: 30,
    h: 18,
    north: true,
    color: "#43aa8b",
    sign: { text: "CLAY & KILN", color: "#ffd166" },
    style: "brick",
  },
  {
    x: 150,
    w: 34,
    h: 14,
    north: true,
    color: "#ff70a6",
    sign: { text: "FLEA MARKET", color: "#ffe066" },
    style: "warehouse",
  },
];

const ARTS_BUILDINGS: readonly Building[] = ARTS_FRONT.map(
  (b, i): Building => ({
    id: `arts-${i}`,
    neighborhood: "arts-district",
    // Gallery Row's sidewalks end 10 m from its centreline
    footprint: b.north
      ? rect(b.x - b.w / 2, GALLERY_Z - 42, b.x + b.w / 2, GALLERY_Z - 12)
      : rect(b.x - b.w / 2, GALLERY_Z + 12, b.x + b.w / 2, GALLERY_Z + 52),
    height: b.h,
    style: b.style,
    color: b.color,
    sign: b.sign,
  }),
);

// Chinatown (west of its cross street) and Koreatown (east of it), both
// sides of the avenue: dim sum, hot pot, noodles, a tea house and a night
// market hall; KBBQ, a K-pop shop, a noraebang, fried chicken and a soju
// bar. Ids match the dialogue's "chinatown-koreatown" neighbourhood.
const ASIA_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  north: boolean;
  color: string;
  sign: { text: string; color: string };
  style: BuildingStyle;
}[] = [
  {
    x: 214,
    w: 24,
    h: 14,
    north: false,
    color: "#c1121f",
    sign: { text: "DIM SUM PALACE", color: "#ffd166" },
    style: "storefront",
  },
  {
    x: 242,
    w: 22,
    h: 18,
    north: false,
    color: "#9d0208",
    sign: { text: "HOT POT", color: "#ffe066" },
    style: "brick",
  },
  {
    x: 268,
    w: 20,
    h: 12,
    north: false,
    color: "#e85d04",
    sign: { text: "NOODLE BAR", color: "#ffffff" },
    style: "storefront",
  },
  {
    x: 296,
    w: 22,
    h: 10,
    north: false,
    color: "#d00000",
    sign: { text: "NIGHT MARKET", color: "#ffd166" },
    style: "warehouse",
  },
  {
    x: 344,
    w: 24,
    h: 16,
    north: false,
    color: "#7209b7",
    sign: { text: "K-BBQ HOUSE", color: "#4fe3ff" },
    style: "storefront",
  },
  {
    x: 372,
    w: 22,
    h: 20,
    north: false,
    color: "#f72585",
    sign: { text: "NORAEBANG", color: "#ffe066" },
    style: "club",
  },
  {
    x: 400,
    w: 24,
    h: 12,
    north: false,
    color: "#4361ee",
    sign: { text: "SOJU BAR", color: "#ff2f9a" },
    style: "storefront",
  },
  {
    x: 430,
    w: 22,
    h: 14,
    north: false,
    color: "#3a0ca3",
    sign: { text: "HANBOK", color: "#ffd6ff" },
    style: "storefront",
  },
  {
    x: 214,
    w: 24,
    h: 22,
    north: true,
    color: "#ae2012",
    sign: { text: "JADE TEA HOUSE", color: "#95d5b2" },
    style: "brick",
  },
  {
    x: 242,
    w: 22,
    h: 12,
    north: true,
    color: "#bb3e03",
    sign: { text: "BAKERY", color: "#ffe066" },
    style: "storefront",
  },
  {
    x: 268,
    w: 20,
    h: 16,
    north: true,
    color: "#9b2226",
    sign: { text: "HERBS & TEA", color: "#ffd166" },
    style: "storefront",
  },
  {
    x: 296,
    w: 22,
    h: 26,
    north: true,
    color: "#ca6702",
    sign: { text: "ASIAN MARKET", color: "#ffffff" },
    style: "tower",
  },
  {
    x: 344,
    w: 24,
    h: 14,
    north: true,
    color: "#b5179e",
    sign: { text: "K-POP STORE", color: "#4fe3ff" },
    style: "billboard",
  },
  {
    x: 372,
    w: 22,
    h: 12,
    north: true,
    color: "#560bad",
    sign: { text: "FRIED CHICKEN", color: "#ffd166" },
    style: "storefront",
  },
  {
    x: 400,
    w: 24,
    h: 18,
    north: true,
    color: "#480ca8",
    sign: { text: "SKIN CARE", color: "#ffc8dd" },
    style: "glass",
  },
  {
    x: 430,
    w: 22,
    h: 12,
    north: true,
    color: "#4895ef",
    sign: { text: "BINGSU", color: "#ffffff" },
    style: "storefront",
  },
];

const ASIA_BUILDINGS: readonly Building[] = ASIA_FRONT.map(
  (b, i): Building => ({
    id: `asia-${i}`,
    neighborhood: "chinatown-koreatown",
    footprint: b.north
      ? rect(b.x - b.w / 2, -38, b.x + b.w / 2, -14)
      : rect(b.x - b.w / 2, 14, b.x + b.w / 2, 38),
    height: b.h,
    style: b.style,
    color: b.color,
    sign: b.sign,
  }),
);

// Uptown, along Park Avenue: brownstones, wine bars, a patisserie, a
// bistro and a tasting-menu restaurant; the park on its north side.
const UPTOWN_FRONT: readonly {
  x: number;
  w: number;
  h: number;
  north: boolean;
  color: string;
  sign?: { text: string; color: string };
  style: BuildingStyle;
  /** The Aquarium's street door. */
  door?: true;
}[] = [
  {
    x: 214,
    w: 20,
    h: 16,
    north: false,
    color: "#8d5b4c",
    sign: { text: "WINE BAR", color: "#ffd6a5" },
    style: "brick",
  },
  {
    x: 238,
    w: 20,
    h: 18,
    north: false,
    color: "#1d4e89",
    sign: { text: "AQUARIUM", color: "#4fe3ff" },
    style: "glass",
    door: true,
  },
  {
    x: 262,
    w: 20,
    h: 16,
    north: false,
    color: "#7b4b3a",
    sign: { text: "PATISSERIE", color: "#ffc8dd" },
    style: "brick",
  },
  { x: 290, w: 22, h: 20, north: false, color: "#9c6644", style: "brick" },
  {
    x: 351,
    w: 22,
    h: 14,
    north: false,
    color: "#6d597a",
    sign: { text: "BISTRO", color: "#ffe066" },
    style: "storefront",
  },
  { x: 374, w: 22, h: 22, north: false, color: "#8e7dbe", style: "brick" },
  {
    x: 402,
    w: 24,
    h: 18,
    north: false,
    color: "#b56576",
    sign: { text: "TASTING ROOM", color: "#ffd6a5" },
    style: "glass",
  },
  { x: 430, w: 22, h: 26, north: false, color: "#5f0f40", style: "tower" },
  {
    x: 351,
    w: 22,
    h: 20,
    north: true,
    color: "#9a8c98",
    sign: { text: "BOOKSHOP", color: "#ffffff" },
    style: "brick",
  },
  { x: 374, w: 22, h: 16, north: true, color: "#c9ada7", style: "brick" },
  {
    x: 402,
    w: 24,
    h: 14,
    north: true,
    color: "#4a4e69",
    sign: { text: "JAZZ CLUB", color: "#4fe3ff" },
    style: "club",
  },
  {
    x: 430,
    w: 22,
    h: 24,
    north: true,
    color: "#22223b",
    sign: { text: "THE PLAZA HOTEL", color: "#ffd166" },
    style: "tower",
  },
];

const UPTOWN_BUILDINGS: readonly Building[] = UPTOWN_FRONT.map(
  (b, i): Building => ({
    id: b.door ? "aquarium" : `uptown-${i}`,
    neighborhood: "uptown",
    ...(b.door ? { door: AQUARIUM_CITY_DOOR } : {}),
    footprint: b.north
      ? rect(b.x - b.w / 2, GALLERY_Z - 42, b.x + b.w / 2, GALLERY_Z - 12)
      : rect(b.x - b.w / 2, GALLERY_Z + 12, b.x + b.w / 2, GALLERY_Z + 52),
    height: b.h,
    style: b.style,
    color: b.color,
    sign: b.sign,
  }),
);

const MANILA_BUILDINGS: readonly Building[] = MANILA_FRONT.map(
  (b, i): Building => ({
    id: `manila-${i}`,
    neighborhood: "little-manila",
    footprint: b.north
      ? rect(b.x - b.w / 2, -38, b.x + b.w / 2, -14)
      : rect(b.x - b.w / 2, 14, b.x + b.w / 2, 38),
    height: b.h,
    style: b.style,
    color: b.color,
    sign: b.sign,
  }),
);

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
    neighborhood: "fairground",
    footprint: rect(244, FAIR_FORECOURT_Z - 26, 268, FAIR_FORECOURT_Z),
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
    // The gate to the Speedway, along the Fairground forecourt.
    id: "speedway-gate",
    neighborhood: "fairground",
    footprint: rect(372, FAIR_FORECOURT_Z - 26, 396, FAIR_FORECOURT_Z),
    height: 14,
    style: "gate",
    sign: { text: "SPEEDWAY", color: "#ff4fb3" },
    door: SPEEDWAY_DOOR,
  },
  // The food venues: one storefront each, two of them with doors.
  ...FOOD_STOREFRONTS,
  ...BEACH_BUILDINGS,
  ...MANILA_BUILDINGS,
  ...ARTS_BUILDINGS,
  ...ASIA_BUILDINGS,
  ...UPTOWN_BUILDINGS,
  ...SUBURB_BUILDINGS,
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
      // Little Manila's street stops at the old city edge; the others run on
      // down to Shore Boulevard
      // the new districts' streets stop at the old city edge; Downtown's run
      // on to Gallery Row and Shore Boulevard
      const first = -240;
      const last = 240;
      for (let z = first; z <= last; z += 60) {
        if (Math.abs(z) < 11) continue;
        props.push({ kind: "tree", position: [x, z] });
      }
    }
  }
  // Arts District: lamps down both sides of Gallery Row
  for (let x = -180; x <= 180; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [GALLERY_Z - 8, GALLERY_Z + 8])
      props.push({ kind: "lamp", position: [x, z] });
  }
  // Suburbia: street trees down Maple Drive
  for (let x = WEST_EDGE + 10; x < -196; x += 24) {
    if (nearCross(x)) continue;
    for (const z of [GALLERY_Z - 7, GALLERY_Z + 7])
      props.push({ kind: "tree", position: [x, z] });
  }
  // Uptown: lamps down Park Avenue, trees over the park lawn
  for (let x = 204; x < EAST_EDGE - 6; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [GALLERY_Z - 8, GALLERY_Z + 8])
      props.push({ kind: "lamp", position: [x, z] });
  }
  for (let x = PARK.x0 + 8; x < PARK.x1 - 4; x += 16)
    for (let z = PARK.z0 + 8; z < PARK.z1 - 4; z += 14)
      if ((x + z) % 3 !== 0) props.push({ kind: "tree", position: [x, z] });
  // Chinatown and Koreatown: lamps down the avenue sidewalks
  for (let x = 204; x < EAST_EDGE - 6; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [-9, 9]) props.push({ kind: "lamp", position: [x, z] });
  }
  // Little Manila: lamps down the avenue sidewalks
  for (let x = WEST_EDGE + 12; x < -196; x += 30) {
    if (nearCross(x)) continue;
    for (const z of [-9, 9]) props.push({ kind: "lamp", position: [x, z] });
  }
  // Beachside: palms down both sides of Shore Boulevard, lamps along the
  // boardwalk's sea edge, and palms scattered over the sand
  for (let x = WEST_EDGE + 10; x <= EAST_EDGE - 10; x += 36) {
    if (nearCross(x)) continue;
    for (const z of [SHORE_Z - 9, SHORE_Z + 9])
      props.push({ kind: "palm", position: [x, z] });
  }
  for (let x = WEST_EDGE + 6; x <= EAST_EDGE - 6; x += 31)
    props.push({ kind: "lamp", position: [x, BOARDWALK.z1 - 0.6] });
  // lamps down both rails of the pier and round its head
  for (let z = WATER_Z + 6; z < PIER.end - 10; z += 10)
    for (const x of [PIER.x - PIER.half + 0.4, PIER.x + PIER.half - 0.4])
      props.push({ kind: "lamp", position: [x, z] });
  for (const x of [PIER.x - PIER.head + 0.5, PIER.x + PIER.head - 0.5])
    props.push({ kind: "lamp", position: [x, PIER.end - 0.6] });
  for (let i = 0; i < 20; i++) {
    // a fixed scatter, not random: the same beach every visit
    const x = WEST_EDGE + 20 + ((i * 113) % (EAST_EDGE - WEST_EDGE - 40));
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
