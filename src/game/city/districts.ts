// District lots: which finished building from Quaternius' Ultimate Textured
// Building Pack (CC0, public/models/districts/lots.glb, built by
// art/city/district_blocks.py) stands where along the faces of the blocks in
// Little Manila, Chinatown, Koreatown, the Arts District and Uptown. Each face
// is tiled with lots two to four storeys tall and a few meters wide, every
// lot picking its own model, palette and shop name from its district's look,
// so one 24 m wall reads as a row of different houses and each district has
// its own character: pastel shophouses with balconies, lacquer-red towers,
// soft candy fronts, rust-and-teal warehouses, limestone and slate. Downtown
// keeps the Downtown MegaKit bays (nyc.ts). Pure and seeded by the building,
// so a block looks the same on every load.
//
// The pack paints with a 32 px palette (4 by 4 swatches, one per role: wall,
// trim, roof, door, glass...) and every model keeps its UVs into it, so the
// client swaps palettes per lot (src/client/city/DistrictLots.tsx) and one
// model wears every district's colors.

import { hash, pick } from "./hash.ts";
import { ASIA_X, type Building } from "./layout.ts";
import { DISTRICT_NAMES, type District } from "./districtNames.ts";
import { facesOf, isNyc } from "./nyc.ts";

export { DISTRICT_NAMES, type District };

/** The models in lots.glb (node names). */
export const LOT_MODELS = [
  "gable2",
  "round2",
  "s2",
  "s2bal",
  "s2col",
  "s2wide",
  "s3bal",
  "s3slim",
  "s4",
  "s4center",
  "s6",
] as const;
export type LotModel = (typeof LOT_MODELS)[number];

/** Each model as built (art/city/district_blocks.py prints them): width in
 * meters, `roof` the parapet height at the front wall (the AC units and
 * chimneys stand above it), `tris` its triangles and `lo` the triangles of
 * its far twin (node name_lo). districts.test.ts checks them against the
 * shipped GLB. */
export const LOT_SPECS: Readonly<
  Record<LotModel, { w: number; roof: number; tris: number; lo: number }>
> = {
  gable2: { w: 5.6, roof: 8.07, tris: 399, lo: 193 },
  round2: { w: 5.47, roof: 7.52, tris: 278, lo: 105 },
  s2: { w: 5.6, roof: 6.77, tris: 549, lo: 194 },
  s2bal: { w: 5.6, roof: 7.32, tris: 699, lo: 350 },
  s2col: { w: 5.6, roof: 7.02, tris: 663, lo: 319 },
  s2wide: { w: 9.92, roof: 6.72, tris: 1131, lo: 506 },
  s3bal: { w: 5.6, roof: 10.58, tris: 1247, lo: 602 },
  s3slim: { w: 2.89, roof: 10.02, tris: 533, lo: 231 },
  s4: { w: 6.28, roof: 12.86, tris: 1244, lo: 526 },
  s4center: { w: 6.28, roof: 12.86, tris: 1206, lo: 495 },
  s6: { w: 5.6, roof: 19.89, tris: 921, lo: 492 },
};

/** Lots farther than this from the player draw their far twin (LOT_SPECS lo),
 * a third to half the triangles. The plan decides when it is cut, not the
 * camera: the twins are separate meshes, filled per plan reload. */
export const LOT_NEAR = 30;

/** The box behind a block's lots stands this far in from its footprint: the
 * pack sets its upper storeys back by up to half a meter (and the walls sit
 * 0.2 m in), and a box any nearer would hide them. */
export const LOT_WALL_INSET = 0.8;

/** The most lots of one model in any view; sizes each model's InstancedMesh. */
export const LOT_CAPACITY = 128;

/** The pack's 16 palette swatches by role (row-major from the top left of
 * its 4 by 4 grid; art/city/district_blocks.py PREVIEW shows where each
 * lands). The rest stay a neutral gray. */
export const SWATCH = {
  wall: 0,
  pipe: 1,
  trim: 2,
  roof: 3,
  sill: 4,
  door: 5,
  deck: 6,
  step: 7,
  gable: 8,
  base: 12,
  glass: 13,
} as const;
export const SWATCH_COUNT = 16;

/** One set of building colors (CSS hex). */
export type Palette = {
  wall: string;
  trim: string;
  /** Plinth, belt courses and AC units. */
  base: string;
  door: string;
  roof: string;
  /** The painted shop board over the door (light: the ink on it is dark). */
  sign: string;
};

