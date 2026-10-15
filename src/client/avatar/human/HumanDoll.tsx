import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { couplePoseAt, type CoupleRole } from "../../../game/dance/couple.ts";
import {
  createPose,
  danceMove,
  poseAt,
  type DanceMoveId,
  type Pose,
} from "../../../game/dance/moves.ts";
import type { Look, Mood, SwimLook } from "../../../game/look.ts";
import { liveDrunk } from "../../effects/drunk.ts";
import { useReducedMotion } from "../../motion.ts";
import { pose, type Rig } from "../pose.ts";
import { paintFace, paintIris, paintLashes, readMarks } from "./faceCanvas.ts";

/**
 * The 3D doll: a skinned, shape-keyed body built in Blender from MakeHuman's
 * CC0 base (art/doll/blender/), with hair and clothes as separate models on
 * the same rig, loaded only when worn. Poses come from the same pose code as
 * the old doll: it poses plain groups, and their transforms are copied onto
 * the bones each frame.
 */

const MODELS = "/models/doll";
const JOINTS = [
  "body",
  "head",
  "lArm",
  "lFore",
  "rArm",
  "rFore",
  "lLeg",
  "lShin",
  "rLeg",
  "rShin",
  "lFoot",
  "rFoot",
  "pony",
] as const;

export type WalkState = { speed: number };

type Props = {
  look: Look;
  swim?: SwimLook | null;
  mood: Mood;
  dance?: DanceMoveId;
  couple?: CoupleRole;
  buzzed?: boolean;
  walk?: { current: WalkState };
  seed?: number;
} & Omit<ThreeElements["group"], "children">;

/** The part files a look wears, by kind. */
export function partsFor(look: Look, swim: SwimLook | null) {
  return {
    hair: `${MODELS}/hair-${look.hairStyle}.glb`,
    outfit: swim
      ? `${MODELS}/swim-${swim.style}.glb`
      : `${MODELS}/outfit-${look.outfit}.glb`,
    shoes: swim ? null : `${MODELS}/shoes-sneakers.glb`,
    tuck: swim ? `tuck_${swim.style}` : `tuck_${look.outfit}`,
  };
}

const morphMeshes = (root: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.morphTargetDictionary) out.push(o);
  });
  return out;
};

function setMorph(meshes: THREE.Mesh[], name: string, value: number) {
  for (const m of meshes) {
    const i = m.morphTargetDictionary?.[name];
    if (i !== undefined && m.morphTargetInfluences)
      m.morphTargetInfluences[i] = value;
  }
}

function useBody(look: Look) {
  const gltf = useGLTF(`${MODELS}/body.glb`);
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    const bones = new Map<string, THREE.Bone>();
    scene.traverse((o) => {
      if (o instanceof THREE.Bone) bones.set(o.name, o);
    });
    const rest = new Map<string, THREE.Vector3>();
    for (const [name, bone] of bones) rest.set(name, bone.position.clone());
    let meta: unknown = null;
    scene.traverse((o) => {
      if (typeof o.userData.doll === "string") meta = o.userData.doll;
    });
    // a little self-glow from the skin's own texture softens harsh room
    // lighting into the dewy glam finish
    const skin = new THREE.MeshStandardMaterial({
      roughness: 0.42,
      emissive: "#ffffff",
      emissiveIntensity: 0.14,
    });
    const lashes = new THREE.MeshStandardMaterial({
      color: "#0d0609",
      map: paintLashes(),
      alphaTest: 0.4,
      side: THREE.DoubleSide,
    });
    const eye = new THREE.MeshStandardMaterial({
      map: paintIris(),
      roughness: 0.3,
    });
    const cornea = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.frustumCulled = false;
      const name = o.material instanceof THREE.Material ? o.material.name : "";
      o.material =
        name === "lashes"
          ? lashes
          : name === "eye"
            ? eye
            : name === "cornea"
              ? cornea
              : skin;
    });
    return {
      scene,
      bones,
      rest,
      marks: readMarks(meta),
      skin,
      materials: [skin, lashes, eye, cornea],
    };
  }, [gltf]);

  useEffect(
    () => () => {
      for (const m of body.materials) {
        if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose();
        m.dispose();
      }
    },
    [body],
  );

  useEffect(() => {
    const { marks, skin } = body;
    // plain skin until the painted face arrives, then the texture tints both
    skin.color.set(look.skin);
    skin.emissive.set(look.skin);
    if (!marks) return;
    let live = true;
    let tex: THREE.Texture | null = null;
    paintFace(look, marks)
      .then((t) => {
        if (!live) return t.dispose();
        tex = t;
        skin.color.set("#ffffff");
        skin.emissive.set("#ffffff");
        skin.map = t;
        skin.emissiveMap = t;
        skin.needsUpdate = true;
        invalidate();
      })
      // a missing mask leaves plain skin rather than breaking the room
      .catch((e: unknown) => console.warn(e));
    return () => {
      live = false;
      tex?.dispose();
    };
  }, [body, look.skin, look.lips, look.brows, look.shadow, invalidate]);
  return body;
}

type Tint = { colour: string; kind: "hair" | "cloth" | "keep" };

