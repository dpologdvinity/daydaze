// District lots: every block in the five districts is tiled with lots that
// span its faces, meet its roofline, differ from their neighbors and carry
// their district's made-up names; the model costs match the shipped GLB.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EL_STATIONS, stairsRect } from "./el.ts";
import { BUILDINGS } from "./layout.ts";
import { facesOf } from "./nyc.ts";
import {
  DISTRICT_NAMES,
  LOOKS,
  LOT_CAPACITY,
  LOT_MODELS,
  LOT_SPECS,
  PALETTES,
  districtOf,
  isLotBlock,
  lotRow,
  modelsFor,
  swatchColors,
  tileFace,
  type District,
} from "./districts.ts";
import { hash } from "./hash.ts";
import { planView } from "./budget.ts";

const blocks = BUILDINGS.filter((b) => isLotBlock(b) && lotRow(b).length > 0);
const DISTRICTS = Object.keys(LOOKS) as District[];

test("the five districts each have lot blocks, Downtown none", () => {
  for (const d of DISTRICTS)
    assert.ok(
      blocks.some((b) => districtOf(b) === d),
      d,
    );
  for (const b of BUILDINGS)
    if (b.neighborhood === "downtown") assert.equal(isLotBlock(b), false, b.id);
});

test("Chinatown is west of the Asia hub road and Koreatown east of it", () => {
  const chinatown = blocks.filter((b) => districtOf(b) === "chinatown");
  const koreatown = blocks.filter((b) => districtOf(b) === "koreatown");
  assert.ok(chinatown.length > 5 && koreatown.length > 5);
  for (const b of chinatown)
    assert.ok(Math.min(...b.footprint.map(([x]) => x)) < 320, b.id);
  for (const b of koreatown)
    assert.ok(Math.max(...b.footprint.map(([x]) => x)) > 320, b.id);
});

test("tileFace fills a face exactly with lots stretched within bounds", () => {
  for (let length = 6; length <= 40; length += 0.7) {
    const row = tileFace(length, LOOKS.chinatown.models, (k) =>
      hash(length, k),
    );
    const sum = row.reduce((n, l) => n + LOT_SPECS[l.model].w * l.sx, 0);
    assert.ok(Math.abs(sum - length) < 1e-6, `${length}: ${sum}`);
    for (const l of row) assert.ok(l.sx > 0.5 && l.sx < 1.8, `${length}`);
  }
});

test("each block's lots add up to the length of its faces", () => {
  for (const b of blocks) {
    const faces = facesOf(b).reduce((n, f) => n + f.length, 0);
    const lots = lotRow(b).reduce((n, l) => n + LOT_SPECS[l.model].w * l.sx, 0);
    // a block an El stair flight stands in front of leaves those shops out
    const xs = b.footprint.map(([x]) => x);
    const south = Math.min(...b.footprint.map(([, z]) => z)) > 0;
    const stairs =
      south &&
      EL_STATIONS.some((s) => {
        const [x0, , x1] = stairsRect(s);
        return x0 < Math.max(...xs) && x1 > Math.min(...xs);
      });
    if (stairs) assert.ok(lots <= faces + 1e-6, `${b.id}: ${faces} vs ${lots}`);
    else
      assert.ok(Math.abs(faces - lots) < 1e-6, `${b.id}: ${faces} vs ${lots}`);
  }
});

test("lots meet the block's roofline without stretching out of shape", () => {
  for (const b of blocks)
    for (const l of lotRow(b)) {
      assert.ok(
        Math.abs(l.sy * LOT_SPECS[l.model].roof - b.height) < 1e-6,
        b.id,
      );
      assert.ok(l.sy > 0.7 && l.sy < 1.5, `${b.id}: ${l.model} sy ${l.sy}`);
    }
});

test("lots stand on their block's footprint, facing out", () => {
  for (const b of blocks) {
    const xs = b.footprint.map(([x]) => x);
    const zs = b.footprint.map(([, z]) => z);
    for (const l of lotRow(b)) {
      assert.ok(l.x >= Math.min(...xs) - 0.1 && l.x <= Math.max(...xs) + 0.1);
      assert.ok(l.z >= Math.min(...zs) - 0.1 && l.z <= Math.max(...zs) + 0.1);
    }
  }
});

test("a lot only wears its own district's palettes and names", () => {
  for (const b of blocks) {
    const d = districtOf(b);
    if (!d) continue;
    for (const l of lotRow(b)) {
      assert.ok(LOOKS[d].palettes.includes(PALETTES[l.palette]), b.id);
      assert.ok(LOOKS[d].models.includes(l.model), b.id);
      if (l.sign) assert.ok(DISTRICT_NAMES[d].includes(l.sign), b.id);
    }
  }
});

test("neighboring lots wear different palettes", () => {
  for (const b of blocks) {
    const row = lotRow(b);
    for (let i = 1; i < row.length; i++)
      assert.notEqual(row[i].palette, row[i - 1].palette, `${b.id} lot ${i}`);
  }
});

