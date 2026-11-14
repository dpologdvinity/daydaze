// The doll's motion: Mixamo clips baked onto her full 52-bone skeleton
// (art/doll/blender/mocap.py writes public/models/doll/anims.glb, and
// anims-m.glb for the man's skeleton; the catalog is
// src/game/dance/mocap.ts). This module loads each doll's clip file once
// and drives the skeleton from the older 13-joint poses (pose.ts) for the
// moves that are still hand-made. HumanDoll plays it all with one
// AnimationMixer per doll.

import * as THREE from "three";
// three-stdlib's loader, the one drei's useGLTF already ships with the doll,
// not a second copy from three/examples
import { GLTFLoader, MeshoptDecoder } from "three-stdlib";
import type { MocapPack } from "../../../game/dance/mocapTypes.ts";
import type { Rig } from "../pose.ts";

/** Bone names as three.js reads them from the doll's GLB (glTF node names
 * lose their "mixamorig:" colon to PropertyBinding.sanitizeNodeName). */
export const BONE = {
  hips: "mixamorigHips",
  spine: "mixamorigSpine",
  spine2: "mixamorigSpine2",
  head: "mixamorigHead",
  pony: "pony",
} as const;

// clips by id, per doll skeleton ("" the woman's, "-m" the man's: each is
// baked on its own rig, since their bones rest on different axes). One map
// per skeleton gathers the clips of every pack loaded so far.
const baked = new Map<string, Map<string, THREE.AnimationClip>>();
const loading = new Map<string, Promise<void>>();
const loadedPacks = new Map<string, Set<MocapPack>>();

// seconds before a failed clip file may be fetched again, doubling per miss
const RETRY_FIRST = 15;
const RETRY_MOST = 300;
const retryIn = new Map<string, number>();

/** A pack's file for a skeleton: anims.glb for the core, else anims-<pack>.glb,
 * each with the man's "-m" after it (art/doll/blender/mocap.py). */
export const packFile = (suffix: string, pack: MocapPack): string =>
  `/models/doll/anims${pack === "core" ? "" : `-${pack}`}${suffix}.glb`;

/** Starts fetching one clip file of a skeleton (once; `suffix` as
 * modelSuffix); resolves when it has loaded. A failed fetch is logged and
 * retried after a wait that doubles each time (so a crowd of dolls asks
 * once, not once each), and the dolls keep their built poses (or an idle)
 * meanwhile. */
export function loadPack(suffix: string, pack: MocapPack): Promise<void> {
  const key = `${suffix}|${pack}`;
  let p = loading.get(key);
  if (!p) {
    p = new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder())
      .loadAsync(packFile(suffix, pack))
      .then((gltf) => {
        const clips =
          baked.get(suffix) ?? new Map<string, THREE.AnimationClip>();
        for (const c of gltf.animations) clips.set(c.name, c);
        baked.set(suffix, clips);
        const have = loadedPacks.get(suffix) ?? new Set<MocapPack>();
        have.add(pack);
        loadedPacks.set(suffix, have);
        retryIn.delete(key);
      })
      .catch((e: unknown) => {
        console.warn(e);
        const wait = retryIn.get(key) ?? RETRY_FIRST;
        retryIn.set(key, Math.min(RETRY_MOST, wait * 2));
        window.setTimeout(() => loading.delete(key), wait * 1000);
      });
    loading.set(key, p);
  }
  return p;
}

/** Starts fetching a skeleton's core clip file (see loadPack). */
export const loadAnims = (suffix = ""): Promise<void> =>
  loadPack(suffix, "core");

const NO_PACKS: ReadonlySet<MocapPack> = new Set();

/** The packs of a skeleton loaded so far. */
export const packsFor = (suffix: string): ReadonlySet<MocapPack> =>
  loadedPacks.get(suffix) ?? NO_PACKS;

/** A skeleton's clips by id (every pack loaded so far); null until its core
 * file loads. */
export const clipsFor = (
  suffix: string,
): ReadonlyMap<string, THREE.AnimationClip> | null => baked.get(suffix) ?? null;

// ---------------------------------------------------------------- built poses

/** Which 13-joint pose group drives each bone (by its name without the
 * mixamorig prefix). The old rig's bones all rested at identity in model
 * space, on this same arms-down rest shape, so a group's model-space turn
 * applied over a bone's rest reproduces the built pose. */
const DRIVER: Record<string, keyof Rig> = {
  Hips: "body",
  Spine: "body",
  Spine1: "body",
  Spine2: "body",
  LeftShoulder: "body",
  RightShoulder: "body",
  Neck: "head",
  Head: "head",
  lEye: "head",
  rEye: "head",
  pony: "pony",
};
for (const [s, S] of [
  ["l", "Left"],
  ["r", "Right"],
] as const) {
  DRIVER[`${S}Arm`] = `${s}Arm`;
  DRIVER[`${S}ForeArm`] = `${s}Fore`;
  DRIVER[`${S}Hand`] = `${s}Fore`;
  DRIVER[`${S}UpLeg`] = `${s}Leg`;
  DRIVER[`${S}Leg`] = `${s}Shin`;
  DRIVER[`${S}Foot`] = `${s}Foot`;
  DRIVER[`${S}ToeBase`] = `${s}Foot`;
}

/** The group a bone follows: fingers ride the hand's. */
function driverOf(name: string): keyof Rig | undefined {
  const bare = name.replace(/^mixamorig/, "");
  return (
    DRIVER[bare] ??
    (/Hand\D+\d$/.test(bare)
      ? DRIVER[bare.replace(/Hand\D+\d$/, "Hand")]
      : undefined)
  );
}

