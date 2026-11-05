// Beachside's boardwalk, laid out like Ocean City's: a row of pastel
// storefronts (fries, taffy, pizza, ice cream, an arcade, T-shirts) along the
// landward edge, a wide plank deck in front with benches, lamps and a rail on
// its sea edge, a dune line with fences and grass beyond, sunbathers' umbrellas
// and lounge chairs on the sand, lifeguard stands, a carousel and a Ferris
// wheel at the Fairground end. Pure and deterministic. layout.ts takes the
// shops and blockers from here; the street dressing takes the furniture
// (models in public/models/beach/, built by art/street/build_street.py).
import type { Vec2 } from "../walk.ts";
import { hash } from "./hash.ts";
import type { FurnitureSpot } from "./furniture.ts";

/** The deck, shops included: z0 is the sidewalk's edge, z1 the sand's. */
export const DECK = { z0: 267, z1: 291 };
/** The storefronts' south wall; the open deck is SHOP_Z1 to DECK.z1. */
export const SHOP_Z1 = 276;
/** The storefronts and deck furniture run this far either way from x = 0, nearly the whole deck (it ends at +-448). */
const SHOP_EDGE = 430;
/** Ground level of deck and sand: things stand on top of this. */
const GROUND = 0.14;

export type Shop = {
  x: number;
  w: number;
  h: number;
  color: string;
  sign: { text: string; color: string };
};

const SHOP_KINDS: readonly {
  text: string;
  color: string;
  sign: string;
  h: number;
}[] = [
  { text: "SALT AND VINEGAR FRIES", color: "#ffe9a8", sign: "#ff7a3d", h: 7 },
  { text: "SALTWATER TAFFY", color: "#ffb8d0", sign: "#ff4fb3", h: 8 },
  { text: "SLICE OF HEAVEN PIZZA", color: "#ffd1a6", sign: "#ff5f4f", h: 7 },
  { text: "SCOOP DECK ICE CREAM", color: "#bfe8ff", sign: "#4fb8ff", h: 9 },
  { text: "PIER ARCADE", color: "#e0c8ff", sign: "#b06bff", h: 8 },
  { text: "SHORE TEES", color: "#c8f2c2", sign: "#3fcf7a", h: 7 },
  { text: "FUNNEL CAKE SHACK", color: "#fff3a8", sign: "#ffb02e", h: 7 },
  { text: "LEMON SHAKE UPS", color: "#fff8b8", sign: "#e6d400", h: 7 },
  { text: "KITES AND SUN HATS", color: "#a8f0e4", sign: "#2fd0c0", h: 8 },
  { text: "CUSTARD CORNER", color: "#ffc8c8", sign: "#ff6f8f", h: 7 },
];

/**
 * The storefronts: 14 m wide, 17 m apart, one row along the whole deck, skipping the
 * cross streets (they run down to the boardwalk) and the pier's approach.
 */
export function boardwalkShops(blocked: (x: number) => boolean): Shop[] {
  const out: Shop[] = [];
  let i = 0;
  for (let x = -(SHOP_EDGE - 3); x <= SHOP_EDGE - 3; x += 17) {
    if (blocked(x) || blocked(x - 7) || blocked(x + 7)) continue;
    const kind = SHOP_KINDS[i % SHOP_KINDS.length];
    i += 1;
    if (!kind) continue;
    out.push({
      x,
      w: 14,
      h: kind.h,
      color: kind.color,
      sign: { text: kind.text, color: kind.sign },
    });
  }
  return out;
}

/**
 * The deck under the gaps between storefronts (and at the cross streets), so
 * people can walk from Shore Boulevard's sidewalk down to the open deck.
 */
export function deckGaps(
  shops: readonly Shop[],
  west: number,
  east: number,
): { x0: number; x1: number }[] {
  const out: { x0: number; x1: number }[] = [];
  let at = west;
  for (const s of [...shops].sort((a, b) => a.x - b.x)) {
    if (s.x - s.w / 2 > at) out.push({ x0: at, x1: s.x - s.w / 2 });
    at = s.x + s.w / 2;
  }
  if (east > at) out.push({ x0: at, x1: east });
  return out;
}

/** The Ferris wheel (animated: FerrisWheel.tsx) and the carousel, both on the sand at the Fairground end, off the deck the parade and the strollers use. */
export const FERRIS = { x: 338, z: 301 };
export const CAROUSEL = { x: 296, z: 300, r: 4.5 };

const octagon = (cx: number, cz: number, r: number): Vec2[] =>
  Array.from({ length: 8 }, (_, i): Vec2 => {
    const a = (i / 8) * Math.PI * 2;
    return [cx + Math.sin(a) * r, cz + Math.cos(a) * r];
  });

