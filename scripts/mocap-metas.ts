// Writes one art/doll/blender/.cache/out/meta-<pack>.json per clip pack from
// the committed catalog (src/game/dance/mocap.ts), so mocap.py can re-bake a
// single pack (MOCAP_PACKS=social) and still write the whole catalog: it needs
// a meta file for every pack, and the others are already in the catalog.
//
//   node --experimental-strip-types scripts/mocap-metas.ts
//   HAIR_ONLY=1 OUTFIT_ONLY=1 [DOLL_SEX=male] blender --background --factory-startup --python art/doll/blender/build_doll.py   # just the rig
//   MOCAP_PACKS=social [DOLL_SEX=male] blender --background --factory-startup --python art/doll/blender/mocap.py
//   ONLY=anims-social bash scripts/optimize-doll.sh
import { mkdirSync, writeFileSync } from "node:fs";
import { MOCAP_PACKS } from "../src/game/dance/mocapTypes.ts";
import { MOCAP_CLIPS } from "../src/game/dance/mocap.ts";

const out = new URL("../art/doll/blender/.cache/out/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const pack of MOCAP_PACKS) {
  const clips = MOCAP_CLIPS.filter((c) => c.pack === pack);
  writeFileSync(new URL(`meta-${pack}.json`, out), JSON.stringify(clips));
  console.log(pack, clips.length);
}
