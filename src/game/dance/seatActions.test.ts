import assert from "node:assert/strict";
import { test } from "node:test";
import { clipOf } from "./clips.ts";
import { SEATED_EMOTE, seatedHold } from "./seatActions.ts";

test("every seated emote maps a real emote to a baked seated loop", () => {
  for (const [emote, seated] of Object.entries(SEATED_EMOTE)) {
    const from = clipOf(emote);
    assert.ok(from && (from.kind === "emote" || from.kind === "dance"), emote);
    const to = clipOf(seated);
    assert.equal(to?.kind, "seat", seated);
    assert.equal(to?.pack, "seated", seated);
  }
});

test("a seated emote beats her pose, which beats the seat's own idle", () => {
  const base = { mood: "sit", dance: "clap", picked: "built" };
  // not dancing: the emote is not on
  assert.equal(seatedHold({ ...base }), "built");
  assert.equal(seatedHold({ ...base, seatHold: "seat-typing" }), "seat-typing");
  assert.equal(
    seatedHold({ ...base, picked: "sit-crossed", seatHold: "seat-typing" }),
    "sit-crossed",
  );
  assert.equal(seatedHold({ ...base, mood: "dance" }), "seat-clap");
  assert.equal(
    seatedHold({ ...base, mood: "dance", picked: "sit-crossed" }),
    "seat-clap",
  );
  // a dance with no seated take leaves her sitting as she was
  assert.equal(
    seatedHold({ ...base, mood: "dance", dance: "thriller", picked: "x" }),
    "x",
  );
});
