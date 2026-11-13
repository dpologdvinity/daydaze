// All the city's undergrowth for CityPark.tsx to draw near the player: the
// park's lawns and beds (park.ts), Suburbia's front lawns, the rings of grass
// round street trees (the tree pits on Park Avenue and the cross streets),
// and the dune grass along the beach. Pure and deterministic.
import { hash } from "./hash.ts";
import { PROPS, SUBURB_LAWNS, WEST_EDGE, EAST_EDGE } from "./layout.ts";
import { DECK } from "./boardwalk.ts";
import { parkGrowth, type Growth, type GrowthKind } from "./park.ts";

const grow = (
  kind: GrowthKind,
  x: number,
  z: number,
  i: number,
  scale = 1,
): Growth => ({
  kind,
  x,
  z,
  yaw: hash(x, z, i) * Math.PI * 2,
  scale: scale * (0.8 + hash(x, z, i + 1) * 0.5),
});

/** Tufts over each front lawn, on a jittered 1.5 m grid. */
export function lawnGrowth(): Growth[] {
  const out: Growth[] = [];
  for (const lawn of SUBURB_LAWNS) {
    const xs = lawn.polygon.map(([x]) => x);
    const zs = lawn.polygon.map(([, z]) => z);
    const [x0, x1, z0, z1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...zs),
      Math.max(...zs),
    ];
    for (let gx = x0 + 0.7; gx < x1; gx += 1.5)
      for (let gz = z0 + 0.7; gz < z1; gz += 1.5) {
        const x = gx + (hash(gx, gz, 80) - 0.5) * 1.1;
        const z = gz + (hash(gx, gz, 81) - 0.5) * 1.1;
        if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        out.push(grow(hash(gx, gz, 82) < 0.3 ? "wispy" : "grass", x, z, 83));
      }
  }
  return out;
}

/** A ring of grass and ferns round every street tree: the tree pit. */
export function treePitGrowth(): Growth[] {
  const out: Growth[] = [];
  for (const p of PROPS) {
    if (p.kind !== "tree") continue;
    const [px, pz] = p.position;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + hash(px, pz, 90) * 2;
      const r = 1.0 + hash(px, pz, 91 + k) * 0.4;
      out.push(
        grow(
          k % 3 === 0 ? "fern" : "grass",
          px + Math.cos(a) * r,
          pz + Math.sin(a) * r,
          92,
          0.8,
        ),
      );
    }
  }
  return out;
}

/** Dune grass in a band along the beach, just seaward of the deck: clumps of
 * three tall tufts (drawn on the low tier too, out to a long way). */
export function duneGrowth(): Growth[] {
  const out: Growth[] = [];
  for (let x = WEST_EDGE + 4; x < EAST_EDGE - 4; x += 2.4) {
    if (Math.abs(x - 24) < 6 || hash(x, 100) < 0.3) continue;
    const z = DECK.z1 + 1.4 + hash(x, 101) * 4.2;
    for (let k = 0; k < 3; k++)
      out.push(
        grow(
          "dune",
          x + (hash(x, 104 + k) - 0.5) * 1.1,
          z + (hash(x, 107 + k) - 0.5) * 0.9,
          103 + k,
        ),
      );
  }
  return out;
}

export const ALL_GROWTH: readonly Growth[] = [
  ...parkGrowth(),
  ...lawnGrowth(),
  ...treePitGrowth(),
  ...duneGrowth(),
];
