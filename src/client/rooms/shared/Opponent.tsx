// One Paintball or Laser Tag opponent: Quaternius' Universal Base Characters
// (CC0), dressed in a team jersey, pants, shoes and helmet cut from the body
// (art/opponents/build_opponents.py), holding a pistol and animated with the
// Universal Animation Library's own clips (opponent-clips.glb: same skeleton,
// nothing retargeted).
//
// Everything heavy is shared: drei caches each GLB, the skin JPEGs are cached,
// and a figure costs one skeleton clone, one mixer and four team materials.
// The caller's `drive` callback fills in where she stands and what the rival AI
// says about her (game/opponents.ts turns that into a clip) every frame; no
// allocation inside useFrame.
//
//   <Opponent look={...} drive={(dt, pose) => { pose.x = ...; }} />

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX, type ReactNode } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  getUpSeconds,
  opponentClip,
  type OpponentSense,
} from "../../../game/opponents.ts";
import { useQuality } from "../../world/quality.ts";

const DIR = "/models/opponents";
const CLIPS_URL = `${DIR}/opponent-clips.glb`;

export type OpponentLook = {
  sex: "f" | "m";
  tone: "light" | "dark";
  /** The team color: jersey and helmet, and the vest's glow. */
  team: string;
  /** The vest lights up (laser tag) rather than staying plain cloth. */
  glow: boolean;
  /** The pistol's tint: a plain color on paintball's marker, the team's glow. */
  gun: string;
};

/** Where she stands and what is happening to her, set by the caller. */
export type OpponentPose = {
  x: number;
  z: number;
  yaw: number;
  sense: OpponentSense;
  /** Vest brightness (0 off, 1 lit). */
  glow: number;
};

export const newOpponentPose = (): OpponentPose => ({
  x: 0,
  z: 0,
  yaw: 0,
  glow: 1,
  sense: {
    playing: false,
    down: false,
    sinceTag: Infinity,
    untilUp: 0,
    moving: false,
    open: false,
    sinceShot: Infinity,
  },
});

/** Crossfade between clips, seconds. */
const FADE = 0.15;
/** How long the pistol's muzzle brightens after a shot, seconds. */
const FLASH = 0.09;
/** The pack's shoes are black and its pants dark: only the jersey, helmet and
 * vest take the team color. */
const VEST_DARK = 0.18;
/** The laser tag readability boost: jersey brightness, its self-light (a share
 * of the team color) and the skin's self-light. */
const READABLE_BOOST = 1.5;
const READABLE_GLOW = 0.22;
const READABLE_SKIN = "#5a4036";

function skinUrl(look: OpponentLook) {
  return `${DIR}/skin-${look.sex}-${look.tone}.jpg`;
}

/** Each material of the clone replaced by this figure's own copy, so the
 * team color doesn't spill onto the others, and the meshes by node name. */