test("a row of lots varies: a long wall is never one model in one color", () => {
  const varied = blocks.filter((b) => lotRow(b).length >= 6);
  assert.ok(varied.length > 10);
  for (const b of varied) {
    const row = lotRow(b);
    assert.ok(new Set(row.map((l) => l.palette)).size >= 3, b.id);
  }
});

test("lots are placed the same way on every load", () => {
  for (const b of blocks.slice(0, 20))
    assert.deepEqual(lotRow(b), lotRow(b), b.id);
});

test("every block's roof has a model that fits it", () => {
  for (const d of DISTRICTS)
    for (const height of [9, 10, 12, 14, 16, 18, 20, 22, 24, 26])
      assert.ok(modelsFor(LOOKS[d], height).length > 0, `${d} ${height}`);
});

test("the districts differ: their palettes, names and model mixes are their own", () => {
  const walls = new Set<string>();
  const names = new Set<string>();
  for (const d of DISTRICTS) {
    assert.ok(LOOKS[d].palettes.length >= 6, d);
    for (const p of LOOKS[d].palettes) {
      assert.ok(!walls.has(p.wall), `${d} repeats ${p.wall}`);
      walls.add(p.wall);
    }
    for (const n of DISTRICT_NAMES[d]) {
      assert.ok(!names.has(n), `${n} is in two districts`);
      names.add(n);
      assert.match(n, /^[A-Z0-9 &.'-]+$/, n);
      assert.ok(n.length <= 26, n);
    }
    assert.ok(DISTRICT_NAMES[d].length >= 10, d);
  }
  const mixes = new Set(DISTRICTS.map((d) => [...LOOKS[d].models].join()));
  assert.equal(mixes.size, DISTRICTS.length);
});

test("palettes fill all 16 swatches with colors", () => {
  for (const p of PALETTES) {
    const colors = swatchColors(p);
    assert.equal(colors.length, 16);
    for (const c of colors) assert.match(c, /^#[0-9a-f]{6}$/i);
  }
});

type Gltf = {
  nodes: { name: string; mesh: number }[];
  meshes: { primitives: { indices: number }[] }[];
  accessors: { count: number }[];
};

function lotsGlb(): Gltf {
  const bytes = readFileSync(
    new URL("../../../public/models/districts/lots.glb", import.meta.url),
  );
  const length = bytes.readUInt32LE(12);
  const json: unknown = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.ok(isGltf(json));
  return json;
}

const isGltf = (v: unknown): v is Gltf =>
  typeof v === "object" &&
  v !== null &&
  "nodes" in v &&
  Array.isArray(v.nodes) &&
  "meshes" in v &&
  Array.isArray(v.meshes) &&
  "accessors" in v &&
  Array.isArray(v.accessors);

test("the lot specs match the shipped lots.glb, each with its far twin", () => {
  const gltf = lotsGlb();
  const expected = LOT_MODELS.flatMap((m) => [m, `${m}_lo`]);
  assert.deepEqual(gltf.nodes.map((n) => n.name).sort(), expected.sort());
  for (const node of gltf.nodes) {
    const twin = node.name.endsWith("_lo");
    const model = LOT_MODELS.find((m) => m === node.name.replace("_lo", ""));
    assert.ok(model, node.name);
    const tris = gltf.meshes[node.mesh].primitives.reduce(
      (n, p) => n + gltf.accessors[p.indices].count / 3,
      0,
    );
    const spec = LOT_SPECS[model];
    assert.equal(twin ? spec.lo : spec.tris, Math.round(tris), node.name);
    if (twin) assert.ok(spec.lo < spec.tris, `${model}'s twin is lighter`);
  }
});

test("no model has more lots in any high-tier view than half its mesh holds", () => {
  let most = 0;
  for (let x = -432; x <= 432; x += 48)
    for (let z = -320; z <= 368; z += 48) {
      const counts = new Map<string, number>();
      for (const lot of planView([x, z], "high").lots)
        counts.set(lot.model, (counts.get(lot.model) ?? 0) + 1);
      most = Math.max(most, ...counts.values());
    }
  assert.ok(most > 0 && most * 2 <= LOT_CAPACITY, `${most} of ${LOT_CAPACITY}`);
});

test("a lot block drops the old balconies, fire escapes and rooftop AC: the lots carry their own", async () => {
  const { dressBuilding, frontOf } = await import("./dressing.ts");
  const { emptyInstances } = await import("./plan.ts");
  const { isLotBlock } = await import("./districts.ts");
  const b = BUILDINGS.find((x) => isLotBlock(x) && x.style === "brick");
  assert.ok(b, "a brick district block exists");
  const plain = emptyInstances();
  const lotted = emptyInstances();
  dressBuilding(b, plain, true, true, false);
  dressBuilding(b, lotted, true, true, true);
  const f = frontOf(b);
  // no balcony slab, fire escape landing or ladder, no rooftop AC box
  assert.ok(lotted.ledge.length < plain.ledge.length);
  assert.ok(lotted.pole.length < plain.pole.length);
  assert.ok(
    lotted.furniture.every((i) => i.y < f.h),
    "no AC on the roof",
  );
  // the tank and antenna stay, standing on the lot's own roof
  assert.ok(lotted.pole.some((i) => Math.abs(i.y - (f.h + 1.3)) < 0.01));
});
