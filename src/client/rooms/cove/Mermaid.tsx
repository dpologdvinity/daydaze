// Animated, independently posed copies of the cove's downloaded mermaid
// (charliecatling's CC-BY "mermaid", rebuilt by art/cove/build_mermaid.py).
// The model is in meters and faces -z; her clips are "sit" (lounging, tail
// out in front, on the ground at y 0), "swim" (prone, in place, upper
// chest at (0, 1.45, -0.6)) and "idle" (upright, treading water, waist at
// (0, 1.2, 0)).
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  SINGER_SPOT,
  SWIM_LOOPS,
  swimPose,
  WATER_Y,
} from "../../../game/mermaidCove.ts";
import { useReducedMotion } from "../../motion.ts";
import { useQuality } from "../../world/quality.ts";
import { siren } from "./session.ts";

const URL = "/models/cove/mermaid.glb";
/** A touch over life size, so her upper body matches the player's. */
const SCALE = 1.1;
/** Shifts the lounging pose (tail to z -2.1, hand to +0.5) onto the rock's middle. */
const SIT_SHIFT = 0.8 * SCALE;
/** The points that sit on the waterline: her upper chest as she swims, her
 * waist as she sings. */
const SWIM_PIVOT = [1.45 * SCALE, -0.6 * SCALE] as const;
const SING_PIVOT = [1.2 * SCALE, 0] as const;
/** Nose up while she swims (radians), so her head is out and her tail under. */
const SWIM_PITCH = 0.35;
/** Seconds to glide between her loop and the singing spot. */
const GLIDE = 1.8;

const smooth = (k: number) => k * k * (3 - 2 * k);
/** The shortest turn from angle a to b. */
const turn = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * One mermaid. Without `loop` she lounges on a rock at her parent's origin,
 * tail along her parent's -z. With `loop` she swims that loop of
 * SWIM_LOOPS at the waterline; the `singer` leaves it during Siren Song to
 * rise in the shallows before the shells, facing the beach, and sing.
 */
export function Mermaid({
  tint,
  loop,
  singer = false,
}: {
  tint: string;
  loop?: number;
  singer?: boolean;
}) {
  const gltf = useGLTF(URL);
  const calm = useReducedMotion();
  const tier = useQuality();
  const group = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const state = useRef({
    time: 0,
    clip: "",
    shown: "",
    owed: 0,
    frame: 0,
    sing: 0,
  });
  const rig = useMemo(() => {
    // SkeletonUtils' clone rebinds each copy's skin to its own bones
    const root = clone(gltf.scene);
    const materials: THREE.Material[] = [];
    root.traverse((node) => {
      // the skinned bounds are the rest pose's, not the animated one's
      node.frustumCulled = false;
      if (node instanceof THREE.Mesh) {
        const recolor = (material: THREE.Material) => {
          const copy = material.clone();
          if (copy instanceof THREE.MeshStandardMaterial)
            copy.color.multiply(new THREE.Color(tint));
          materials.push(copy);
          return copy;
        };
        node.material = Array.isArray(node.material)
          ? node.material.map(recolor)
          : recolor(node.material);
      }
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map(
      gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    return { root, mixer, actions, materials };
  }, [gltf, tint]);
  useEffect(() => {
    // (re)start the clip on the next frame. A remount (StrictMode runs every
    // effect twice in development, after the first frame has drawn) follows
    // the cleanup's stopAllAction, which puts the bones back in the rest
    // pose, the T-pose.
    state.current.clip = "";
    return () => {
      rig.mixer.stopAllAction();
      rig.materials.forEach((material) => material.dispose());
      rig.root.traverse((node) => {
        if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
      });
    };
  }, [rig]);
  useFrame(({ gl }, dt) => {
    const s = state.current;
    const phase = siren.get().phase;
    const singing = singer && (phase === "listen" || phase === "sing");
    const glide = calm ? 1 : dt / GLIDE;
    s.sing = singing
      ? Math.min(1, s.sing + glide)
      : Math.max(0, s.sing - glide);
    const want = loop === undefined ? "sit" : s.sing > 0.6 ? "idle" : "swim";
    if (s.clip !== want) {
      const next = rig.actions.get(want);
      const previous = rig.actions.get(s.clip);
      if (next) {
        next.reset().play();
        if (previous && !calm) previous.crossFadeTo(next, 0.6, false);
        else if (previous) previous.stop();
        rig.mixer.update(0);
      }
      s.clip = want;
    }
    // for the browser tests: the singer's clip, while it really plays
    const playing = rig.actions.get(s.clip)?.isRunning() ? s.clip : "none";
    if (singer && s.shown !== playing) {
      s.shown = playing;
      gl.domElement.dataset.singer = playing;
    }
    if (!calm) {
      s.time += dt;
      s.owed += dt;
      if (tier !== "low" || ++s.frame % 4 === 0) {
        rig.mixer.update(s.owed);
        s.owed = 0;
      }
    }
    const path = loop === undefined ? undefined : SWIM_LOOPS[loop];
    const g = group.current;
    if (!path || !g || !tilt.current || !body.current) return;
    const at = swimPose(path, s.time);
    const k = smooth(s.sing);
    g.position.set(
      at.x + (SINGER_SPOT[0] - at.x) * k,
      WATER_Y,
      at.z + (SINGER_SPOT[1] - at.z) * k,
    );
    // facing +z, the beach, is a yaw of pi
    g.rotation.y = at.yaw + turn(at.yaw, Math.PI) * k;
    // turn about the point on the waterline, which slides from her chest to
    // her waist as she rises to sing
    tilt.current.rotation.x = SWIM_PITCH * (1 - k);
    // the ripples run long round a swimmer, round about a singer's waist
    if (ripple.current) ripple.current.scale.y = 1.6 - 0.6 * k;
    body.current.position.set(
      0,
      -(SWIM_PIVOT[0] + (SING_PIVOT[0] - SWIM_PIVOT[0]) * k),
      -(SWIM_PIVOT[1] + (SING_PIVOT[1] - SWIM_PIVOT[1]) * k),
    );
  });
  return (
    <group ref={group}>
      {loop !== undefined && (
        // a ring of ripples where she breaks the surface
        <mesh ref={ripple} position-y={0.01} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.36, 0.46, 24]} />
          <meshBasicMaterial color="#bff8ff" transparent opacity={0.35} />
        </mesh>
      )}
      <group ref={tilt}>
        <group
          ref={body}
          scale={SCALE}
          position-z={loop === undefined ? SIT_SHIFT : 0}
        >
          <primitive object={rig.root} />
        </group>
      </group>
    </group>
  );
}