const GLASS = "#5d7a92";
const PIPE = "#6b5a50";
const DECK = "#4a4744";
const NEUTRAL = "#8a8a8a";

/** The 16 swatch colors of a palette, in the pack's swatch order. */
export function swatchColors(p: Palette): string[] {
  const out = new Array<string>(SWATCH_COUNT).fill(NEUTRAL);
  out[SWATCH.wall] = p.wall;
  out[SWATCH.pipe] = PIPE;
  out[SWATCH.trim] = p.trim;
  out[SWATCH.roof] = p.roof;
  out[SWATCH.sill] = p.trim;
  out[SWATCH.door] = p.door;
  out[SWATCH.deck] = DECK;
  out[SWATCH.step] = p.base;
  out[SWATCH.gable] = p.roof;
  out[SWATCH.base] = p.base;
  out[SWATCH.glass] = GLASS;
  return out;
}

const pal = (
  wall: string,
  trim: string,
  base: string,
  door: string,
  roof: string,
  sign: string,
): Palette => ({ wall, trim, base, door, roof, sign });

/** A district's character: the models its lots pick from, the palettes, the
 * shop names, and how often a ground floor carries a painted board. */
export type Look = {
  models: readonly LotModel[];
  palettes: readonly Palette[];
  names: readonly string[];
  signChance: number;
};

export const LOOKS: Readonly<Record<District, Look>> = {
  // sun-faded pastel shophouses with balconies and gables
  "little-manila": {
    models: [
      "gable2",
      "round2",
      "s2",
      "s2bal",
      "s2col",
      "s3bal",
      "s2wide",
      "s4",
      "s6",
    ],
    palettes: [
      pal("#9fd3b8", "#fff6e0", "#5f9c88", "#2f6fb0", "#b4553a", "#ffe9a8"),
      pal("#f2c25e", "#fff4d6", "#c79a3a", "#1f7a5c", "#b4553a", "#fff0c8"),
      pal("#f0a4b0", "#fff0ee", "#c4707e", "#2b8a9e", "#8a4a3a", "#ffe0e6"),
      pal("#97c8e6", "#fffaf0", "#5f8fb0", "#d9533f", "#b4553a", "#e6f4ff"),
      pal("#c9aee0", "#fff7ff", "#8e6fb0", "#e8a33a", "#7a4a5a", "#f0e6ff"),
      pal("#f08c6c", "#fff0e0", "#b85a40", "#2a6f97", "#8a4a3a", "#ffe8d0"),
    ],
    names: DISTRICT_NAMES["little-manila"],
    signChance: 0.7,
  },
  // lacquer red, jade and lantern gold, tall and narrow
  chinatown: {
    models: ["s3bal", "s3slim", "s4", "s4center", "s6", "s2wide", "s2bal"],
    palettes: [
      pal("#b83a30", "#e8c060", "#7a2a24", "#2f6a5a", "#3a4a44", "#f0c850"),
      pal("#4f9078", "#f0d890", "#2f5f4e", "#a8322a", "#3a4a44", "#f4e4a0"),
      pal("#d6a845", "#fff0c8", "#8f6a28", "#a8322a", "#4a3a2a", "#fff0c8"),
      pal("#2f6e72", "#e8c97a", "#1f4a4e", "#b83a30", "#3a4a44", "#f0d890"),
      pal("#e8d8b2", "#b83a30", "#a08a60", "#2f6a5a", "#4a3a2a", "#f4d8a0"),
      pal("#7a3a5a", "#e8c060", "#4a2238", "#2f6a5a", "#3a3a44", "#f0c850"),
    ],
    names: DISTRICT_NAMES.chinatown,
    signChance: 0.8,
  },
  // soft candy fronts, pink and mint, beauty shops and karaoke
  koreatown: {
    models: ["s4", "s4center", "s3slim", "s6", "s3bal", "s2wide", "s2"],
    palettes: [
      pal("#f1d9d6", "#ffffff", "#b7898a", "#4a6fa5", "#6a6a74", "#ffd0dc"),
      pal("#bfe0d2", "#ffffff", "#6f9f8f", "#e86a8a", "#6a6a74", "#d0f4e6"),
      pal("#7aa6d6", "#f4f8ff", "#4a76a6", "#f3d27a", "#5a6a7a", "#d8ecff"),
      pal("#f3e2a0", "#fffbe8", "#c9b060", "#4a6fa5", "#7a6a50", "#fff0b0"),
      pal("#cdbfe6", "#ffffff", "#8e7fb0", "#f0a0b0", "#6a6a74", "#eadcff"),
      pal("#59606b", "#f0a0b0", "#363c46", "#f0a0b0", "#363c46", "#ffc0d0"),
    ],
    names: DISTRICT_NAMES.koreatown,
    signChance: 0.8,
  },
  // rust brick, charcoal, mustard and teal warehouses and studios
  "arts-district": {
    models: ["s2wide", "round2", "s4", "s3slim", "s2", "s6", "gable2"],
    palettes: [
      pal("#a2543a", "#e8e0d0", "#4a403a", "#3fb0a8", "#3a3a3a", "#e0f4f0"),
      pal("#4a4f58", "#f2c230", "#2f3238", "#e8567a", "#2a2a2e", "#ffe27a"),
      pal("#d0a02c", "#2f3238", "#6a5320", "#2f3238", "#3a3a3a", "#ffe27a"),
      pal("#2f8a8a", "#f4ecd8", "#1f5a5a", "#f08a3a", "#3a3a3a", "#ffd9a8"),
      pal("#6a3f6e", "#f4d03f", "#3f2a45", "#5ad0b0", "#2a2a2e", "#ffe27a"),
      pal("#a8a8a2", "#e8567a", "#6a6a66", "#2f8ab0", "#4a4a4a", "#ffc0d0"),
    ],
    names: DISTRICT_NAMES["arts-district"],
    signChance: 0.6,
  },
  // limestone, slate and brownstone, formal and tall
  uptown: {
    models: ["s4", "s4center", "s6", "s2col", "s2bal", "s2wide"],
    palettes: [
      pal("#e3d7bd", "#fffaf0", "#a39478", "#27415f", "#4a4a52", "#f8f0dc"),
      pal("#6f7f95", "#e8e0d0", "#3f4a5a", "#8a2f3a", "#363c46", "#f4ecd8"),
      pal("#a9b99a", "#f6f1e2", "#6a7a5a", "#2f3f5f", "#4a5048", "#f0f4e0"),
      pal("#8a5f4a", "#e8dcc4", "#5a3a2c", "#1f3a2f", "#3a2f2a", "#f4e8d0"),
      pal("#35506f", "#e8dcc4", "#22344a", "#b08a3a", "#2a3444", "#f0e0b0"),
      pal("#efe3c8", "#c9b79a", "#8f7e5e", "#6f2f3a", "#4a4a52", "#f8ecd0"),
    ],
    names: DISTRICT_NAMES.uptown,
    signChance: 0.5,
  },
};

