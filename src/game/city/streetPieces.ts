// The street dressing: where the Downtown City MegaKit's street pieces go
// (public/models/street/kit.glb, art/city/street_kit.py). Pure placement math
// beside the layout, drawn by src/client/city/StreetPieces.tsx.
//
// The road graph makes a grid: every sidewalk is a 4 m strip beside its own
// road edge, so at a crossing the avenue's sidewalk would run straight over
// the cross street and the cross street's over the avenue. The drawn
// sidewalks are cut back instead (`sidewalkPieces`): roads win where they
// cross, and each of the four (or two, at a T) corners where two sidewalks
// met becomes a corner block, a model with a rounded kerb. Crosswalks go
// where the old slabs were, in line with the sidewalks they join; stop and
// slow words wait on the cross streets, double yellow lines run down the
// wide roads, and manholes, storm drains and bollards fill in the rest.
import { cellAt, type Cell } from "./cells.ts";
import { CITY_SURFACES, SHORE_Z, SIDEWALK, type Surface } from "./layout.ts";

export type Box = { x0: number; z0: number; x1: number; z1: number };

/** Flat paint, drawn from the kit's decal atlas. */
export const DECAL_KINDS = [
  "crosswalk",
  "stop",
  "slow",
  "doubleYellow",
] as const;
/** Small solid models, drawn in the sidewalk's concrete. */
export const SOLID_KINDS = ["corner", "manhole", "drain", "bollard"] as const;
export const STREET_KINDS = [...DECAL_KINDS, ...SOLID_KINDS] as const;
export type StreetKind = (typeof STREET_KINDS)[number];

/** Triangles of each piece in the shipped kit.glb (a test checks them). */
export const STREET_TRIANGLES: Readonly<Record<StreetKind, number>> = {
  crosswalk: 4,
  stop: 2,
  slow: 2,
  doubleYellow: 2,
  corner: 97,
  manhole: 34,
  drain: 10,
  bollard: 56,
};

/** Draw calls the street pieces cost: one merged mesh of paint, one of solids. */
export const STREET_DRAW_CALLS = 2;

/** A piece in the world: `yaw` about y, `sx` and `sz` stretch it along its own x and z. */
export type StreetPiece = {
  kind: StreetKind;
  x: number;
  z: number;
  yaw: number;
  sx: number;
  sz: number;
};

/** The crosswalk model is 4.66 m long (with traffic) by 11.42 m wide. */
const CROSSWALK_ACROSS = 11.42;
/** Shortened to fit the 4 m sidewalk strips it joins. */
const CROSSWALK_LENGTH = 0.8;
/** Paint stays this far inside the kerbs. */
const CROSSWALK_MARGIN = 1;
/** Half the crosswalk's length with traffic, and the room a stop word needs. */
const CROSSWALK_REACH = (4.66 * CROSSWALK_LENGTH) / 2;
const WORD_DEPTH = 1.6;
/** Wide roads (two lanes each way) get a double yellow line. */
export const WIDE_ROAD = 12;
/** A double yellow segment's length; they run end to end. */
const LINE = 6;
/** How far a line stops short of a crossing road's edge. */
const LINE_GAP = SIDEWALK + 4;
/** How far from the road's edge a storm drain sits, along the kerb. */
const DRAIN_REACH = SIDEWALK + 2.5;
/** Roads shorter than this past a crossing get no drain or word there. */
const ARM_MIN = 8;
/** Manholes: spacing, and the clearance from crossing roads. */
const MANHOLE_EVERY = 30;
const MANHOLE_CLEAR = 4;

function boundsOf(poly: readonly (readonly [number, number])[]): Box {
  const xs = poly.map(([x]) => x);
  const zs = poly.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    z0: Math.min(...zs),
    x1: Math.max(...xs),
    z1: Math.max(...zs),
  };
}

const surfaces = (kind: Surface["kind"]) =>
  CITY_SURFACES.filter((s) => s.kind === kind).map((s) => boundsOf(s.polygon));

const SIDEWALKS: readonly Box[] = surfaces("sidewalk");
const horizontal = (b: Box) => b.x1 - b.x0 >= b.z1 - b.z0;

/** Road edges that meet end to end along one band, as the one road they make. */
function joined(edges: readonly Box[], along: "x" | "z"): Box[] {
  const lo = along === "x" ? "x0" : "z0";
  const hi = along === "x" ? "x1" : "z1";
  const band = (b: Box) =>
    along === "x" ? `${b.z0}|${b.z1}` : `${b.x0}|${b.x1}`;
  const roads: Box[] = [];
  const last = new Map<string, Box>();
  for (const edge of [...edges].sort((a, b) => a[lo] - b[lo])) {
    const prev = last.get(band(edge));
    if (prev && edge[lo] <= prev[hi] + 1e-6)
      prev[hi] = Math.max(prev[hi], edge[hi]);
    else {
      const road = { ...edge };
      roads.push(road);
      last.set(band(edge), road);
    }
  }
  return roads;
}

