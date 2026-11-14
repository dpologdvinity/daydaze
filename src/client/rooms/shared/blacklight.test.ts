import assert from "node:assert/strict";
import { test } from "node:test";
import { injectBlacklight } from "./blacklight.ts";

const FRAG = "void main() {\n#include <emissivemap_fragment>\n}";

test("the blacklight chunk lands after the emissive map and declares its uniform", () => {
  const out = injectBlacklight(FRAG);
  assert.match(out, /uniform float uUvGlow;\nvoid main\(\)/);
  assert.ok(
    out.indexOf("totalEmissiveRadiance +=") >
      out.indexOf("#include <emissivemap_fragment>"),
  );
});

test("a shader with no emissive chunk is left alone", () => {
  assert.equal(injectBlacklight("void main() {}"), "void main() {}");
});
