import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADS,
  BLADE_SIGNS,
  dressBuilding,
  labelUv,
  LABELS,
  FURNITURE,
  PARKED_CARS,
  STREET_DRESS,
  type Buckets,
} from "./dressing.ts";
import { BUILDINGS, CITY_SURFACES, PROPS } from "./layout.ts";
import { isLotBlock } from "./districts.ts";
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

test("parked cars stand in the road, at the kerbs, in a mix of bodies", () => {
  assert.ok(PARKED_CARS.length > 20, `${PARKED_CARS.length} cars`);
  for (const c of PARKED_CARS) {
    // the yards' lots (yards.test.ts) are off the road by design
    if (!c.lot)
      assert.ok(inRoad(c.x, c.z), `car at ${c.x},${c.z} is off the road`);
    assert.ok(Number.isFinite(c.yaw));
  }
  assert.ok(new Set(PARKED_CARS.map((c) => c.body)).size >= 4);
  // never a bus or an ambulance at the kerb
  assert.ok(
    PARKED_CARS.every((c) => c.body !== "ambulance" && c.body !== "schoolbus"),
  );
});

test("street furniture stands on the pavement, clear of the asphalt", () => {
  const furniture: readonly Kind[] = ["furniture", "glass", "treeCanopy"];
  const items = STREET_DRESS.filter((p) => furniture.includes(p.kind));
  for (const p of items) {
    assert.ok(!inRoad(p.at[0], p.at[1]), `${p.kind} at ${p.at} is on the road`);
  }
});

test("a vending machine never stands in a tree's trunk or a lamp's pole", () => {
  const machines = FURNITURE.filter((f) => f.kind === "vending");
  assert.ok(machines.length >= 10);
  for (const m of machines)
    for (const p of PROPS)
      assert.ok(
        Math.hypot(p.position[0] - m.x, p.position[1] - m.z) > 1.7,
        `${p.kind} at ${p.position} by the machine at ${m.x}, ${m.z}`,
      );
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
    "farm",
    "forest",
    "garden",
    "gridiron",
    "marina",
    "mermaid-cove",
    "mini-golf",
    "open-water",
    "skatepark",
    "speedway",
    "stadium",
    "water-park",
    "zoo",
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

test("a district block wearing lots drops its own 10 m board and awning: the lots' shop boards name it", () => {
  const signed = BUILDINGS.filter((b) => isLotBlock(b) && b.sign);
  let posters = 0;
  let tags = 0;
  assert.ok(signed.length > 5, "district blocks carry their own boards");
  for (const b of signed) {
    const plain = emptyBuckets();
    dressBuilding(b, plain, false, true, false);
    const lotted = emptyBuckets();
    dressBuilding(b, lotted, true, true, true);
    assert.equal(plain.sign.length, 1, b.id);
    assert.equal(lotted.sign.length, 0, b.id);
    // nor does the block's one big striped awning cross the lots' doors
    assert.ok(plain.awning.length > 0, b.id);
    assert.equal(lotted.awning.length, 0, b.id);
    // nor do pasted posters (a dark rectangle in a bright frame) or product
    // shelves hang over the lots' own doors and windows
    const poster = (i: Instance) => i.sx === 1.1 && i.sy === 1.5;
    const shelf = (i: Instance) => i.sy === 0.12 && i.sz === 0.5;
    // spray-paint tags: 0.9 m tall glow slabs low on the wall (no sign is that thin and bright)
    const tag = (i: Instance) => i.sy === 0.9 && i.sz === 0.05 && i.y < 3.4;
    posters += plain.glow.filter(poster).length;
    assert.equal(lotted.glow.filter(poster).length, 0, b.id);
    assert.equal(lotted.furniture.filter(shelf).length, 0, b.id);
    tags += plain.glow.filter(tag).length;
    assert.equal(lotted.glow.filter(tag).length, 0, b.id);
  }
  assert.ok(posters > 0, "the plain blocks do carry posters");
  assert.ok(tags > 0, "and graffiti tags");
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

test("street furniture models stand on the pavement and face the street", () => {
  assert.ok(FURNITURE.length > 100, `${FURNITURE.length} pieces`);
  for (const f of FURNITURE) {
    assert.ok(!inRoad(f.x, f.z), `${f.kind} at ${f.x},${f.z} is on the road`);
  }
  const kinds = new Set(FURNITURE.map((f) => f.kind));
  for (const k of ["hydrant", "trashcan", "bench", "mailbox", "busstop"])
    assert.ok(kinds.has(k as never), `no ${k}`);
});

test("string lights are small round bulbs on a thin cord, not big cubes", () => {
  const bulbs = STREET_DRESS.filter(
    (p) => p.kind === "bulb" && p.instance.y > 4,
  );
  assert.ok(bulbs.length > 100);
  for (const p of bulbs) assert.ok(p.instance.sx <= 0.2, "bulb too big");
  const cords = STREET_DRESS.filter(
    (p) => p.kind === "ledge" && p.instance.sx === 0.03,
  );
  // one cord between every two bulbs of a string
  assert.ok(cords.length > 100);
  for (const p of cords) {
    assert.ok(p.instance.sz > 0.5 && p.instance.sz < 6, "cord segment length");
    assert.ok(p.instance.y > 4, "cord hangs over the street");
  }
});