/** A worn part, re-bound to the body's bones and tinted. */
function Part({
  url,
  bones,
  tint,
  onMeshes,
}: {
  url: string;
  bones: Map<string, THREE.Bone>;
  tint: Tint;
  onMeshes: (meshes: THREE.Mesh[] | null) => void;
}) {
  const gltf = useGLTF(url);
  const part = useMemo(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) meshes.push(o);
    });
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    for (const src of meshes) {
      const mesh = src.clone();
      const skeleton = new THREE.Skeleton(
        src.skeleton.bones.map((b) => bones.get(b.name) ?? b),
        src.skeleton.boneInverses,
      );
      mesh.bind(skeleton, src.bindMatrix);
      // exports can carry non-zero default weights; the doll sets its own
      mesh.morphTargetInfluences?.fill(0);
      mesh.frustumCulled = false;
      const old =
        src.material instanceof THREE.MeshStandardMaterial
          ? src.material
          : null;
      const mat = new THREE.MeshStandardMaterial({
        map: old?.map ?? null,
        color: tint.kind === "keep" ? "#ffffff" : tint.colour,
        roughness: tint.kind === "hair" ? 0.45 : 0.7,
        side: tint.kind === "hair" ? THREE.DoubleSide : THREE.FrontSide,
        alphaTest: tint.kind === "hair" ? 0.35 : 0,
      });
      materials.push(mat);
      mesh.material = mat;
      group.add(mesh);
    }
    return { group, materials };
  }, [gltf, bones, tint.colour, tint.kind]);

  useEffect(() => {
    onMeshes(morphMeshes(part.group));
    return () => {
      onMeshes(null);
      part.materials.forEach((m) => m.dispose());
    };
  }, [part, onMeshes]);
  return <primitive object={part.group} />;
}

export function HumanDoll({
  look,
  swim = null,
  mood,
  dance = "two-step",
  couple,
  buzzed = false,
  walk,
  seed = 0,
  ...rest
}: Props) {
  const body = useBody(look);
  const parts = partsFor(look, swim);
  const calm = useReducedMotion();
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);
  const sampled = useMemo<Pose>(createPose, []);
  // the pose code writes plain groups; their transforms go onto the bones
  const proxy = useMemo(() => {
    const rig: Rig = {};
    for (const j of JOINTS) rig[j] = new THREE.Group();
    return rig;
  }, []);
  const bodyMeshes = useMemo(() => morphMeshes(body.scene), [body]);
  const worn = useRef(new Map<string, THREE.Mesh[]>());
  const wornList = useRef<THREE.Mesh[]>([]);
  const track = useMemo(() => {
    const make = (key: string) => (meshes: THREE.Mesh[] | null) => {
      if (meshes) worn.current.set(key, meshes);
      else worn.current.delete(key);
      wornList.current = [...bodyMeshes, ...[...worn.current.values()].flat()];
    };
    return { hair: make("hair"), outfit: make("outfit"), shoes: make("shoes") };
  }, [bodyMeshes]);

  useEffect(() => {
    wornList.current = [...bodyMeshes, ...[...worn.current.values()].flat()];
    for (const m of bodyMeshes) {
      const dict = m.morphTargetDictionary ?? {};
      for (const name of Object.keys(dict))
        if (name.startsWith("tuck_"))
          setMorph([m], name, name === parts.tuck ? 1 : 0);
    }
  }, [bodyMeshes, parts.tuck]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed * 7.3;
    const speed = walk?.current.speed ?? 0;
    const moving = speed > 0.05;
    phase.current += dt * speed * 6.2;
    const move = mood === "dance" && !moving ? danceMove(dance) : null;
    const danced = !move
      ? null
      : couple
        ? couplePoseAt(move, couple, t, sampled)
        : poseAt(move, t, sampled);
    pose(
      proxy,
      moving ? "walk" : mood,
      t,
      phase.current,
      calm,
      danced,
      buzzed ? liveDrunk.wobble : 0,
    );
    for (const j of JOINTS) {
      const g = proxy[j];
      const bone = body.bones.get(j);
      const r = body.rest.get(j);
      if (!g || !bone || !r) continue;
      bone.quaternion.copy(g.quaternion);
      bone.position.copy(r).add(g.position);
      bone.scale.copy(g.scale);
    }
    // blink and a faint smile, on every mesh that carries the keys
    const tm = state.clock.elapsedTime;
    const closed = tm > blinkAt.current && tm < blinkAt.current + 0.14;
    setMorph(wornList.current, "blink", closed ? 1 : 0);
    if (tm > blinkAt.current + 0.14)
      blinkAt.current = tm + 2.2 + ((seed * 13.7 + tm) % 3.1);
  });

  return (
    <group {...rest}>
      <primitive object={body.scene} />
      <Suspense fallback={null}>
        <Part
          key={parts.hair}
          url={parts.hair}
          bones={body.bones}
          tint={{ colour: look.hairColor, kind: "hair" }}
          onMeshes={track.hair}
        />
      </Suspense>
      <Suspense fallback={null}>
        <Part
          key={parts.outfit}
          url={parts.outfit}
          bones={body.bones}
          tint={{ colour: swim?.color ?? look.outfitColor, kind: "cloth" }}
          onMeshes={track.outfit}
        />
      </Suspense>
      {parts.shoes && (
        <Suspense fallback={null}>
          <Part
            key={parts.shoes}
            url={parts.shoes}
            bones={body.bones}
            tint={{ colour: "#ffffff", kind: "keep" }}
            onMeshes={track.shoes}
          />
        </Suspense>
      )}
    </group>
  );
}

// every doll needs the body, so start fetching it with the code
useGLTF.preload(`${MODELS}/body.glb`);
