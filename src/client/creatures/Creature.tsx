// One animated creature (a zoo animal, a fish, later a pet): the species' GLB
// is loaded once (drei caches it), each instance gets its own skeleton clone
// and AnimationMixer, and the caller's `drive` callback says every frame where
// it stands and which clip to play. Clips crossfade. Far-off creatures, and
// all of them on the low tier, update their animation less often.
//
//   <Creature kind="alpaca" drive={(dt, pose) => { pose.x = ...; pose.clip = "walk"; }} />

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  creatureUrl,
  LENGTH,
  modelYaw,
  type Clip,
  type CreatureKind,
} from "../../game/creatures.ts";
import { useReducedMotion } from "../motion.ts";
import { useQuality } from "../world/quality.ts";

/** Where a creature stands, which way it faces and what it is doing. */
export type CreaturePose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  clip: Clip;
};

export const newPose = (): CreaturePose => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  clip: "idle",
});

const FADE = 0.3;
/** Animation updates only every n-th frame past these distances (meters). */
const FAR = { high: 22, low: 12 } as const;
const FAR_EVERY = 4;

/** The scale that makes a model's longest horizontal extent `length` meters,
 * and where to shift it so it stands centered on the ground. */
function fit(root: THREE.Object3D, length: number) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const k = length / Math.max(size.x, size.z, 1e-3);
  const c = box.getCenter(new THREE.Vector3());
  return { k, shift: new THREE.Vector3(-c.x * k, -box.min.y * k, -c.z * k) };
}

/** Stride speed (rad/s) of the sway that walks a model with no skeleton. */
const STRIDE = 7;

export function Creature({
  kind,
  drive,
  scale = 1,
}: {
  kind: CreatureKind;
  /** Called every frame (dt seconds) to fill in `pose`; no allocation. */
  drive: (dt: number, pose: CreaturePose) => void;
  /** Multiplies the kind's usual size. */
  scale?: number;
}): JSX.Element {
  const calm = useReducedMotion();
  const tier = useQuality();
  const gltf = useGLTF(creatureUrl(kind));
  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      // skinned bounds come from the bind pose; the walk leaves them
      o.frustumCulled = false;
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations)
      actions.set(clip.name, mixer.clipAction(clip));
    // measure the model standing in its idle pose, not the bind pose (the
    // bind pose can hold legs spread or raised, which floats the feet)
    const idle = actions.get("idle");
    if (idle) {
      idle.play();
      mixer.update(0);
      // bone matrices follow the posed bones, not the bind pose
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh) {
          o.skeleton.update();
          o.computeBoundingBox();
        }
      });
    }
    const { k, shift } = fit(root, LENGTH[kind]);
    mixer.stopAllAction();
    return { root, k, shift, mixer, actions };
  }, [gltf, kind]);
  useEffect(() => () => void rig.mixer.stopAllAction(), [rig]);

  const group = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const pose = useRef(newPose());
  const state = useRef({
    clip: "" as string,
    owed: 0,
    frame: 0,
    t: 0,
  });

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    const p = pose.current;
    drive(dt, p);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    const s = state.current;
    if (s.clip !== p.clip) {
      const next = rig.actions.get(p.clip) ?? rig.actions.get("idle");
      const prev = rig.actions.get(s.clip);
      if (next && next !== prev) {
        next.reset().play();
        if (prev) prev.crossFadeTo(next, FADE, false);
        else next.fadeIn(FADE);
      }
      s.clip = p.clip;
    }
    // posture: a sitting animal tips back, a sleeping one lies on its side,
    // and a model with no skeleton walks with a bob and roll and bows to graze
    const w = sway.current;
    if (w) {
      if (!calm) s.t += dt;
      // no walk clip of its own: sway it along instead
      const still = !rig.actions.has("walk");
      const walking = still && !calm && (p.clip === "walk" || p.clip === "run");
      const bow =
        still && (p.clip === "graze" || p.clip === "eat")
          ? rig.actions.size === 0
            ? 0.4
            : 0.12
          : 0;
      const k = Math.min(1, dt * 4);
      const sitting = p.clip === "sit";
      const stride = Math.sin(s.t * STRIDE);
      const lower = sitting ? -0.08 * LENGTH[kind] * scale : 0;
      w.rotation.x += ((sitting ? -0.55 : bow) - w.rotation.x) * k;
      w.rotation.z +=
        ((p.clip === "sleep" ? 1.4 : walking ? stride * 0.05 : 0) -
          w.rotation.z) *
        k;
      w.position.y +=
        (lower + (walking ? Math.abs(stride) * 0.05 : 0) - w.position.y) * k;
      if (still && !calm) w.scale.y = 1 + Math.sin(s.t * 2) * 0.012;
    }
    if (calm) return;
    // animate every frame near the camera, every n-th frame far away
    s.owed += dt;
    const far = camera.position.distanceToSquared(g.position) > FAR[tier] ** 2;
    if (far && ++s.frame % FAR_EVERY !== 0) return;
    rig.mixer.update(s.owed);
    s.owed = 0;
  });

  return (
    <group ref={group}>
      <group ref={sway} rotation-y={modelYaw(kind)}>
        <group position={rig.shift.clone().multiplyScalar(scale)}>
          <primitive object={rig.root} scale={rig.k * scale} />
        </group>
      </group>
    </group>
  );
}
