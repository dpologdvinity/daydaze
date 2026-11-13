// Drops the translation and scale channels of every bone but the root and the
// pelvis from an animation GLB (art/opponents/build_clips.py writes it).
//
// The Universal Animation Library keys every bone's translation and scale at
// its rest value, which is a third of each clip's channels and, with a time
// accessor each, most of the file's JSON. The opponents share the library's
// skeleton, so a bone without those channels keeps its own rest values: the
// same pose. Run before gltf-transform's prune and optimize
// (scripts/optimize-opponents.sh).
//
//   node --experimental-strip-types scripts/trimClips.ts in.glb out.glb

import { readFileSync, writeFileSync } from "node:fs";

/** Bones whose translation really moves: the body travels with these. */
const MOVING = new Set(["root", "pelvis"]);

interface Sampler {
  input: number;
  output: number;
  interpolation?: string;
}
interface Channel {
  sampler: number;
  target: { node: number; path: string };
}
interface Animation {
  name?: string;
  channels: Channel[];
  samplers: Sampler[];
}
interface Gltf {
  nodes: { name?: string }[];
  animations: Animation[];
}

/** Splits a GLB into its JSON and the chunks after it. */
function split(buf: Buffer): { json: Gltf; rest: Buffer } {
  const jsonLength = buf.readUInt32LE(12);
  const json: Gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString());
  return { json, rest: buf.subarray(20 + jsonLength) };
}

/** A GLB from JSON (padded with spaces to 4 bytes) and the later chunks. */
function join(json: Gltf, rest: Buffer): Buffer {
  let text = JSON.stringify(json);
  while (Buffer.byteLength(text) % 4) text += " ";
  const body = Buffer.from(text);
  const head = Buffer.alloc(20);
  head.write("glTF", 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + body.length + rest.length, 8);
  head.writeUInt32LE(body.length, 12);
  head.write("JSON", 16);
  return Buffer.concat([head, body, rest]);
}

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: trimClips.ts in.glb out.glb");
const { json, rest } = split(readFileSync(input));
let dropped = 0;
for (const anim of json.animations) {
  const keep = anim.channels.filter((c) => {
    const bone = json.nodes[c.target.node]?.name ?? "";
    return c.target.path === "rotation" || MOVING.has(bone);
  });
  dropped += anim.channels.length - keep.length;
  // samplers renumbered to the channels that stay
  const used = [...new Set(keep.map((c) => c.sampler))];
  anim.samplers = used.map((i) => {
    const s = anim.samplers[i];
    if (!s) throw new Error("channel without a sampler");
    return s;
  });
  anim.channels = keep.map((c) => ({ ...c, sampler: used.indexOf(c.sampler) }));
}
writeFileSync(output, join(json, rest));
console.log(`dropped ${dropped} channels`);
