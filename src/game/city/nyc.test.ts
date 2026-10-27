import { test } from "node:test";
import assert from "node:assert/strict";
import { cellsWithin } from "./cells.ts";
import { BUILDINGS } from "./layout.ts";
import { planCity, trianglesOf } from "./plan.ts";
import { BAY_KINDS, BAY_TRIANGLES, isNyc, nycBays } from "./nyc.ts";

// the blocks that face a street; those inside a lot keep plain walls
const nyc = BUILDINGS.filter((b) => isNyc(b) && nycBays(b).length > 0);
const box = (b: (typeof BUILDINGS)[number]) => {
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    z0: Math.min(...zs),
    z1: Math.max(...zs),
  };
};

test("only brick, storefront and tower blocks in the New York districts get bays", () => {
  assert.ok(nyc.length > 20);
  for (const b of nyc) {
    assert.ok(["storefront", "brick", "tower"].includes(b.style), b.id);
    assert.ok(
      ["downtown", "uptown", "arts-district"].includes(b.neighborhood),
      b.id,
    );
  }
});

test("a building's bays are deterministic and stay within a post of its footprint", () => {
  for (const b of nyc) {
    const bays = nycBays(b);
    assert.deepEqual(nycBays(b), bays, b.id);
    assert.ok(bays.length > 0, b.id);
    const { x0, x1, z0, z1 } = box(b);
    for (const bay of bays) {
      assert.ok(BAY_KINDS.includes(bay.kind));
      assert.ok(bay.x >= x0 - 1e-6 && bay.x <= x1 + 1e-6, `${b.id} x`);
      assert.ok(bay.z >= z0 - 1e-6 && bay.z <= z1 + 1e-6, `${b.id} z`);
      assert.ok(bay.y >= 0 && bay.y < b.height, `${b.id} y`);
      // a bay is stretched to fit, never crushed or blown up
      assert.ok(bay.sx > 0.7 && bay.sx < 1.4, `${b.id} sx ${bay.sx}`);
      assert.ok(bay.sy > 0.7 && bay.sy < 1.4, `${b.id} sy ${bay.sy}`);
    }
  }
});

test("storeys land exactly under a one-meter cornice", () => {
  for (const b of nyc) {
    const tops = nycBays(b)
      .filter((bay) => bay.kind.startsWith("cornice"))
      .map((bay) => bay.y);
    assert.ok(tops.length > 0, b.id);
    for (const y of tops) assert.ok(Math.abs(y - (b.height - 1)) < 1e-6, b.id);
  }
});

test("a face has one door and shops, a cornice and a post at every corner", () => {
  const b = nyc[0];
  const bays = nycBays(b);
  const kinds = new Set(bays.map((bay) => bay.kind));
  assert.ok(kinds.has("post"));
  assert.ok([...kinds].some((k) => k.startsWith("door")));
  assert.ok([...kinds].some((k) => k.startsWith("shop")));
  assert.equal(
    bays.filter((bay) => bay.kind === "post" && bay.y === 0).length,
    4,
  );
});

test("the plan dresses only the blocks within range, and says what they cost", () => {
  const at: [number, number] = [-30, -6];
  const cells = cellsWithin(at, 160);
  const none = planCity(cells, 0, at, 0);
  const near = planCity(cells, 0, at, 50);
  assert.equal(none.bays.length, 0);
  assert.ok(near.bays.length > 100);
  // near blocks lose their painted windows and sills to the kit's own
  assert.ok(near.instances.window.length < none.instances.window.length);
  const cost = near.bays.reduce((n, bay) => n + BAY_TRIANGLES[bay.kind], 0);
  assert.ok(trianglesOf(near) > cost);
  // one facade box per building either way
  const walls = (p: typeof near) =>
    p.instances.brick.length +
    p.instances.concrete.length +
    p.instances.stucco.length +
    p.instances.siding.length +
    p.instances.curtain.length;
  assert.equal(walls(near), walls(none));
});
