import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { MOCAP_CLIPS } from "./mocap.ts";
import { MOCAP_PACKS, type MocapPack } from "./mocapTypes.ts";

// the clip names inside a baked GLB: read from its JSON chunk, no loader needed
function clipNames(file: string): string[] {
  const buf = readFileSync(
    new URL(`../../../public/models/doll/${file}`, import.meta.url),
  );
  const jsonLength = buf.readUInt32LE(12);
  const json: unknown = JSON.parse(buf.toString("utf8", 20, 20 + jsonLength));
  const anims =
    typeof json === "object" && json !== null && "animations" in json
      ? json.animations
      : [];
  assert.ok(Array.isArray(anims), `${file} has animations`);
  return anims.map((a: unknown) => {
    assert.ok(typeof a === "object" && a !== null && "name" in a);
    return String(a.name);
  });
}

const fileOf = (pack: MocapPack, suffix: string) =>
  `anims${pack === "core" ? "" : `-${pack}`}${suffix}.glb`;

test("every pack's file holds exactly the catalog's clips for it, on both skeletons", () => {
  for (const suffix of ["", "-m"]) {
    for (const pack of MOCAP_PACKS) {
      const want = MOCAP_CLIPS.filter((c) => c.pack === pack)
        .map((c) => c.id)
        .sort();
      assert.ok(want.length > 0, `${pack} has clips`);
      const got = clipNames(fileOf(pack, suffix)).sort();
      assert.deepEqual(got, want, `${fileOf(pack, suffix)}`);
    }
  }
});

test("the always-loaded core stays small: under 2.5 MB a skeleton", () => {
  for (const suffix of ["", "-m"]) {
    const size = readFileSync(
      new URL(
        `../../../public/models/doll/${fileOf("core", suffix)}`,
        import.meta.url,
      ),
    ).length;
    assert.ok(size < 2.5 * 1024 * 1024, `${size} bytes`);
  }
});