const EDGES = surfaces("road");
const HORIZONTAL = joined(EDGES.filter(horizontal), "x");
const VERTICAL = joined(
  EDGES.filter((r) => !horizontal(r)),
  "z",
);
const ROADS: readonly Box[] = [...HORIZONTAL, ...VERTICAL];

export const roadBoxes = (): readonly Box[] => ROADS;

function overlap(a: Box, b: Box): Box | null {
  const box = {
    x0: Math.max(a.x0, b.x0),
    z0: Math.max(a.z0, b.z0),
    x1: Math.min(a.x1, b.x1),
    z1: Math.min(a.z1, b.z1),
  };
  return box.x1 - box.x0 > 1e-6 && box.z1 - box.z0 > 1e-6 ? box : null;
}

/** `box` with `cut` taken out of it: up to four boxes. */
function subtract(box: Box, cut: Box): Box[] {
  const hit = overlap(box, cut);
  if (!hit) return [box];
  const out: Box[] = [];
  if (hit.x0 > box.x0) out.push({ ...box, x1: hit.x0 });
  if (hit.x1 < box.x1) out.push({ ...box, x0: hit.x1 });
  const strip = { x0: hit.x0, x1: hit.x1 };
  if (hit.z0 > box.z0) out.push({ ...strip, z0: box.z0, z1: hit.z0 });
  if (hit.z1 < box.z1) out.push({ ...strip, z0: hit.z1, z1: box.z1 });
  return out;
}

/** A sidewalk square at a crossing, beside two roads. `sx` and `sz` say
 * which way from the crossing's center it lies. */
export type CornerBlock = Box & { sx: -1 | 1; sz: -1 | 1; h: Box; v: Box };

const SIGNS = [-1, 1] as const;

function findCornerBlocks(): CornerBlock[] {
  const blocks: CornerBlock[] = [];
  for (const h of HORIZONTAL)
    for (const v of VERTICAL) {
      if (!overlap(h, v)) continue;
      for (const sx of SIGNS)
        for (const sz of SIGNS) {
          // both roads must carry on past the block, or there is no corner
          const hReaches =
            sx > 0 ? h.x1 >= v.x1 + SIDEWALK : h.x0 <= v.x0 - SIDEWALK;
          const vReaches =
            sz > 0 ? v.z1 >= h.z1 + SIDEWALK : v.z0 <= h.z0 - SIDEWALK;
          if (!hReaches || !vReaches) continue;
          blocks.push({
            x0: sx > 0 ? v.x1 : v.x0 - SIDEWALK,
            x1: sx > 0 ? v.x1 + SIDEWALK : v.x0,
            z0: sz > 0 ? h.z1 : h.z0 - SIDEWALK,
            z1: sz > 0 ? h.z1 + SIDEWALK : h.z0,
            sx,
            sz,
            h,
            v,
          });
        }
    }
  return blocks;
}

const BLOCKS: readonly CornerBlock[] = findCornerBlocks();

export const cornerBlocks = (): readonly CornerBlock[] => BLOCKS;

/**
 * The paved sidewalks as drawn: each strip with the crossing roads and the
 * corner blocks taken out. `cut: false` is the strips as the layout has them.
 */
export function sidewalkPieces({ cut = true } = {}): Box[] {
  if (!cut) return [...SIDEWALKS];
  const cutters: readonly Box[] = [...ROADS, ...BLOCKS];
  return SIDEWALKS.flatMap((strip) =>
    cutters.reduce<Box[]>(
      (parts, c) => parts.flatMap((p) => subtract(p, c)),
      [strip],
    ),
  );
}

/**
 * The yaw that turns the corner model's rounded kerb (its -x, +z corner)
 * toward the crossing, which lies at (`ex`, `ez`) from the block's center.
 * three.js turns (x, z) about y as (x cos + z sin, -x sin + z cos).
 */
export function cornerYaw(ex: number, ez: number): number {
  if (ex < 0) return ez > 0 ? 0 : (3 * Math.PI) / 2;
  return ez > 0 ? Math.PI / 2 : Math.PI;
}

/**
 * Every street piece in the given cells. The decal models read for a driver
 * heading -z, so `yaw` is the heading's turn from that.
 */