const DISTRICT_ORDER: readonly District[] = [
  "little-manila",
  "chinatown",
  "koreatown",
  "arts-district",
  "uptown",
];

/** Every palette of every district, flat: a lot's `palette` indexes this. */
export const PALETTES: readonly Palette[] = DISTRICT_ORDER.flatMap(
  (d) => LOOKS[d].palettes,
);

/** The district a block belongs to, or null for Downtown and the rest. Chinatown
 * and Koreatown share a neighborhood in the plan; the hub road at ASIA_X
 * divides them. */
export function districtOf(b: Building): District | null {
  switch (b.neighborhood) {
    case "little-manila":
      return "little-manila";
    case "arts-district":
      return "arts-district";
    case "uptown":
      return "uptown";
    case "chinatown-koreatown": {
      const xs = b.footprint.map(([x]) => x);
      return (Math.min(...xs) + Math.max(...xs)) / 2 < ASIA_X
        ? "chinatown"
        : "koreatown";
    }
    default:
      return null;
  }
}

/** Whether a building is dressed in district lots when it is near. */
export const isLotBlock = (b: Building): boolean =>
  isNyc(b) && districtOf(b) !== null;

/** One lot placed in the world: `yaw` turns its +z front to face out. */
export type LotInstance = {
  model: LotModel;
  x: number;
  z: number;
  yaw: number;
  /** Width stretch (also depth) and height stretch, around 1. */
  sx: number;
  sy: number;
  /** Index into PALETTES. */
  palette: number;
  /** On a back wall rather than a street face (drawn only when close). */
  back: boolean;
  /** A made-up shop name painted over the door, when the lot carries one. */
  sign: string | null;
};

