// Measures a Mixamo walk's leg motion straight from its FBX (three.js's own
// FBXLoader, independent of Blender's importer): the left knee's flex
// (degrees between thigh and shin), the thigh's pitch from vertical
// (+ forward) and the knee flex at toe-off (the thigh's furthest back).
// A real walk flexes ~15 at toe-off and ~60-70 at most; art/doll/blender/
// mocap.py picks its walks by these numbers.
//
//   node scripts/mixamo-gait.mjs mixamo/walking/Some-Walk.fbx
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const buf = readFileSync(process.argv[2]);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const root = new FBXLoader().parse(ab, "");
const clip = root.animations[0];
const mixer = new THREE.AnimationMixer(root);
mixer.clipAction(clip).play();
const bone = (n) =>
  root.getObjectByName("mixamorig" + n) ??
  root.getObjectByName("mixamorig:" + n);
const p = (n) => bone(n).getWorldPosition(new THREE.Vector3());
const out = [];
const n = Math.round(clip.duration * 30);
for (let i = 0; i <= n; i += 1) {
  mixer.setTime(i / 30);
  root.updateMatrixWorld(true);
  const hip = p("LeftUpLeg"),
    knee = p("LeftLeg"),
    ank = p("LeftFoot");
  const a = knee.clone().sub(hip),
    b = ank.clone().sub(knee);
  const flex = Math.round((a.angleTo(b) * 180) / Math.PI);
  // three Y up, character faces +Z
  const pitch = Math.round((Math.atan2(a.z, -a.y) * 180) / Math.PI);
  out.push([i, flex, pitch]);
}
const k = out.map((r) => r[1]),
  t = out.map((r) => r[2]);
const toeOff = out.reduce((m, r) => (r[2] < m[2] ? r : m));
console.log(
  process.argv[2].split("/").pop(),
  "kneeMax",
  Math.max(...k),
  "kneeMin",
  Math.min(...k),
  "thigh",
  Math.min(...t),
  "..",
  Math.max(...t),
  "kneeAtToeOff",
  toeOff[1],
);
