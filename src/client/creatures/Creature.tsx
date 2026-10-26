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

/** The scale that makes a model's longest horizontal extent `length` meters. */
function fitScale(root: THREE.Object3D, length: number): number {
  root.updateMatrixWorld(true);
  const size = new THREE.Box3()
    .setFromObject(root)
    .getSize(new THREE.Vector3());
  return length / Math.max(size.x, size.z, 1e-3);
}

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
    const fit = fitScale(root, LENGTH[kind]);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations)
      actions.set(clip.name, mixer.clipAction(clip));
    return { root, fit, mixer, actions };
  }, [gltf, kind]);
  useEffect(() => () => void rig.mixer.stopAllAction(), [rig]);

  const group = useRef<THREE.Group>(null);
  const pose = useRef(newPose());
  const state = useRef({
    clip: "" as string,
    owed: 0,
    frame: 0,
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
      <primitive
        object={rig.root}
        scale={rig.fit * scale}
        rotation-y={modelYaw(kind)}
      />
    </group>
  );
}
