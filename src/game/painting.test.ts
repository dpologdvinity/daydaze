import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanPainting } from "./painting.ts";

test("a PNG data URL is kept; anything else is dropped", () => {
  const ok = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(cleanPainting(ok), ok);
  assert.equal(cleanPainting(42), null);
  assert.equal(cleanPainting("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(cleanPainting("data:image/png;base64,<script>"), null);
  assert.equal(cleanPainting("data:image/png;base64,"), null);
  assert.equal(
    cleanPainting(`data:image/png;base64,${"A".repeat(500_000)}`),
    null,
  );
});
