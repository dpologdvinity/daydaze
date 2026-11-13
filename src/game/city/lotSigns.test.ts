// A district lot's shop board hangs flush on the facade between the ground
// floor's door and window heads and the first floor's sills, never over a door
// or a window: the band the plan uses (districts.ts SIGN_BAND) is checked
// against the shipped lots.glb's own geometry, and every board the plan places
// is checked to sit inside its model's band.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  LOT_MODELS,
  SIGN_BAND,
  SWATCH,
  signBoard,
  type LotModel,
} from "./districts.ts";
import { planView } from "./budget.ts";
import { BUILDINGS } from "./layout.ts";
import { KINDS, type Instance, type Kind } from "./plan.ts";
import { isLotBlock, lotRow } from "./districts.ts";

/** What a lot has on its front plane, in meters up: where the ground floor's
 * openings end and where the first floor's begin. */
type Openings = { groundHead: number; upperSill: number };

/** Parses lots.glb in Node (a meshopt-compressed file, no textures). */
function parseLots(): Promise<THREE.Group> {
  Object.assign(globalThis, { self: globalThis });
  const bytes = readFileSync(
    new URL("../../../public/models/districts/lots.glb", import.meta.url),
  );
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return new Promise((resolve, reject) =>
    new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parse(ab, "", (g) => resolve(g.scene), reject),
  );
}

/** Door, window-frame, glass and sill faces within a meter of the front wall. */
const OPENINGS: readonly number[] = [
  SWATCH.door,
  SWATCH.step,
  SWATCH.glass,
  SWATCH.sill,
];
/** Ground-floor openings end below this; anything above starts the first floor. */
const FLOOR_LINE = 3.3;

async function openingsOf(): Promise<Map<LotModel, Openings>> {
  const scene = await parseLots();
  scene.updateMatrixWorld(true);
  const out = new Map<LotModel, Openings>();
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name.endsWith("_lo")) return;
    const model = LOT_MODELS.find((m) => m === o.name);
    const index = o.geometry.getIndex();
    if (!model || !index) return;
    const pos = o.geometry.getAttribute("position");
    const uv = o.geometry.getAttribute("uv");
    const world: [number, number][] = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      world.push([v.y, v.z]);
    }
    let groundHead = 0;
    let upperSill = Infinity;
    for (let t = 0; t < index.count; t += 3) {
      const ids = [0, 1, 2].map((k) => index.getX(t + k));
      const swatch =
        Math.floor(uv.getY(ids[0] ?? 0) * 4) * 4 +
        Math.floor(uv.getX(ids[0] ?? 0) * 4);
      if (!OPENINGS.includes(swatch)) continue;
      const ys = ids.map((i) => world[i]?.[0] ?? 0);
      const zs = ids.map((i) => world[i]?.[1] ?? 0);
      if (!zs.every((z) => z > -0.3 && z < 1)) continue;
      if (Math.max(...ys) < FLOOR_LINE)
        groundHead = Math.max(groundHead, ...ys);
      else if (Math.min(...ys) > FLOOR_LINE)
        upperSill = Math.min(upperSill, ...ys);
    }
    out.set(model, { groundHead, upperSill });
  });
  return out;
}

test("each model's sign band clears its door and window heads and its first-floor sills", async () => {
  const openings = await openingsOf();
  assert.equal(openings.size, LOT_MODELS.length);
  for (const model of LOT_MODELS) {
    const { lo, hi } = SIGN_BAND[model];
    const o = openings.get(model);
    assert.ok(o, model);
    assert.ok(
      lo >= o.groundHead + 0.05,
      `${model}: band starts ${lo}, openings end ${o.groundHead}`,
    );
    // a model with no upper openings (an arched front, a slim tower) ends at the sills it has
    if (Number.isFinite(o.upperSill))
      assert.ok(
        hi <= o.upperSill - 0.05,
        `${model}: band ends ${hi}, windows start ${o.upperSill}`,
      );
    assert.ok(hi - lo >= 0.7, `${model}: room for a board`);
  }
});

test("every board the plan places sits inside its model's band, stretch included", () => {
  let boards = 0;
  for (const at of [
    [-300, -8],
    [262, -8],
    [372, -8],
    [-96, -256],
    [264, -256],
  ] as const) {
    for (const lot of planView([...at], "high").lots) {
      if (!lot.sign) continue;
      const { y, h } = signBoard(lot.model, lot.sy);
      const { lo, hi } = SIGN_BAND[lot.model];
      assert.ok(h >= 0.4, `${lot.model} board is ${h} m tall`);
      assert.ok(y - h / 2 >= lo * lot.sy - 1e-9, `${lot.model} bottom`);
      assert.ok(y + h / 2 <= hi * lot.sy + 1e-9, `${lot.model} top`);
      boards++;
    }
  }
  assert.ok(boards > 20, `${boards} boards checked`);
});

test("the boards the dressing emits are the ones signBoard places, the name inside its board", async () => {
  const { lotSign } = await import("./dressing.ts");
  const block = BUILDINGS.find(
    (b) => isLotBlock(b) && lotRow(b).some((l) => l.sign),
  );
  assert.ok(block);
  const lot = lotRow(block).find((l) => l.sign);
  assert.ok(lot);
  const buckets = Object.fromEntries(
    KINDS.map((k) => [k, [] as Instance[]]),
  ) as Record<Kind, Instance[]>;
  lotSign(buckets, lot);
  const { y, h } = signBoard(lot.model, lot.sy);
  assert.equal(buckets.panel.length, 1);
  assert.ok(Math.abs((buckets.panel[0]?.y ?? 0) - y) < 1e-9);
  assert.ok(Math.abs((buckets.panel[0]?.sy ?? 0) - h) < 1e-9);
  const label = buckets.label[0];
  assert.ok(label && label.sy <= h);
});
