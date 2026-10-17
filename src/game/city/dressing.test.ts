import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADS,
  BLADE_SIGNS,
  dressBuilding,
  labelUv,
  LABELS,
  STREET_DRESS,
  type Buckets,
} from "./dressing.ts";
import { BUILDINGS, CITY_SURFACES } from "./layout.ts";
import { KINDS, type Instance, type Kind } from "./plan.ts";

type Box = { x0: number; z0: number; x1: number; z1: number };

function boxOf(poly: readonly (readonly [number, number])[]): Box {
  const xs = poly.map(([x]) => x);
  const zs = poly.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    z0: Math.min(...zs),
    x1: Math.max(...xs),
    z1: Math.max(...zs),
  };
}

const ROADS = CITY_SURFACES.filter((s) => s.kind === "road").map((s) =>
  boxOf(s.polygon),
);

function inRoad(x: number, z: number): boolean {
  return ROADS.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
}

function emptyBuckets(): Buckets {
  return Object.fromEntries(KINDS.map((k) => [k, [] as Instance[]])) as Buckets;
}

function dressed(id: string): Buckets {
  const b = BUILDINGS.find((x) => x.id === id);
  assert.ok(b, `no building ${id}`);
  const out = emptyBuckets();
  dressBuilding(b, out);
  return out;
}

test("every sign, blade and ad stands on a frontage, never over a road", () => {
  for (const b of BUILDINGS) {
    const out = emptyBuckets();
    dressBuilding(b, out);
    for (const kind of ["sign", "panel", "label", "arch"] as const) {
      for (const i of out[kind]) {
        // the four corners of the panel, turned by its yaw about the y axis
        const yaw = i.rot?.[1] ?? 0;
        const [dx, dz] = [Math.cos(yaw), -Math.sin(yaw)];
        const [ex, ez] = [Math.sin(yaw), Math.cos(yaw)];
        for (const a of [-1, 1]) {
          for (const c of [-1, 1]) {
            const x = i.x + (a * dx * i.sx + c * ex * i.sz) / 2;
            const z = i.z + (a * dz * i.sx + c * ez * i.sz) / 2;
            assert.ok(!inRoad(x, z), `${b.id} ${kind} at ${x},${z}`);
          }
        }
      }
    }
  }
});

test("parked cars stand in the road, at the kerbs", () => {
  const cars = STREET_DRESS.filter((p) => p.kind === "car").map(
    (p) => p.instance,
  );
  assert.ok(cars.length > 40, `${cars.length} cars`);
  for (const c of cars) {
    assert.ok(inRoad(c.x, c.z), `car at ${c.x},${c.z} is off the road`);
  }
});

test("street furniture stands on the pavement, clear of the asphalt", () => {
  const furniture: readonly Kind[] = ["furniture", "glass", "treeCanopy"];
  const items = STREET_DRESS.filter((p) => furniture.includes(p.kind));
  assert.ok(items.length > 10, `${items.length} pieces of furniture`);
  for (const p of items) {
    assert.ok(!inRoad(p.at[0], p.at[1]), `${p.kind} at ${p.at} is on the road`);
  }
});

test("every sign name has its own rectangle on the label atlas", () => {
  const texts = [
    ...BUILDINGS.flatMap((b) => (b.sign ? [b.sign.text] : [])),
    ...Object.values(BLADE_SIGNS).flatMap((s) => (s ? [s.text] : [])),
    ...Object.values(ADS).flatMap((a) => (a ? [a.text] : [])),
  ];
  for (const text of texts) {
    assert.ok(LABELS.includes(text), `${text} has no atlas cell`);
    const [u, v, w, h] = labelUv(text);
    assert.ok(u >= 0 && v >= 0 && u + w <= 1 && v + h <= 1, text);
  }
  const cells = new Set(LABELS.map((t) => labelUv(t).join(",")));
  assert.equal(cells.size, LABELS.length);
});

test("each gate raises two tall arches either side of its door", () => {
  const gates = BUILDINGS.filter((b) => b.style === "gate");
  const venues = gates.map((b) => b.door?.target).sort();
  assert.deepEqual(venues, [
    "amusement-park",
    "dome",
    "gridiron",
    "mini-golf",
    "skatepark",
    "speedway",
    "stadium",
    "water-park",
  ]);
  for (const b of gates) {
    const out = dressed(b.id);
    // two posts and a beam across the top
    assert.equal(out.arch.length, 3, b.id);
    const door = b.door?.position;
    assert.ok(door, `${b.id} has no door`);
    const posts = out.arch.filter((a) => a.sy >= 16);
    assert.equal(posts.length, 2, b.id);
    const xs = posts.map((a) => a.x);
    assert.ok(Math.min(...xs) < door[0] && door[0] < Math.max(...xs), b.id);
    for (const a of posts) assert.ok(a.sy >= 16, `${b.id} arch is ${a.sy} m`);
  }
});

test("the blade signs and ads are dressed on their own buildings", () => {
  for (const id of Object.keys(BLADE_SIGNS)) {
    const b = BUILDINGS.find((x) => x.id === id);
    // two faces of the blade, plus the building's own sign if it has one
    assert.equal(dressed(id).label.length, (b?.sign ? 1 : 0) + 2, id);
  }
  for (const id of Object.keys(ADS)) {
    const b = BUILDINGS.find((x) => x.id === id);
    assert.equal(dressed(id).label.length, (b?.sign ? 1 : 0) + 1, id);
  }
});
