// Asset budget contract: shipped transit stays merged and its low LOD is cheap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("downloaded transit has one primitive per model and small distance LODs", () => {
  for (const kind of ["taxi", "sedan", "van", "bus", "stop"]) {
    const triangles: number[] = [];
    for (const suffix of ["", "-lo"]) {
      const bytes = readFileSync(
        new URL(
          `../../../public/models/transit/${kind}${suffix}.glb`,
          import.meta.url,
        ),
      );
      const doc: {
        meshes: {
          primitives: {
            indices: number;
            attributes: { POSITION: number; COLOR_0: number };
          }[];
        }[];
        nodes: { scale?: number[] }[];
        accessors: {
          count: number;
          min: number[];
          max: number[];
          normalized?: boolean;
        }[];
      } = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
      assert.equal(doc.meshes.length, 1, kind);
      assert.equal(doc.meshes[0].primitives.length, 1, kind);
      const p = doc.meshes[0].primitives[0];
      assert.equal(
        typeof p.attributes.COLOR_0,
        "number",
        `${kind} keeps downloaded colors`,
      );
      triangles.push(doc.accessors[p.indices].count / 3);
      if (kind === "bus") {
        const a = doc.accessors[p.attributes.POSITION];
        const scale = doc.nodes[0].scale?.[0] ?? 1;
        const unit = a.normalized ? scale / 32767 : scale;
        assert.ok((a.max[2] - a.min[2]) * unit < 2.5, "bus fits a street lane");
        assert.ok((a.max[0] - a.min[0]) * unit > 8, "bus keeps full length");
      }
    }
    assert.ok(triangles[1] < 650, `${kind} low budget`);
    assert.ok(triangles[1] < triangles[0], `${kind} has a real LOD`);
  }
});