export function streetPieces(cells: readonly Cell[]): StreetPiece[] {
  const keys = new Set(cells.map((c) => c.key));
  const out: StreetPiece[] = [];
  const add = (
    kind: StreetKind,
    x: number,
    z: number,
    yaw = 0,
    sx = 1,
    sz = 1,
  ) => {
    if (keys.has(cellAt([x, z]).key)) out.push({ kind, x, z, yaw, sx, sz });
  };
  const centerX = (b: Box) => (b.x0 + b.x1) / 2;
  const centerZ = (b: Box) => (b.z0 + b.z1) / 2;
  const crosswalk = (x: number, z: number, yaw: number, across: number) =>
    add(
      "crosswalk",
      x,
      z,
      yaw,
      CROSSWALK_LENGTH,
      (across - CROSSWALK_MARGIN) / CROSSWALK_ACROSS,
    );

  for (const b of BLOCKS) {
    const { h, v, sx, sz } = b;
    // the block's corner on the crossing, and where the kerbs run from it
    const cx = sx > 0 ? v.x1 : v.x0;
    const cz = sz > 0 ? h.z1 : h.z0;
    add("corner", centerX(b), centerZ(b), cornerYaw(-sx, -sz));
    // two bollards flank the crossing's landing on each kerb
    add("bollard", cx + sx * 0.45, cz + sz * 3);
    add("bollard", cx + sx * 3, cz + sz * 0.45);
    // storm drains in the road, along the kerbs past the crosswalk
    if ((sz > 0 ? v.z1 - h.z1 : h.z0 - v.z0) >= ARM_MIN)
      add("drain", cx - sx * 0.35, cz + sz * DRAIN_REACH, Math.PI / 2);
    if ((sx > 0 ? h.x1 - v.x1 : v.x0 - h.x0) >= ARM_MIN)
      add("drain", cx + sx * DRAIN_REACH, cz - sz * 0.35);
  }

  const has = (v: Box, h: Box, sx: -1 | 1, sz: -1 | 1) =>
    BLOCKS.some((b) => b.v === v && b.h === h && b.sx === sx && b.sz === sz);
  for (const h of HORIZONTAL)
    for (const v of VERTICAL) {
      if (!overlap(h, v)) continue;
      // across the avenue, in line with each cross-street sidewalk; at a T
      // the stem's side has a block and the far side is the avenue's own
      // sidewalk (Shore Boulevard's crossings lead on to the boardwalk)
      for (const sx of SIGNS)
        if (has(v, h, sx, -1) || has(v, h, sx, 1))
          crosswalk(
            sx > 0 ? v.x1 + SIDEWALK / 2 : v.x0 - SIDEWALK / 2,
            centerZ(h),
            0,
            h.z1 - h.z0,
          );
      // across the cross street, in line with each avenue sidewalk
      for (const sz of SIGNS) {
        if (!(has(v, h, -1, sz) && has(v, h, 1, sz))) continue;
        const z = sz > 0 ? h.z1 + SIDEWALK / 2 : h.z0 - SIDEWALK / 2;
        crosswalk(centerX(v), z, Math.PI / 2, v.x1 - v.x0);
        // the word waits in the approaching lane, past the crosswalk; Shore
        // Boulevard's crossings, where the boardwalk crowds spill over, say SLOW
        const arm = sz > 0 ? v.z1 - h.z1 : h.z0 - v.z0;
        if (arm < ARM_MIN + SIDEWALK) continue;
        const slow = Math.abs(centerZ(h) - SHORE_Z) < 1e-6;
        add(
          slow ? "slow" : "stop",
          centerX(v) + sz * 2.5,
          z + sz * (CROSSWALK_REACH + 0.6 + WORD_DEPTH / 2),
          sz > 0 ? 0 : Math.PI,
        );
      }
    }

  // double yellow down the wide roads, clear of the crossings
  for (const road of ROADS) {
    if (Math.min(road.x1 - road.x0, road.z1 - road.z0) < WIDE_ROAD) continue;
    const along = horizontal(road);
    const from = along ? road.x0 : road.z0;
    const to = along ? road.x1 : road.z1;
    const crossing = (along ? VERTICAL : HORIZONTAL).filter((c) =>
      overlap(road, c),
    );
    for (let at = from + LINE / 2; at < to - LINE / 2 + 1e-6; at += LINE) {
      const lo = at - LINE / 2;
      const hi = at + LINE / 2;
      const blocked = crossing.some((c) =>
        along
          ? hi > c.x0 - LINE_GAP && lo < c.x1 + LINE_GAP
          : hi > c.z0 - LINE_GAP && lo < c.z1 + LINE_GAP,
      );
      if (blocked) continue;
      if (along) add("doubleYellow", at, centerZ(road));
      else add("doubleYellow", centerX(road), at, Math.PI / 2);
    }
  }

  // manholes along every road, clear of the crossings
  for (const road of ROADS) {
    const along = horizontal(road);
    const from = along ? road.x0 : road.z0;
    const to = along ? road.x1 : road.z1;
    for (let at = from + 12; at < to - 6; at += MANHOLE_EVERY) {
      const x = along ? at : centerX(road) + 2.2;
      const z = along ? centerZ(road) + 2.2 : at;
      const clear = ROADS.every(
        (o) =>
          o === road ||
          x < o.x0 - MANHOLE_CLEAR ||
          x > o.x1 + MANHOLE_CLEAR ||
          z < o.z0 - MANHOLE_CLEAR ||
          z > o.z1 + MANHOLE_CLEAR,
      );
      if (clear) add("manhole", x, z);
    }
  }
  return out;
}