function dress(root: THREE.Object3D, look: OpponentLook, skin: THREE.Texture) {
  const parts = {
    cloth: undefined as THREE.MeshStandardMaterial | undefined,
    vest: undefined as THREE.MeshStandardMaterial | undefined,
    gun: undefined as THREE.MeshStandardMaterial | undefined,
  };
  const owned: THREE.Material[] = [];
  root.traverse((o) => {
    o.frustumCulled = false;
    if (!(o instanceof THREE.SkinnedMesh)) return;
    const own = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0,
    });
    const old = o.material;
    if (old instanceof THREE.MeshStandardMaterial && o.name === "Eyes") {
      // the pack's eyes keep their own texture
      own.map = old.map;
    }
    switch (o.name) {
      case "Body":
        own.map = skin;
        own.roughness = 0.62;
        // a black-lit arena: the skin gets a faint self-light of its own
        // tone (the map), so a rival reads against the dark with no extra light
        if (look.glow) {
          own.emissive.set(READABLE_SKIN);
          own.emissiveMap = skin;
        }
        break;
      case "Cloth":
        own.vertexColors = true;
        own.color.set(look.team);
        own.roughness = 0.85;
        // neon team colors: a brighter jersey that lights itself a little (the
        // emissive is not scaled by the vertex colors, so the dark pants glow
        // dimly too); plain cloth on the lit paintball field
        if (look.glow) {
          own.color.multiplyScalar(READABLE_BOOST);
          own.emissive.set(look.team).multiplyScalar(READABLE_GLOW);
        }
        parts.cloth = own;
        break;
      case "Vest":
        own.color.set(look.team).multiplyScalar(VEST_DARK);
        own.emissive.set(look.team);
        own.roughness = 0.5;
        parts.vest = own;
        break;
      case "Gun":
        own.map = old instanceof THREE.MeshStandardMaterial ? old.map : null;
        own.color.set(look.gun);
        own.emissive.set(look.gun);
        own.emissiveIntensity = look.glow ? 0.6 : 0.05;
        own.metalness = 0.3;
        own.roughness = 0.5;
        parts.gun = own;
        break;
      default:
        break;
    }
    o.material = own;
    owned.push(own);
  });
  return { ...parts, owned };
}

export function Opponent({
  look,
  drive,
  children,
}: {
  look: OpponentLook;
  /** Called every frame (dt seconds) to fill in `pose`; no allocation. */
  drive: (dt: number, pose: OpponentPose) => void;
  /** Rides along with her (a tap target). */
  children?: ReactNode;
}): JSX.Element {
  const tier = useQuality();
  const gltf = useGLTF(
    `${DIR}/opponent-${look.sex}${tier === "low" ? "-lo" : ""}.glb`,
  );
  const clips = useGLTF(CLIPS_URL);
  const skin = useTexture(skinUrl(look), (t) => {
    // glTF UVs are not flipped
    for (const tex of [t].flat()) {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    }
  });
  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    const mats = dress(root, look, skin);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of clips.animations)
      actions.set(clip.name, mixer.clipAction(clip));
    return { root, mixer, actions, ...mats };
  }, [gltf, clips, look, skin]);
  useEffect(
    () => () => {
      rig.mixer.stopAllAction();
      rig.root.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      });
      // the eyes' texture and the skin belong to the cache, the materials to us
      for (const m of rig.owned) m.dispose();
    },
    [rig],
  );

  const group = useRef<THREE.Group>(null);
  const pose = useRef(newOpponentPose());
  const state = useRef({ key: "", clip: "" });

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = pose.current;
    drive(dt, p);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.yaw;
    const plan = opponentClip(p.sense);
    const s = state.current;
    if (plan.key !== s.key) {
      const next = rig.actions.get(plan.clip);
      const prev = rig.actions.get(s.clip);
      if (next) {
        next.reset();
        next.setLoop(plan.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        next.clampWhenFinished = !plan.loop;
        const length = next.getClip().duration;
        // backward: from the last pose to the first, over the get-up time
        next.timeScale = plan.reverse ? -length / getUpSeconds : 1;
        if (plan.reverse) next.time = length;
        next.play();
        if (prev && prev !== next) prev.crossFadeTo(next, FADE, false);
        // the first clip is in at full weight, so she never shows the bind pose
        else next.setEffectiveWeight(1);
      }
      s.key = plan.key;
      s.clip = plan.clip;
    }
    rig.mixer.update(dt);
    // the vest glows with the rival's state; the pistol's muzzle with a shot
    const vest = rig.vest;
    if (vest) {
      vest.emissiveIntensity = look.glow ? p.glow * 2.2 : 0;
    }
    const gun = rig.gun;
    if (gun) {
      const flash = p.sense.sinceShot < FLASH ? 1 : 0;
      gun.emissiveIntensity = (look.glow ? 0.6 : 0.05) + flash * 3;
    }
  });

  return (
    <group ref={group}>
      <primitive object={rig.root} />
      {children}
    </group>
  );
}
