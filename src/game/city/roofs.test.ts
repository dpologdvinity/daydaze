// Roofs: three surfaces in a mix of colors, kit that varies, all stable.
import assert from "node:assert/strict";
import { test } from "node:test";
import { roofKit, roofLook } from "./roofs.ts";

const spots = Array.from({ length: 600 }, (_, i): [number, number] => [
  (i % 30) * 21.3 - 300,
  Math.floor(i / 30) * 17.9 - 150,
]);

test("every roof surface and plenty of colors turn up, in the shares given", () => {
  const looks = spots.map(([x, z]) => roofLook(x, z));
  const share = (kind: string) =>
    looks.filter((l) => l.kind === kind).length / looks.length;
  assert.ok(Math.abs(share("roof") - 0.4) < 0.08, `tar ${share("roof")}`);
  assert.ok(Math.abs(share("roofGravel") - 0.25) < 0.08);
  assert.ok(share("roofSkin") > 0.25);
  assert.ok(new Set(looks.map((l) => l.color)).size >= 10);
  for (const l of looks) assert.match(l.color, /^#[0-9a-f]{6}$/);
});

test("a roof is the same on every call", () => {
  for (const [x, z] of spots.slice(0, 50)) {
    assert.deepEqual(roofLook(x, z), roofLook(x, z));
    assert.deepEqual(roofKit(x, z), roofKit(x, z));
  }
});

test("roof kit varies: bulkheads, vents, skylights and a few gardens", () => {
  const kits = spots.map(([x, z]) => roofKit(x, z));
  assert.ok(kits.some((k) => k.bulkhead) && kits.some((k) => !k.bulkhead));
  assert.deepEqual(new Set(kits.map((k) => k.vents)), new Set([0, 1, 2, 3]));
  assert.ok(kits.some((k) => k.skylight) && kits.some((k) => !k.skylight));
  const gardens = kits.filter((k) => k.garden).length / kits.length;
  assert.ok(gardens > 0.03 && gardens < 0.2, `${gardens}`);
});