const box = (cx: number, cz: number, hx: number, hz: number): Vec2[] => [
  [cx - hx, cz - hz],
  [cx + hx, cz - hz],
  [cx + hx, cz + hz],
  [cx - hx, cz + hz],
];

/** What stops the walk: the carousel and the Ferris wheel's base. */
export const BOARDWALK_BLOCKERS: readonly (readonly Vec2[])[] = [
  octagon(CAROUSEL.x, CAROUSEL.z, CAROUSEL.r),
  box(FERRIS.x, FERRIS.z, 5, 1.5),
];

const spot = (
  kind: FurnitureSpot["kind"],
  x: number,
  z: number,
  yaw = 0,
  scale = 1,
  y: number = GROUND,
): FurnitureSpot => ({ kind, x, z, yaw, scale, y });

/**
 * The boardwalk's furniture. `skip` says where something must not stand (the
 * bonfires, the volleyball net, the pier's approach); `shops` are the
 * storefronts, for the ice cream cone on its roof.
 */
export function boardwalkFurniture(
  shops: readonly Shop[],
  skip: (x: number, z: number) => boolean,
): FurnitureSpot[] {
  const out: FurnitureSpot[] = [];
  // the rail along the deck's sea edge, with a gap every 51 m for the beach
  for (let x = -SHOP_EDGE; x <= SHOP_EDGE; x += 3) {
    if (Math.abs(((x + SHOP_EDGE) % 51) - 25) < 4.5 || skip(x, DECK.z1 - 0.2))
      continue;
    // 1.4x, so the rail is thick enough to read from 100 m
    out.push(spot("rail", x, DECK.z1 - 0.2, 0, 1.4));
  }
  // benches facing the sea, in front of the shops' south wall and by the rail
  for (let x = -SHOP_EDGE + 6; x <= SHOP_EDGE - 6; x += 24) {
    if (skip(x, DECK.z1 - 2)) continue;
    out.push(spot("bench", x + 6, DECK.z1 - 2.2, 0));
    out.push(spot("bench", x + 18, SHOP_Z1 + 1.2, 0));
    // a trash can at the end of each row of benches
    out.push(spot("trashcan", x + 12, DECK.z1 - 1.6, 0));
    out.push(spot("trashcan", x + 24, SHOP_Z1 + 0.8, 0));
  }
  // food carts on the deck
  for (let i = 0, x = -SHOP_EDGE + 40; x <= SHOP_EDGE - 40; x += 70, i++)
    // on the sea side of the deck, clear of the lane down its middle
    if (!skip(x, DECK.z1 - 4))
      out.push(
        spot(i % 2 ? "hotdog-cart" : "popcorn-cart", x, DECK.z1 - 4, Math.PI),
      );
  // an ice cream cone on the roof of the ice cream shop
  for (const s of shops)
    if (s.sign.text.includes("ICE CREAM"))
      out.push(spot("cone", s.x, DECK.z0 + 4.5, 0, 1, GROUND + s.h));
  // the fairground end
  out.push(spot("carousel", CAROUSEL.x, CAROUSEL.z));
  // lifeguard stands facing the water
  for (const x of [-400, -250, -120, 160, 280, 400])
    out.push(spot("lifeguard", x, 303, 0));
  // dune fences along the line between the deck and the beach
  for (let x = -SHOP_EDGE; x <= SHOP_EDGE; x += 3) {
    if (skip(x, DECK.z1 + 3) || hash(x, 8) < 0.35) continue;
    out.push(spot("rail", x, DECK.z1 + 3, 0));
  }
  // sunbathers: an umbrella over two lounge chairs and a towel, every 22 m
  for (let i = 0, x = -SHOP_EDGE; x <= SHOP_EDGE; x += 22, i++) {
    const z = 300 + hash(x, 9) * 8;
    if (skip(x, z) || skip(x, z + 3)) continue;
    out.push(spot(i % 2 ? "umbrella-red" : "umbrella-blue", x, z));
    out.push(spot("chaise", x - 1.1, z + 1.4, Math.PI, 1));
    out.push(spot("chaise", x + 1.1, z + 1.6, Math.PI, 1));
    out.push(
      spot("towel", x + 2.8, z + 0.4, hash(x, 10) * 3, 1, GROUND + 0.02),
    );
    if (hash(x, 11) < 0.35)
      out.push(spot("sandcastle", x - 3, z + 2.5, hash(x, 12) * 6));
  }
  return out;
}

/** The lane down the middle of the open deck: the parade rolls along it and strollers walk beside it. */
export const DECK_LANE_Z = (SHOP_Z1 + DECK.z1) / 2;
