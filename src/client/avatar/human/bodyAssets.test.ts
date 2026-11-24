// Verify that rebuilt dolls expose the editor's actual controls and load in a
// neutral state, before runtime effects select clothing and facial morphs.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { readGlb } from "../../../../scripts/pruneMorphs.ts";
import { FACE_SLIDERS } from "../../../game/look.ts";
import { GARMENTS } from "../../../game/wardrobe.ts";

test("both human bodies and their distance models carry every facial slider", () => {
  for (const file of ["body", "body-lo", "body-m", "body-m-lo"]) {
    const { json } = readGlb(
      readFileSync(
        new URL(`../../../../public/models/doll/${file}.glb`, import.meta.url),
      ),
    );
    const shaped = json.meshes.filter(
      (mesh) => mesh.extras?.targetNames?.length,
    );
    assert.ok(shaped.length, file);
    for (const mesh of shaped) {
      for (const { id } of FACE_SLIDERS) {
        assert.ok(mesh.extras?.targetNames?.includes(id), `${file}: ${id}`);
      }
      assert.ok(
        mesh.weights?.every((value) => value === 0),
        `${file}: neutral defaults`,
      );
    }
  }
});

// A picker option without a real deformation would appear to save but do nothing.
test("new eye and lip presets deform both bodies at both detail levels", () => {
  for (const file of ["body", "body-lo", "body-m", "body-m-lo"]) {
    const { json } = readGlb(
      readFileSync(
        new URL(`../../../../public/models/doll/${file}.glb`, import.meta.url),
      ),
    );
    for (const key of [
      "eye_narrow",
      "eye_open",
      "eye_soft-almond",
      "lips_rounded",
      "lips_cupid",
      "lips_top-full",
      "lips_bottom-full",
    ]) {
      const mesh = json.meshes.find((mesh) =>
        mesh.extras?.targetNames?.includes(key),
      );
      assert.ok(mesh, `${file}: ${key}`);
      const index = mesh.extras?.targetNames?.indexOf(key) ?? -1;
      assert.ok(
        mesh.primitives.some((primitive) => {
          const position = primitive.targets?.[index]?.POSITION;
          if (position === undefined) return false;
          const accessor = json.accessors[position];
          return [...(accessor.min ?? []), ...(accessor.max ?? [])].some(
            (value) => Math.abs(value) > 0.0001,
          );
        }),
        `${file}: ${key} must move vertices`,
      );
    }
  }
});

// Every wardrobe garment ships for both builds at both detail levels, and
// each body carries the tuck key that sinks the skin under it.
test("every garment ships fitted to both bodies, with its tuck key", () => {
  for (const m of ["", "-m"]) {
    for (const lo of ["", "-lo"]) {
      const { json } = readGlb(
        readFileSync(
          new URL(
            `../../../../public/models/doll/body${m}${lo}.glb`,
            import.meta.url,
          ),
        ),
      );
      const keys = new Set(
        json.meshes.flatMap((mesh) => mesh.extras?.targetNames ?? []),
      );
      for (const g of GARMENTS) {
        const file = `${g.slot}-${g.id}${m}${lo}.glb`;
        assert.ok(
          existsSync(
            new URL(`../../../../public/models/doll/${file}`, import.meta.url),
          ),
          file,
        );
        assert.ok(keys.has(`tuck_${g.id}`), `body${m}${lo}: tuck_${g.id}`);
      }
    }
  }
});

test("tights cover the leg down to the foot and sneakers have no_socks morph", () => {
  for (const m of ["", "-m"]) {
    // Tights reach foot level (raw Y min <= -0.83 in glTF space, where floor is ~ -0.87)
    for (const lo of ["", "-lo"]) {
      const file = `legwear-tights${m}${lo}.glb`;
      const { json } = readGlb(
        readFileSync(
          new URL(`../../../../public/models/doll/${file}`, import.meta.url),
        ),
      );
      const mesh = json.meshes[0];
      const posIdx = mesh?.primitives[0]?.attributes?.POSITION;
      assert.ok(posIdx !== undefined, `${file}: missing POSITION accessor`);
      const posAcc = json.accessors[posIdx];
      const node = json.nodes?.find((n) => n.mesh === 0);
      const scale = node?.scale?.[1] ?? 1;
      const trans = node?.translation?.[1] ?? 0;
      const yMin =
        posAcc?.min?.[1] !== undefined
          ? (posAcc.min[1] / 32767) * scale + trans
          : 0;
      assert.ok(
        yMin < -0.83,
        `${file}: tights must reach foot level (got ${yMin})`,
      );
    }

    // Sneakers have no_socks shape key that moves vertices
    for (const lo of ["", "-lo"]) {
      const file = `shoes-sneakers${m}${lo}.glb`;
      const { json } = readGlb(
        readFileSync(
          new URL(`../../../../public/models/doll/${file}`, import.meta.url),
        ),
      );
      const mesh = json.meshes[0];
      const targets = mesh?.extras?.targetNames ?? [];
      assert.ok(
        targets.includes("no_socks"),
        `${file}: must carry no_socks morph target`,
      );
      const targetIdx = targets.indexOf("no_socks");
      assert.ok(
        mesh?.primitives.some((primitive) => {
          const position = primitive.targets?.[targetIdx]?.POSITION;
          if (position === undefined) return false;
          const accessor = json.accessors[position];
          return [...(accessor.min ?? []), ...(accessor.max ?? [])].some(
            (value) => Math.abs(value) > 0.0001,
          );
        }),
        `${file}: no_socks must move vertices`,
      );
    }
  }
});