/** The widest and narrowest a lot is stretched along its face. */
const STRETCH = { min: 0.78, max: 1.3 } as const;
/** The tallest and shortest a lot is stretched to meet its building's roof. */
const RISE = { min: 0.78, max: 1.34 } as const;
/** x-faces stand this far proud of z-faces, so their walls win where the two
 * meet at a corner instead of fighting over the same plane. */
const CORNER_LIFT = 0.03;

/** Models for a roof `height` meters up: those within RISE of it, else the
 * one nearest (a district's pool never comes up empty). */
export function modelsFor(look: Look, height: number): readonly LotModel[] {
  const fits = look.models.filter((m) => {
    const r = height / LOT_SPECS[m].roof;
    return r >= RISE.min && r <= RISE.max;
  });
  if (fits.length > 0) return fits;
  const gap = (m: LotModel) => Math.abs(Math.log(height / LOT_SPECS[m].roof));
  const nearest = look.models.reduce((a, c) => (gap(c) < gap(a) ? c : a));
  return [nearest];
}

/** Lots that tile a face `length` meters long from `pool`, left to right:
 * random models until they fill it, stretched to meet both ends (seeded by
 * `r`), or the narrowest repeated when nothing fits. */
export function tileFace(
  length: number,
  pool: readonly LotModel[],
  r: (k: number) => number,
): { model: LotModel; sx: number }[] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const picked: LotModel[] = [];
    let sum = 0;
    // add models until the row, stretched as far as allowed, spans the face
    while (picked.length < 12 && sum * STRETCH.max < length) {
      const model = pick(pool, r(attempt * 40 + picked.length));
      // one that would not fit even squeezed ends the row (and the attempt fails)
      if (picked.length > 0 && sum + LOT_SPECS[model].w * STRETCH.min > length)
        break;
      picked.push(model);
      sum += LOT_SPECS[model].w;
    }
    const sx = length / sum;
    if (picked.length > 0 && sx >= STRETCH.min && sx <= STRETCH.max)
      return picked.map((model) => ({ model, sx }));
  }
  const narrow = pool.reduce((a, c) =>
    LOT_SPECS[c].w < LOT_SPECS[a].w ? c : a,
  );
  const n = Math.max(1, Math.round(length / LOT_SPECS[narrow].w));
  return Array.from({ length: n }, () => ({
    model: narrow,
    sx: length / (n * LOT_SPECS[narrow].w),
  }));
}

/** The lots that dress one block: every face tiled, each lot as tall as the
 * block's roof. A block with no street to face (inside a lot) keeps its plain
 * walls, as with the New York bays. */
export function lotRow(b: Building): LotInstance[] {
  const district = districtOf(b);
  if (!district) return [];
  const faces = facesOf(b);
  if (!faces.some((f) => f.street)) return [];
  const look = LOOKS[district];
  const base = DISTRICT_ORDER.slice(0, DISTRICT_ORDER.indexOf(district)).reduce(
    (n, d) => n + LOOKS[d].palettes.length,
    0,
  );
  const seed = hash(b.footprint[0][0], b.footprint[0][1], 23);
  const pool = modelsFor(look, b.height);
  const out: LotInstance[] = [];
  let last = -1;
  faces.forEach((face, fi) => {
    const r = (k: number) => hash(seed, fi, k);
    let along = 0;
    tileFace(face.length, pool, r).forEach(({ model, sx }, i) => {
      const w = LOT_SPECS[model].w * sx;
      const at = along + w / 2;
      along += w;
      // a palette other than the last lot's, so neighbors differ
      let p = Math.floor(r(500 + i) * look.palettes.length);
      if (p === last)
        p = (p + 1 + Math.floor(r(600 + i) * 4)) % look.palettes.length;
      last = p;
      const lift = face.yaw % Math.PI === 0 ? 0 : CORNER_LIFT;
      out.push({
        model,
        x: face.ox + face.dx * at + face.nx * lift,
        z: face.oz + face.dz * at + face.nz * lift,
        yaw: face.yaw,
        sx,
        sy: b.height / LOT_SPECS[model].roof,
        palette: base + p,
        back: !face.street,
        sign:
          face.street && r(700 + i) < look.signChance
            ? pick(look.names, r(800 + i))
            : null,
      });
    });
  });
  return out;
}

/** A lot as the plan hands it to the client: `far` picks the far twin. */
export type PlacedLot = LotInstance & { far: boolean };