/** Old joints, parent first, each with its parent (the body is the root). */
const CHAIN: readonly (readonly [keyof Rig, keyof Rig | null])[] = [
  ["body", null],
  ["head", "body"],
  ["pony", "head"],
  ["lArm", "body"],
  ["lFore", "lArm"],
  ["rArm", "body"],
  ["rFore", "rArm"],
  ["lLeg", "body"],
  ["lShin", "lLeg"],
  ["lFoot", "lShin"],
  ["rLeg", "body"],
  ["rShin", "rLeg"],
  ["rFoot", "rShin"],
];

/**
 * Drives a doll's skeleton from the 13 pose groups pose.ts writes, for the
 * built moves (hand-made dances, poses for two, the hip-pop), and blends
 * that over whatever the mixer left on the bones by `weight` (0..1).
 * Allocates nothing per frame.
 */
export class BuiltPose {
  private readonly bones: THREE.Bone[] = [];
  private readonly driver: (keyof Rig)[] = [];
  /** Each bone's parent's index in `bones`, or -1 for the hips. */
  private readonly parent: number[] = [];
  private readonly restModel: THREE.Quaternion[] = [];
  private readonly world: THREE.Quaternion[] = [];
  private readonly old = new Map<keyof Rig, THREE.Quaternion>();
  private readonly target = new THREE.Quaternion();
  private readonly hips: THREE.Bone | null;
  private readonly hipsRest = new THREE.Vector3();
  private readonly hipsParentInv = new THREE.Matrix4();
  private readonly hipsAt = new THREE.Vector3();
  private readonly rootInv = new THREE.Quaternion();
  /** The rig node's model-space rotation (the hips' parent). */
  private readonly hipsParentQ = new THREE.Quaternion();

  /** `bones`: the doll's bones by name, at rest; `root` the model root. */
  constructor(bones: ReadonlyMap<string, THREE.Bone>, root: THREE.Object3D) {
    root.updateMatrixWorld(true);
    const rootQ = new THREE.Quaternion();
    root.getWorldQuaternion(rootQ);
    this.rootInv.copy(rootQ).invert();
    const order: THREE.Bone[] = [];
    const hips = bones.get(BONE.hips) ?? null;
    hips?.traverse((o) => {
      if (o instanceof THREE.Bone && driverOf(o.name)) order.push(o);
    });
    for (const b of order) {
      const d = driverOf(b.name);
      if (!d) continue;
      this.bones.push(b);
      this.driver.push(d);
      this.parent.push(b.parent ? order.indexOf(b.parent as THREE.Bone) : -1);
      const q = new THREE.Quaternion();
      b.getWorldQuaternion(q).premultiply(this.rootInv);
      this.restModel.push(q);
      this.world.push(new THREE.Quaternion());
      this.kept.push(new THREE.Quaternion());
    }
    for (const [j] of CHAIN) this.old.set(j, new THREE.Quaternion());
    this.hips = hips;
    if (hips?.parent) {
      hips.parent
        .getWorldQuaternion(this.hipsParentQ)
        .premultiply(this.rootInv);
      hips.getWorldPosition(this.hipsRest);
      this.hipsRest.applyMatrix4(root.matrixWorld.clone().invert());
      this.hipsParentInv
        .copy(root.matrixWorld)
        .invert()
        .multiply(hips.parent.matrixWorld)
        .invert();
    }
  }

  private readonly kept: THREE.Quaternion[] = [];
  private readonly keptHips = new THREE.Vector3();
  private dirty = false;

  /**
   * The mixer writes a bone only when the clip's value changes, so a blend
   * left on the bones would stick under a held pose. Call before each mixer
   * update: puts back what the mixer last wrote, if apply() blended over it.
   */
  restore() {
    if (!this.dirty) return;
    this.dirty = false;
    for (let i = 0; i < this.bones.length; i++)
      this.bones[i].quaternion.copy(this.kept[i]);
    this.hips?.position.copy(this.keptHips);
  }

  /** Poses the bones from the groups in `rig`, `weight` of the way, over
   * what the mixer left (kept, for restore()). */
  apply(rig: Rig, weight: number) {
    if (weight <= 0) return;
    for (let i = 0; i < this.bones.length; i++)
      this.kept[i].copy(this.bones[i].quaternion);
    if (this.hips) this.keptHips.copy(this.hips.position);
    this.dirty = true;
    for (const [j, p] of CHAIN) {
      const g = rig[j];
      const q = this.old.get(j);
      if (!q) continue;
      if (g) q.copy(g.quaternion);
      else q.identity();
      const pq = p ? this.old.get(p) : undefined;
      if (pq) q.premultiply(pq);
    }
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      const w = this.world[i];
      w.copy(this.old.get(this.driver[i]) ?? this.target.identity()).multiply(
        this.restModel[i],
      );
      const p = this.parent[i];
      // local = parent's model-space turn^-1 x this bone's
      if (p >= 0) this.target.copy(this.world[p]).invert().multiply(w);
      // the hips' parent, the rig node, never moves
      else this.target.copy(this.hipsParentQ).invert().multiply(w);
      if (weight >= 1) bone.quaternion.copy(this.target);
      else bone.quaternion.slerp(this.target, weight);
    }
    // the old body pivoted on the floor point and moved by its offset
    const body = rig.body;
    if (this.hips && body) {
      this.hipsAt
        .copy(this.hipsRest)
        .applyQuaternion(this.old.get("body") ?? this.target.identity())
        .add(body.position)
        .applyMatrix4(this.hipsParentInv);
      this.hips.position.lerp(this.hipsAt, weight);
    }
  }
}
