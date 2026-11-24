// The 3D human doll: loads the skinned glTF body, then drives its clips, face
// makeup, shoes, piercings and prosthetics from a `Look` and the current mood.
import { useGLTF, useTexture } from "@react-three/drei";
import { afterSceneReady } from "../../world/ready.ts";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { HIDDEN_BONES, Prosthetics } from "./Prosthetics.tsx";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { couplePoseAt, type CoupleRole } from "../../../game/dance/couple.ts";
import { pairNow } from "../pairClock.ts";
import {
  applyReach,
  faceDepth,
  faceHeight,
  leanIn,
  reachFor,
} from "../../../game/dance/reach.ts";
import {
  stillClipsOf,
  createPose,
  danceMove,
  eyesShut,
  poseAt,
  type DanceMoveId,
  type Pose,
} from "../../../game/dance/moves.ts";
import {
  MAN_STRIDE,
  MOVING,
  clipOf,
  pickClip,
  type Play,
} from "../../../game/dance/clips.ts";
import {
  modelSuffix,
  limbsOf,
  LIMB_SPOTS,
  faceOf,
  seededFace,
  piercingsOf,
  seededMakeup,
  encodeMakeup,
  type Face,
  makeupOf,
  type Look,
  shoesOf,
  SHOES,
  type Mood,
  type SwimLook,
} from "../../../game/look.ts";
import { SLOTS, wearOf } from "../../../game/wardrobe.ts";
import { getBuzz, getHangover, liveDrunk } from "../../effects/drunk.ts";
import { getMeters } from "../../effects/high.ts";
import { ADULT_OK } from "../../adult.ts";
import {
  heavyLid,
  jawClench,
  peakBody,
  pupilDilation,
  redEyes,
  type Substance,
} from "../../../game/effects/substances.ts";
import { bodyFor } from "../../../game/effects/buzz.ts";
import { useReducedMotion } from "../../motion.ts";
import {
  DEFAULT_BODY,
  bodyScales,
  dollShapeKeys,
  type BodyShape,
} from "../../../game/body.ts";
import { pose, type Rig } from "../pose.ts";
import { useGraphics, useQuality } from "../../world/quality.ts";
import { NPC_GAITS, gaitOf } from "../../../game/gaits.ts";
import { BUILT_STRIDE, walkPhaseRate } from "../../../game/dance/stride.ts";
import { syncOffset } from "../../../game/dance/sync.ts";
import { danceClock } from "../danceClock.ts";
import {
  BONE,
  BuiltPose,
  clipsFor,
  loadAnims,
  loadPack,
  packsFor,
} from "./anims.ts";
import { IDLE_SLOT_SECONDS, idleSlot } from "../../../game/dance/idlePlan.ts";
import { gazeTurn, portraitAmount } from "../../../game/cameraZoom.ts";
import {
  pickTransition,
  postureOf,
  type Posture,
} from "../../../game/dance/transitions.ts";
import { TIME_SCALE } from "../../timeScale.ts";
import {
  createLoco,
  stepLoco,
  type Loco,
} from "../../../game/dance/locomotion.ts";
import { afloat, scuba } from "./afloat.ts";
import { ScubaGear } from "./ScubaGear.tsx";

import {
  acquireFace,
  acquireIris,
  IRIS_R,
  PUPIL_R,
  readMarks,
  releaseFace,
  releaseIris,
  sharedLashes,
} from "./faceCanvas.ts";
import { Jewelry, readAnchors } from "./Jewelry.tsx";
import { Glasses } from "./Glasses.tsx";
import { HearingAids } from "./HearingAids.tsx";
import { isBone, isMesh, isSkinnedMesh } from "../../world/guards.ts";
import { setData } from "../../world/dataset.ts";
import { isDollReady } from "./dollReady.ts";
import { ATLAS, atlasCols, atlasRect, mergeGarments } from "./mergeGarments.ts";
import { RefCache } from "./refCache.ts";

/**
 * The 3D doll: a skinned, shape-keyed body built in Blender from MakeHuman's
 * CC0 base (art/doll/blender/), with hair and clothes as separate models on
 * the same Mixamo skeleton, loaded only when worn. She moves by Mixamo clips
 * baked onto that skeleton (anims.ts), played with one AnimationMixer:
 * crossfades between idle, walk, dance and held poses, the walk's rate
 * matched to the ground (clips.ts picks). The hand-made moves (pose.ts)
 * pose plain groups that BuiltPose carries onto the bones, faded in and out
 * over the clips.
 */

const MODELS = "/models/doll";
const REST_LID = 0.04;
// Full effect opens the remaining upper lid; cocaine is 70% as wide.
const WIDE_LID = REST_LID;
const COCAINE_STARE = 0.7;
// Fully blown pupils are this much wider than her own (about 70% of the iris).
const PUPIL_GROW = 1.2;
// Gurning grinds: the clench eases and sets again about once a second.
const GRIND_HZ = 1.1;

// the baked clips come in their own file (a big one), fetched once the first
// room shows, so they don't share the bandwidth it loads over; dolls wear
// the built poses until then
afterSceneReady(() => void loadAnims(""), 8000);
// the social and seated clip packs (gestures, sitting down) are smaller and
// wanted soon after, but not before the room is drawn: fetched a while later,
// or at once when a doll asks for a clip in one (pickClip's `need`)
afterSceneReady(() => void loadPack("", "social"), 25000);
afterSceneReady(() => void loadPack("", "seated"), 35000);
// set-off, arrival and turn clips (locomotion.ts) are small and wanted by the
// first walk
afterSceneReady(() => void loadPack("", "moves"), 20000);

// seconds to crossfade between clips, and between clips and built poses
const FADE = 0.3;

// a doll given no held pose (an NPC) strikes one of these, by seed; the
// first, none, keeps the built hip-pop pose (or the seat's own loop)
const POSE_HOLDS = [undefined, ...stillClipsOf("pose").map((c) => c.id)];
const SIT_HOLDS = [undefined, ...stillClipsOf("sit").map((c) => c.id)];
// meters from the camera where a doll swaps to and from the low-poly body
const LOD_FAR = 9;
const LOD_NEAR = 8;
// on the low tier everyone else's doll (NPCs, other players) goes
// low-poly much sooner, so a game's close shot of the player
// with a rival or two beside her stays in budget; hers keeps full detail
const LOW_TIER_FAR = 4.6;
const LOW_TIER_NEAR = 4;
const worldPos = new THREE.Vector3();
// per-frame scratch for the ponytail and the drunk sway
const sway = new THREE.Euler();
const turn = new THREE.Quaternion();
// per-frame scratch for her look into a portrait's camera
const headAt = new THREE.Vector3();
const headDir = new THREE.Vector3();
const toCamera = new THREE.Vector3();
const front = new THREE.Vector3();
const headQ = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();
const gazeQ = new THREE.Quaternion();

/** A doll's clip player: its mixer, the clip playing, and how far the
 * built pose is faded in over it (0..1). */
type Anim = {
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction | null;
  playing: string;
  built: number;
  /** What her body was doing last frame, and since when (clock seconds):
   * the idle slots count from it, and a change picks a joining clip. */
  posture: Posture | null;
  since: number;
  /** A one-shot joining two postures (sitting down), until it ends. */
  trans: { id: string; until: number; rate: number } | null;
  /** The play handed to the picker's caller while a transition runs. */
  transPlay: Play;
  /** What she was seen doing around walking, and the clip it set off. */
  loco: Loco;
  run: {
    id: string;
    until: number;
    rate: number;
    fade: number;
    /** Ends when she walks off (a jump in place). */
    stay?: boolean;
  } | null;
  /** The jump count last seen (WalkState.jump); -1 before the first frame,
   * so a doll that mounts after jumps began does not replay them. */
  jumped: number;
  /** The last reaction count seen (-1 before the first look). */
  reacted: number;
};
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

/** How fast the doll is moving over the ground, m/s: the legs keep pace.
 * `yaw` (facing, radians) lets her turn on the spot, and `hurry` (the jog,
 * not a stroll) picks her set-off; both optional (locomotion.ts). */
export type WalkState = {
  speed: number;
  yaw?: number;
  hurry?: boolean;
  /** Counts jumps: each new count plays the jump clip. */
  jump?: number;
  /** A reaction (a flinch, a trip): each new `n` plays the baked clip `id`
   * once, where she stands (game/reactions.ts). */
  react?: { id: string; n: number };
};

type Props = {
  /** Closet body sliders, 0 to 100 each. */
  body?: BodyShape | undefined;
  look: Look;
  swim?: SwimLook | null | undefined;
  mood: Mood;
  dance?: DanceMoveId | undefined;
  couple?: CoupleRole | undefined;
  /** Kissing: the partner's face height, met by bending or rising (reach.ts). */
  partnerFace?: number | undefined;
  /** A held motion-capture pose (STILL_CLIPS id) for the pose and sit moods. */
  hold?: string | undefined;
  buzzed?: boolean | undefined;
  /** A peer's felt substance, from their move action (the player's own
   * doll reads the live meters instead). */
  under?: Substance | undefined;
  walk?: { current: WalkState } | undefined;
  seed?: number | undefined;
  /** The player's own doll: full detail at any distance on the low tier. */
  own?: boolean | undefined;
  /** False where sitting down or standing up must not play a clip (a ride
   * that carries her seated). */
  joins?: boolean | undefined;
} & Omit<ThreeElements["group"], "children">;

/** The part files a look wears, by kind. */
// salon styles wear the closest 3D hair until they get models of their own
const HAIR: Partial<Record<Look["hairStyle"], string>> = {
  "sleek-bob": "bob",
  "curl-cloud": "mid-curly",
};

export function partsFor(look: Look, swim: SwimLook | null) {
  // a man wears the parts fitted to the man's body
  const m = modelSuffix(look);
  const wear = wearOf(look);
  // one model per worn garment (wardrobe.ts), each tracked under its slot;
  // in swimwear rooms the swimsuit alone
  const garments = swim
    ? [
        {
          key: "swim",
          url: `${MODELS}/swim-${swim.style}${m}.glb`,
          color: swim.color,
          tuck: `tuck_${swim.style}`,
          finish: "cloth" as const,
        },
      ]
    : SLOTS.flatMap((slot) => {
        const worn = wear[slot];
        if (!worn) return [];
        const style = worn.id === "fishnet-tights" ? "sheer-tights" : worn.id;
        const finish: "cloth" | "sheer" | "fishnet" =
          worn.id === "fishnet-tights"
            ? "fishnet"
            : worn.id === "sheer-tights"
              ? "sheer"
              : "cloth";
        return [
          {
            key: slot,
            url: `${MODELS}/${slot}-${style}${m}.glb`,
            color: worn.color,
            tuck: slot === "hat" ? null : `tuck_${style}`,
            finish,
          },
        ];
      });
  return {
    // Hats replace the hair mesh to keep it inside the crown.
    hair:
      look.hairStyle === "bald" || (!swim && wear.hat)
        ? null
        : `${MODELS}/hair-${HAIR[look.hairStyle] ?? look.hairStyle}${m}.glb`,
    garments,
    shoes: swim ? null : `${MODELS}/shoes-${shoesOf(look)}${m}.glb`,
    tucks: [
      ...garments.flatMap((g) => (g.tuck ? [g.tuck] : [])),
      ...(swim ? [] : [`tuck_${shoesOf(look)}`]),
    ],
  };
}

const morphMeshes = (root: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (isMesh(o) && o.morphTargetDictionary) out.push(o);
  });
  return out;
};

/** Gives a skinned mesh's geometry `aShin`: per vertex, the weight on the
 * left and on the right shin bone, for hiding the skin over a prosthesis. */
function addShinWeights(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry;
  if (g.getAttribute("aShin")) return;
  const index = g.getAttribute("skinIndex");
  const weight = g.getAttribute("skinWeight");
  if (!index || !weight) return;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const sides = [HIDDEN_BONES.legL, HIDDEN_BONES.legR].map(
    (list) => new Set(list.map((n) => names.indexOf(n)).filter((i) => i >= 0)),
  );
  const out = new Float32Array(index.count * 2);
  for (let i = 0; i < index.count; i++)
    for (const [k, bones] of sides.entries())
      for (let c = 0; c < 4; c++)
        if (bones.has(index.getComponent(i, c)))
          out[i * 2 + k] += weight.getComponent(i, c);
  g.setAttribute("aShin", new THREE.BufferAttribute(out, 2));
}

/** The big wheels' radius, meters (art/doll/blender/wheelchair.py). */
const WHEEL_RADIUS = 0.32;

/** The wheelchair a seated gait rolls in (art/doll/blender/wheelchair.py,
 * CC-BY by Loic): feet on the floor, the seat under the doll's hips; its rear
 * wheels turn with the ground speed. */
function Wheelchair({ walk }: { walk?: { current: WalkState } | undefined }) {
  const { scene } = useGLTF(`${MODELS}/wheelchair.glb`);
  const chair = useMemo(() => scene.clone(true), [scene]);
  const wheels = useMemo(
    () =>
      ["wheelL", "wheelR"].flatMap((name) => {
        const wheel = chair.getObjectByName(name);
        return wheel ? [wheel] : [];
      }),
    [chair],
  );
  useFrame((_, dt) => {
    const turn = ((walk?.current.speed ?? 0) * dt) / WHEEL_RADIUS;
    for (const wheel of wheels) wheel.rotation.x += turn;
  });
  return <primitive object={chair} />;
}

function setMorph(meshes: THREE.Mesh[], name: string, value: number) {
  for (const m of meshes) {
    const i = m.morphTargetDictionary?.[name];
    if (i !== undefined && m.morphTargetInfluences)
      m.morphTargetInfluences[i] = value;
  }
}

/** The iris painted before the look's own eye color is applied. */
const DEFAULT_EYE = "#6b3f22";

/** Shared source data follows glTF UVs and is never interpreted as color. */
function prepareSkinSurface(surface: THREE.Texture) {
  surface.colorSpace = THREE.NoColorSpace;
  surface.flipY = false;
  surface.anisotropy = 4;
  surface.needsUpdate = true;
}

function useBody(look: Look, eyeColor: Face["eyeColor"]) {
  // women and men are separate dolls, each with its own skeleton
  const m = modelSuffix(look);
  const gltf = useGLTF(`${MODELS}/body${m}.glb`);
  const loGltf = useGLTF(`${MODELS}/body${m}-lo.glb`);
  const surface = useTexture(
    `/models/doll-skin-surface${m}.png`,
    prepareSkinSurface,
  );
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    const bones = new Map<string, THREE.Bone>();
    scene.traverse((o) => {
      if (isBone(o)) bones.set(o.name, o);
    });
    // the built-pose driver reads the bones' rest, so it is made first
    const built = new BuiltPose(bones, scene);
    const pony = bones.get(BONE.pony) ?? null;
    const head = bones.get(BONE.head) ?? null;
    // model space to each bone's rest frame, for jewelry hung on bones;
    // the fresh clone is unparented, so its world space is model space
    scene.updateMatrixWorld(true);
    const restInverse = new Map<string, THREE.Matrix4>();
    for (const [name, bone] of bones)
      restInverse.set(name, bone.matrixWorld.clone().invert());
    // where her head points, in the head bone's own frame: at rest she
    // faces +z (each skeleton's bones rest on different axes)
    const headFront = new THREE.Vector3(0, 0, 1);
    if (head)
      headFront.applyQuaternion(
        head.getWorldQuaternion(new THREE.Quaternion()).invert(),
      );
    let meta: unknown = null;
    scene.traverse((o) => {
      if (typeof o.userData.doll === "string") meta = o.userData.doll;
    });
    // Fine skin relief and varied shine keep the face responsive to lighting.
    // R carries source-derived height and G carries roughness. The maps are
    // shared per body, independently of complexion and removable makeup.
    const skin = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      roughnessMap: surface,
      bumpMap: surface,
      bumpScale: 0.00035,
      emissive: "#ffffff",
      emissiveIntensity: 0.035,
    });
    // a prosthetic leg hides the skin skinned to its shin (Prosthetics.tsx):
    // each vertex carries its left and right shin weights as `aShin`
    const shinHide: THREE.IUniform<THREE.Vector2> = {
      value: new THREE.Vector2(),
    };
    skin.onBeforeCompile = (shader) => {
      shader.uniforms.uHideShin = shinHide;
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        "attribute vec2 aShin;\nvarying vec2 vShin;\nvoid main() {\nvShin = aShin;",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        "varying vec2 vShin;\nuniform vec2 uHideShin;\nvoid main() {\nif (dot(vShin, uHideShin) > 0.25) discard;",
      );
    };
    skin.customProgramCacheKey = () => "doll-skin-shin";
    const lashes = new THREE.MeshStandardMaterial({
      color: "#0d0609",
      map: sharedLashes(),
      alphaTest: 0.4,
      side: THREE.DoubleSide,
    });
    const eye = new THREE.MeshStandardMaterial({
      // until the eye-color effect runs; the default stays cached
      map: acquireIris(DEFAULT_EYE),
      roughness: 0.3,
    });
    // pupil size (0 her own, 1 blown): the dark disc grows and the iris's
    // fibers squeeze into the ring left, as a real iris does, so the one
    // painted texture serves every size
    const pupil: THREE.IUniform<number> = { value: 0 };
    // weed reddens the whites: a uniform on this doll's own eye material
    // (no texture repaint, no extra draw call) blends near-white texels
    // (the sclera, #f4ece8) toward a bloodshot red
    const redness: THREE.IUniform<number> = { value: 0 };
    eye.onBeforeCompile = (shader) => {
      shader.uniforms.uPupil = pupil;
      shader.uniforms.uRed = redness;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          "uniform float uPupil;\nuniform float uRed;\nvoid main() {",
        )
        .replace(
          "#include <map_fragment>",
          [
            "#ifdef USE_MAP",
            "vec2 pupilD = vMapUv - 0.5;",
            "float pupilR = length(pupilD);",
            `float pupilTo = ${PUPIL_R.toFixed(4)} * (1.0 + uPupil * ${PUPIL_GROW.toFixed(2)});`,
            "float pupilFrom = pupilR < pupilTo",
            `  ? pupilR * ${PUPIL_R.toFixed(4)} / pupilTo`,
            `  : mix(${PUPIL_R.toFixed(4)}, ${IRIS_R.toFixed(4)}, clamp((pupilR - pupilTo) / (${IRIS_R.toFixed(4)} - pupilTo), 0.0, 1.0));`,
            // the sclera and the back of the ball keep their own texels
            `if (pupilR >= ${IRIS_R.toFixed(4)}) pupilFrom = pupilR;`,
            "diffuseColor *= texture2D(map, 0.5 + pupilD * (pupilFrom / max(pupilR, 1e-5)));",
            "#endif",
            "float whites = smoothstep(0.8, 0.92, min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)));",
            "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.22, 0.2), uRed * whites);",
          ].join("\n"),
        );
    };
    eye.customProgramCacheKey = () => "doll-eye";
    const cornea = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    // the eyeballs (eye + cornea, about 4k triangles a doll): hidden with the
    // far body, where each is a pixel or two and the proxy has no sockets
    const eyeballs: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (!isMesh(o)) return;
      o.frustumCulled = false;
      const name = o.material instanceof THREE.Material ? o.material.name : "";
      if (name === "eye" || name === "cornea") eyeballs.push(o);
      o.material =
        name === "lashes"
          ? lashes
          : name === "eye"
            ? eye
            : name === "cornea"
              ? cornea
              : skin;
    });
    // the far LOD body: MakeHuman's 1.6k-vertex proxy on the same bones,
    // shown instead of the full skin (and lashes) when the camera is far
    const near: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (isSkinnedMesh(o) && (o.material === skin || o.material === lashes))
        near.push(o);
    });
    const lods: THREE.SkinnedMesh[] = [];
    loGltf.scene.traverse((o) => {
      if (!isSkinnedMesh(o) || lods.length) return;
      const mesh = o.clone();
      mesh.bind(
        new THREE.Skeleton(
          o.skeleton.bones.map((b) => bones.get(b.name) ?? b),
          o.skeleton.boneInverses,
        ),
        o.bindMatrix,
      );
      mesh.morphTargetInfluences?.fill(0);
      mesh.material = skin;
      mesh.frustumCulled = false;
      mesh.visible = false;
      addShinWeights(mesh);
      lods.push(mesh);
      scene.add(mesh);
    });
    for (const mesh of near) if (isSkinnedMesh(mesh)) addShinWeights(mesh);
    return {
      scene,
      near,
      eyeballs,
      shinHide,
      far: lods[0] ?? null,
      bones,
      /** Names this skeleton for clipsFor: one per body file. */
      key: m,
      built,
      hips: bones.get(BONE.hips) ?? null,
      pony,
      ponyRest: pony?.quaternion.clone() ?? new THREE.Quaternion(),
      head,
      headFront,
      marks: readMarks(meta),
      anchors: readAnchors(meta),
      restInverse,
      skin,
      eye,
      pupil,
      redness,
      materials: [skin, lashes, eye, cornea],
    };
  }, [gltf, loGltf, m, surface]);

  useEffect(
    () => () => {
      // the textures belong to the face and iris caches (faceCanvas.ts)
      for (const m of body.materials) m.dispose();
    },
    [body],
  );

  // the parts of the look painted into the face texture
  const {
    skin: skinTone,
    lips,
    brows,
    shadow,
    makeup,
    beard,
    hairColor,
    body: build,
    face: faceCode,
    browColor,
  } = look;
  // the man's clip file loads only once a man is in the scene
  useEffect(() => {
    if (!body.key) return;
    afterSceneReady(() => void loadAnims(body.key), 8000);
    afterSceneReady(() => void loadPack(body.key, "social"), 25000);
    afterSceneReady(() => void loadPack(body.key, "seated"), 35000);
    afterSceneReady(() => void loadPack(body.key, "moves"), 20000);
  }, [body.key]);
  useEffect(() => {
    const { marks, skin } = body;
    // plain skin until the painted face arrives, then the texture tints both
    skin.color.set(skinTone);
    skin.emissive.set(skinTone);
    if (!marks) return;
    let live = true;
    // dolls with the same look share one painted face, kept a while after
    // the last lets go (faceCanvas.ts)
    const face = acquireFace(
      {
        skin: skinTone,
        lips,
        brows,
        shadow,
        makeup,
        beard,
        hairColor,
        body: build,
        face: faceCode,
        browColor,
      },
      marks,
      body.key,
    );
    face.texture
      .then((t) => {
        if (!live) return;
        skin.color.set("#ffffff");
        // a warm red glow through the skin's own colors: light scattering
        // under real skin, not a flat white sheen
        skin.emissive.set("#ffb39c");
        skin.map = t;
        skin.emissiveMap = t;
        skin.needsUpdate = true;
        invalidate();
      })
      // a missing mask leaves plain skin rather than breaking the room
      .catch((e: unknown) => console.warn(e));
    return () => {
      live = false;
      releaseFace(face.key);
    };
  }, [
    body,
    skinTone,
    lips,
    brows,
    shadow,
    makeup,
    beard,
    hairColor,
    build,
    faceCode,
    browColor,
    invalidate,
  ]);
  useEffect(() => {
    body.eye.map = acquireIris(eyeColor);
    body.eye.needsUpdate = true;
    invalidate();
    return () => releaseIris(eyeColor);
  }, [body, eyeColor, invalidate]);
  return body;
}

/**
 * Real hair's look is its shine: two highlight bands running across the
 * strands (Kajiya-Kay), a bright white one and a broader one tinted with the
 * hair's own color, each broken up strand by strand. Adds them to a standard
 * material; needs the card geometry's `hairTangent` (across the lock).
 */
function hairShine<M extends THREE.MeshStandardMaterial>(material: M): M {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "attribute vec4 hairTangent;\nvarying vec3 vHairDir;\nvoid main() {",
      )
      .replace(
        "#include <defaultnormal_vertex>",
        [
          "#include <defaultnormal_vertex>",
          "vec3 hairT = hairTangent.xyz;",
          "#ifdef USE_SKINNING",
          "hairT = (skinMatrix * vec4(hairT, 0.0)).xyz;",
          "#endif",
          // along the strand, root to tip
          "vHairDir = normalize(normalMatrix * (cross(objectNormal, hairT) * hairTangent.w));",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        [
          "varying vec3 vHairDir;",
          "float hairLobe(vec3 T, vec3 H, float e) {",
          "  float d = dot(T, H);",
          "  return pow(sqrt(max(0.0, 1.0 - d * d)), e);",
          "}",
          "void main() {",
        ].join("\n"),
      )
      .replace(
        "#include <lights_fragment_end>",
        [
          "#include <lights_fragment_end>",
          "#if NUM_DIR_LIGHTS > 0",
          "{",
          "  vec3 V = normalize(vViewPosition);",
          "  vec3 T = normalize(vHairDir);",
          // the strand texture's own fibers (pale hairs, darker gaps) break
          // the bands up hair by hair and set each one's highlight a little
          // higher or lower; its mips blend them into a soft sheen far off.
          // (A hash per texture column did this in blocks a few texels
          // wide: smeared gray bars across a close-up.)
          "  #ifdef USE_MAP",
          "  float fiber = smoothstep(0.45, 0.95, texture2D(map, vMapUv).g);",
          "  #else",
          "  float fiber = 0.5;",
          "  #endif",
          "  float shift = (fiber - 0.5) * 0.35;",
          // straight locks sit near the highlight angle all along, so the
          // white lobe is kept faint and only on the fibers
          "  float glint = fiber;",
          // the white lobe is a sparkle against dark hair: dimmer on it
          "  float dim = 0.4 + 0.6 * clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 4.0, 0.0, 1.0);",
          "  vec3 T1 = normalize(T + normal * (0.08 + shift));",
          "  vec3 T2 = normalize(T + normal * (-0.12 + shift));",
          "  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {",
          "    vec3 L = directionalLights[i].direction;",
          "    vec3 H = normalize(L + V);",
          "    float lit = smoothstep(-0.25, 0.5, dot(normal, L));",
          "    float a = hairLobe(T1, H, 36.0) * 0.09 * glint * dim;",
          "    float b = hairLobe(T2, H, 22.0) * 0.22 * (0.4 + 0.6 * fiber);",
          "    reflectedLight.directSpecular += directionalLights[i].color * lit *",
          "      (vec3(a) + b * diffuseColor.rgb * 1.6);",
          "  }",
          "}",
          "#endif",
        ].join("\n"),
      );
  };
  material.customProgramCacheKey = () => "hair-shine";
  return material;
}

/** Hair: strand cards shine with two highlight bands (hairShine); untextured
 * sculpted hair (afro, braids, buns) has no strand direction, so it stays
 * matte with a soft sheen. Baked root-to-tip shading tints both. */
function hairMaterial(
  color: string,
  map: THREE.Texture | null,
  shaded: boolean,
  rich: boolean,
  /** Cut out by its alpha: strand cards are; a textured scalp cap is not. */
  cutout: boolean,
  /** Strand cards shine; a pack style's scalp cap (`*_cap`) stays matte. */
  shine: boolean,
) {
  // hair over the back is seen edge-on: without anisotropic filtering the
  // blurred mip's alpha breaks into specks at the cut-out threshold
  if (map) map.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({
    map,
    color: color,
    vertexColors: shaded,
    // the shine comes from the bands; the base lighting stays soft
    roughness: map ? 0.82 : 0.72,
    side: THREE.DoubleSide,
    alphaTest: map && cutout ? (rich ? 0.3 : 0.4) : 0,
    // Strand cards are a few texels wide, so their mips lose alpha unevenly
    // and a hard cut-out flickers into white specks against dark hair.
    // Alpha-to-coverage turns the (sharpened) alpha into MSAA coverage:
    // soft, stable edges, no sorting and no second blended pass.
    alphaToCoverage: Boolean(map && cutout),
  });
  // the shine bands run along strand cards; on the broad, smooth scalp cap
  // they would read as white streaks, so the cap stays matte
  return map && cutout && shine ? hairShine(material) : material;
}

type Tint = {
  color: string;
  kind: "hair" | "cloth" | "gloss" | "keep" | "sheer" | "fishnet";
  alphaMap?: THREE.Texture | undefined;
};

/** How a cloth catches light, by the Blender material it was cut from. */
const FEEL: Record<string, { roughness: number; metalness?: number }> = {
  satin: { roughness: 0.32 },
  sequin: { roughness: 0.25, metalness: 0.8 },
  velour: { roughness: 0.95 },
  fur: { roughness: 0.95 },
};

/** A part's low-poly twin, worn while the doll is far off (optimize-doll.sh
 * simplifies every hair, outfit and shoe file into one). */
const lodOf = (url: string) => url.replace(/\.glb$/, "-lo.glb");

type Built = ReturnType<typeof buildPart>;

/**
 * A worn part, re-bound to the body's bones and tinted. Its low-poly twin
 * loads first and is worn far off; the full model downloads only once the
 * doll first comes within LOD range, so a street of distant dolls never
 * fetches their full hair and clothes. Until it arrives the twin stays on.
 * The player's own doll (`full`) skips the twin: it is always close, and
 * fetching both doubled its first download.
 */
function Part({
  url,
  bones,
  tint,
  far,
  onMeshes,
  full = false,
}: {
  url: string;
  bones: Map<string, THREE.Bone>;
  tint: Tint;
  /** Set while the doll wears its far LOD. */
  far: { current: boolean };
  /** The part's meshes, and how far its soles lift the doll (meters). */
  onMeshes: (meshes: THREE.Mesh[] | null, lift: number) => void;
  /** Wear the full model from the start, with no twin. */
  full?: boolean;
}) {
  const gltfLo = useGLTF(full ? url : lodOf(url));
  const rich = useQuality() !== "low";
  const { shadows } = useGraphics();
  const { color, kind, alphaMap } = tint;
  const lo = useMemo(
    () =>
      buildPart(gltfLo.scene, bones, { color, kind, alphaMap }, full && rich),
    [gltfLo, bones, color, kind, alphaMap, full, rich],
  );
  // the full model, once it has been wanted and has loaded
  const [wantNear, setWantNear] = useState(false);
  const [near, setNear] = useState<Built | null>(null);
  useFrame(() => {
    if (full) return;
    if (!wantNear && !far.current) setWantNear(true);
    const showLo = far.current || !near;
    // the lineup's screenshots wait while a near doll still wears its twin
    lo.group.userData.nearPending = !far.current && !near;
    if (lo.group.visible !== showLo) lo.group.visible = showLo;
    if (near && near.group.visible === showLo) near.group.visible = !showLo;
  });
  useEffect(() => {
    castShadows(lo.group, shadows);
  }, [lo, shadows]);
  useEffect(() => {
    onMeshes(
      near
        ? [...morphMeshes(lo.group), ...morphMeshes(near.group)]
        : morphMeshes(lo.group),
      near?.lift ?? lo.lift,
    );
  }, [lo, near, onMeshes]);
  useEffect(
    () => () => {
      onMeshes(null, 0);
      lo.materials.forEach((m) => m.dispose());
    },
    [lo, onMeshes],
  );
  return (
    <>
      <primitive object={lo.group} />
      {wantNear && (
        <Suspense fallback={null}>
          <NearPart url={url} bones={bones} tint={tint} onBuilt={setNear} />
        </Suspense>
      )}
    </>
  );
}

/** The two tights finishes share a fitted mesh. Only fishnets need a mask. */
function FishnetPart(
  props: Omit<Parameters<typeof Part>[0], "tint"> & { color: string },
) {
  const alphaMap = useTexture(`${MODELS}/fishnet-mask.webp`);
  const { color, ...part } = props;
  return <Part {...part} tint={{ color, kind: "fishnet", alphaMap }} />;
}

/** The full-detail part, fetched on demand; it hands itself up when built. */
function NearPart({
  url,
  bones,
  tint,
  onBuilt,
}: {
  url: string;
  bones: Map<string, THREE.Bone>;
  tint: Tint;
  onBuilt: (part: Built | null) => void;
}) {
  const gltf = useGLTF(url);
  // the glossy hair shading and its soft-edge pass are for capable GPUs
  const rich = useQuality() !== "low";
  const { shadows } = useGraphics();
  const { color, kind, alphaMap } = tint;
  const part = useMemo(
    () => buildPart(gltf.scene, bones, { color, kind, alphaMap }, rich),
    [gltf, bones, color, kind, alphaMap, rich],
  );
  useEffect(() => {
    castShadows(part.group, shadows);
  }, [part, shadows]);
  useEffect(() => {
    // hidden until Part decides, so it never shows alongside the twin
    part.group.visible = false;
    onBuilt(part);
    return () => {
      onBuilt(null);
      part.materials.forEach((m) => m.dispose());
    };
  }, [part, onBuilt]);
  return <primitive object={part.group} />;
}

const imageIds = new WeakMap<object, number>();
let nextImageId = 0;
/** A stable id per decoded image, for the atlas cache key. */
const imageId = (image: object) => {
  let id = imageIds.get(image);
  if (id === undefined) imageIds.set(image, (id = nextImageId++));
  return id;
};

type AtlasImage = ImageBitmap | HTMLImageElement | HTMLCanvasElement;
const isAtlasImage = (image: unknown): image is AtlasImage =>
  (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) ||
  (typeof HTMLImageElement !== "undefined" &&
    image instanceof HTMLImageElement) ||
  (typeof HTMLCanvasElement !== "undefined" &&
    image instanceof HTMLCanvasElement);

/**
 * The far twins' detail maps drawn into one texture, shared by every doll
 * wearing the same garments (colors are per vertex, so they don't matter).
 * glTF maps aren't flipped, so neither is the atlas: v runs down.
 */
const atlases = new RefCache<THREE.CanvasTexture, readonly AtlasImage[]>(
  (_key, images) => {
    const cols = atlasCols(images.length);
    const cell = Math.floor(ATLAS / cols);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = cell * cols;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      images.forEach((image, i) =>
        ctx.drawImage(
          image,
          (i % cols) * cell,
          Math.floor(i / cols) * cell,
          cell,
          cell,
        ),
      );
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  },
  (texture) => texture.dispose(),
  8,
);

/** A worn garment: its model, tint and worn-part key (partsFor). */
type Garment = { key: string; url: string; color: string };

/**
 * A doll's garments, far and near. The low-poly twins merge into one mesh,
 * one draw call however many layers she wears (mergeGarments; kept apart
 * only if they can't share a skeleton). Each full model is fetched once she
 * first comes within LOD range, as Part does for one part, and the twin
 * stays on until all of them have arrived. Remount it (a key) when the
 * garments change, so the doll hides until the new ones load.
 */
function Garments({
  garments,
  shoeTuck,
  bones,
  far,
  track,
}: {
  garments: readonly Garment[];
  shoeTuck?: string | undefined;
  bones: Map<string, THREE.Bone>;
  far: { current: boolean };
  track: (key: string) => (meshes: THREE.Mesh[] | null, lift: number) => void;
}) {
  const gltfs = useGLTF(garments.map((g) => lodOf(g.url)));
  const { shadows } = useGraphics();
  const tints = garments.map((g) => g.color).join(",");
  const lo = useMemo(() => {
    const colors = tints.split(",");
    const built = gltfs.map((gltf, i) =>
      buildPart(
        gltf.scene,
        bones,
        { color: colors[i] ?? "#ffffff", kind: "cloth" },
        false,
      ),
    );
    // every piece with its detail map's image, if it has one
    const pieces = built.flatMap((b, i) =>
      b.group.children.filter(isSkinnedMesh).map((mesh) => {
        const image: unknown =
          mesh.material instanceof THREE.MeshStandardMaterial
            ? mesh.material.map?.image
            : null;
        return {
          mesh,
          color: colors[i] ?? "#ffffff",
          image: isAtlasImage(image) ? image : null,
        };
      }),
    );
    const images = [
      ...new Set(pieces.flatMap((p) => (p.image ? [p.image] : []))),
    ];
    const atlasKey = images.map(imageId).join(",");
    const merged = mergeGarments(
      pieces.map(({ mesh, color, image }) => ({
        mesh,
        color,
        rect: images.length
          ? atlasRect(
              image ? images.indexOf(image) : images.length,
              images.length,
            )
          : undefined,
      })),
      shoeTuck,
    );
    const group = new THREE.Group();
    if (!merged) {
      for (const b of built) group.add(b.group);
      return {
        group,
        materials: built.flatMap((b) => b.materials),
        own: null,
        skeleton: null,
        atlas: null,
      };
    }
    for (const b of built) b.materials.forEach((m) => m.dispose());
    group.add(merged);
    const mat = merged.material;
    return {
      group,
      materials: Array.isArray(mat) ? mat : [mat],
      own: merged.geometry,
      // its own skeleton (the bones are the body's): the bone texture goes
      skeleton: merged.skeleton,
      // taken from the shared atlas cache when committed (an effect), so
      // a render React throws away never holds a reference
      atlas: images.length ? { key: atlasKey, images } : null,
    };
  }, [gltfs, bones, tints, shoeTuck]);
  useEffect(
    () => () => {
      lo.materials.forEach((m) => m.dispose());
      lo.own?.dispose();
      lo.skeleton?.dispose();
    },
    [lo],
  );
  useEffect(() => {
    const { atlas } = lo;
    const mat = lo.materials[0];
    if (!atlas || !(mat instanceof THREE.MeshStandardMaterial)) return;
    mat.map = atlases.acquire(atlas.key, atlas.images);
    mat.needsUpdate = true;
    return () => atlases.release(atlas.key);
  }, [lo]);
  useEffect(() => {
    castShadows(lo.group, shadows);
  }, [lo, shadows]);
  const [wantNear, setWantNear] = useState(false);
  const [nears, setNears] = useState<ReadonlyMap<string, Built>>(new Map());
  const ready = garments.every((g) => nears.has(g.url));
  // a plain array for the frame loop, which allocates nothing
  const nearGroups = useMemo(
    () => [...nears.values()].map((n) => n.group),
    [nears],
  );
  // one stable hand-up per garment
  const onBuilt = useMemo(() => {
    const made = new Map<string, (part: Built | null) => void>();
    return (url: string) => {
      let fn = made.get(url);
      if (!fn) {
        fn = (part) =>
          setNears((old) => {
            const next = new Map(old);
            if (part) next.set(url, part);
            else next.delete(url);
            return next;
          });
        made.set(url, fn);
      }
      return fn;
    };
  }, []);
  useFrame(() => {
    if (!wantNear && !far.current) setWantNear(true);
    const showLo = far.current || !ready;
    lo.group.userData.nearPending = !far.current && !ready;
    if (lo.group.visible !== showLo) lo.group.visible = showLo;
    for (let i = 0; i < nearGroups.length; i++) {
      const group = nearGroups[i];
      if (group && group.visible === showLo) group.visible = !showLo;
    }
  });
  useEffect(() => {
    const loMeshes = morphMeshes(lo.group);
    garments.forEach((g, i) => {
      const near = nears.get(g.url);
      track(g.key)(
        [
          ...(i === 0 ? loMeshes : []),
          ...(near ? morphMeshes(near.group) : []),
        ],
        0,
      );
    });
    return () => {
      for (const g of garments) track(g.key)(null, 0);
    };
  }, [lo, nears, garments, track]);
  return (
    <>
      <primitive object={lo.group} />
      {wantNear &&
        garments.map((g) => (
          <Suspense key={g.url} fallback={null}>
            <NearPart
              url={g.url}
              bones={bones}
              tint={{ color: g.color, kind: "cloth" }}
              onBuilt={onBuilt(g.url)}
            />
          </Suspense>
        ))}
    </>
  );
}

/** Sets whether every mesh under `group` casts the key light's shadow. */
function castShadows(group: THREE.Object3D, on: boolean) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = on;
  });
}

/** A part's scene re-bound to the body's bones, with the doll's materials. */
function buildPart(
  scene: THREE.Object3D,
  bones: Map<string, THREE.Bone>,
  tint: Tint,
  rich: boolean,
) {
  {
    const meshes: THREE.SkinnedMesh[] = [];
    scene.traverse((o) => {
      if (isSkinnedMesh(o)) meshes.push(o);
    });
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    let lift = 0;
    scene.traverse((o) => {
      const v: unknown = o.userData.lift;
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 0.25)
        lift = v;
    });
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
      const hasShade = Boolean(src.geometry.getAttribute("color"));
      // a pack style's scalp cap is its own material (pack_hair.py): its
      // polygons are big and its UVs arbitrary, so strand shine on it
      // lights whole facets silver (the Quiff's forehead patch)
      const strands = !old?.name.endsWith("_cap");
      // glTF marks cut-out parts as blend or mask; an opaque one keeps its fill
      const cutout = Boolean(old && (old.transparent || old.alphaTest > 0));
      // the hair shine runs across each strand: it needs the cards' real
      // tangents (shared geometry, so once per part), kept under their own
      // name so no material takes them for a normal-map frame
      const g = src.geometry;
      if (
        tint.kind === "hair" &&
        strands &&
        old?.map &&
        !g.getAttribute("hairTangent") &&
        g.index &&
        g.getAttribute("normal") &&
        g.getAttribute("uv")
      ) {
        g.computeTangents();
        const t = g.getAttribute("tangent");
        // a card triangle with no UV area has no tangent: computeTangents
        // leaves NaN or zero there, and the shine would flash white or black
        // across it. Give those vertices a straight-down strand instead.
        for (let i = 0; i < t.count; i++) {
          const len = Math.hypot(t.getX(i), t.getY(i), t.getZ(i));
          if (
            !Number.isFinite(len) ||
            len < 1e-6 ||
            !Number.isFinite(t.getW(i))
          )
            t.setXYZW(i, 0, -1, 0, 1);
        }
        g.setAttribute("hairTangent", t);
        g.deleteAttribute("tangent");
      }
      const mat =
        tint.kind === "hair"
          ? hairMaterial(
              tint.color,
              old?.map ?? null,
              hasShade,
              rich,
              cutout,
              strands,
            )
          : new THREE.MeshStandardMaterial({
              map: old?.map ?? null,
              color: tint.kind === "keep" ? "#ffffff" : tint.color,
              roughness: tint.kind === "gloss" ? 0.22 : 0.7,
              ...(tint.kind === "cloth" ? FEEL[old?.name ?? ""] : undefined),
              ...(tint.kind === "sheer"
                ? { transparent: true, opacity: 0.4, depthWrite: false }
                : undefined),
              ...(tint.kind === "fishnet"
                ? {
                    alphaMap: tint.alphaMap ?? null,
                    alphaTest: 0.35,
                    alphaToCoverage: true,
                  }
                : undefined),
            });
      materials.push(mat);
      mesh.material = mat;
      group.add(mesh);
    }
    return { group, materials, lift };
  }
}

export function HumanDoll({
  look,
  swim = null,
  mood,
  dance = "groove",
  couple,
  partnerFace,
  hold: picked,
  buzzed = false,
  under,
  walk,
  seed = 0,
  own = false,
  joins = true,
  body: shape = DEFAULT_BODY,
  ...rest
}: Props) {
  // NPC looks carry no face, so their seed picks one
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const heightScale = bodyScales(shape).height;
  // a kiss with someone taller or shorter: this doll's share of meeting them
  const ownFace = faceHeight(look, shape);
  const ownDepth = faceDepth(look);
  const reach = useMemo(
    () =>
      partnerFace === undefined
        ? null
        : reachFor(ownFace, partnerFace, ownDepth),
    [ownFace, ownDepth, partnerFace],
  );
  const lowTierNpc = useQuality() === "low" && !own;
  const lodNear = lowTierNpc ? LOW_TIER_NEAR : LOD_NEAR;
  const lodFar = lowTierNpc ? LOW_TIER_FAR : LOD_FAR;
  const gearOn = scuba.use().wearing;
  const root = useRef<THREE.Group>(null);
  const face = useMemo(
    () => (look.face || !seed ? faceOf(look) : seededFace(seed)),
    [look, seed],
  );
  // NPC looks carry no makeup either; their seed picks a polished one
  const painted = useMemo(
    () =>
      look.makeup || !seed
        ? look
        : { ...look, makeup: encodeMakeup(seededMakeup(seed)) },
    [look, seed],
  );
  const body = useBody(painted, face.eyeColor);
  // on Realistic every doll casts the key light's shadow; each part sets its
  // own when it mounts, so only the body is covered here
  const { shadows } = useGraphics();
  useEffect(() => {
    if (root.current) castShadows(root.current, shadows);
  }, [body, shadows]);
  const gait = gaitOf(
    look.gait ?? (seed ? NPC_GAITS[seed % NPC_GAITS.length] : undefined),
  );
  const piercingCode = look.piercings;
  const piercings = useMemo(
    () => piercingsOf({ piercings: piercingCode }),
    [piercingCode],
  );
  // stable while the look is, so the garments effect runs only on a change
  const parts = useMemo(() => partsFor(look, swim), [look, swim]);
  const tuckKey = parts.tucks.join(",");
  // the garments remount when what she wears changes, not when it's dyed
  // Transparent tights keep their own draw call so the far atlas can stay opaque.
  const opaqueGarments = useMemo(
    () => parts.garments.filter((garment) => garment.finish === "cloth"),
    [parts.garments],
  );
  const garmentUrls = opaqueGarments.map((g) => g.url).join(",");
  const tucks = useMemo(() => tuckKey.split(","), [tuckKey]);
  const calm = useReducedMotion();
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);
  // in a kiss (no look into the camera), and its eyes-closed moment: set with
  // the built pose, which a far doll poses only every third frame
  const kiss = useRef({ on: false, shut: false });
  const sampled = useMemo<Pose>(createPose, []);
  // one mixer per body, made and torn down with it
  const anim = useRef<Anim | null>(null);
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(body.scene);
    anim.current = {
      mixer,
      action: null,
      playing: "",
      built: 1,
      posture: null,
      since: 0,
      trans: null,
      transPlay: { id: "", rate: 1, offset: 0 },
      loco: createLoco(),
      run: null,
      jumped: -1,
      reacted: -1,
    };
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(body.scene);
      anim.current = null;
    };
  }, [body]);
  // the pose code writes plain groups; their transforms go onto the bones
  const proxy = useMemo(() => {
    const rig: Rig = {};
    for (const j of JOINTS) rig[j] = new THREE.Group();
    return rig;
  }, []);
  const bodyMeshes = useMemo(() => morphMeshes(body.scene), [body]);
  const worn = useRef(new Map<string, THREE.Mesh[]>());
  const wornList = useRef<THREE.Mesh[]>([]);
  // every face and body key with its value (dollShapeKeys)
  // and the trouser legs and legwear tucked into the shoes worn (the
  // garments' in_<shoe> keys, doll_outfits.py into_shoes)
  const shoe = shoesOf(look);
  const shod = swim ? null : shoe;
  const shapeKeys = useMemo(
    () => [
      ...dollShapeKeys(face, shape),
      ...SHOES.map(({ id }) => [`in_${id}`, id === shod ? 1 : 0] as const),
    ],
    [face, shape, shod],
  );
  const shapedFor = useRef<THREE.Mesh[] | null>(null);
  const shapedWith = useRef<typeof shapeKeys | null>(null);
  const lift = useRef(0);
  // read by each worn part, to swap in its low-poly twin
  // start far, so nobody fetches full parts before their first LOD check
  const farParts = useRef(true);
  // her head's pose before she looked into the camera, put back each frame
  const gaze = useMemo(() => ({ kept: new THREE.Quaternion(), on: false }), []);
  const lidShown = useRef(-1);
  const lidMeshes = useRef<THREE.Mesh[] | null>(null);
  const smileShown = useRef(-1);
  const smileMeshes = useRef<THREE.Mesh[] | null>(null);
  const gurnShown = useRef(-1);
  const gurnMeshes = useRef<THREE.Mesh[] | null>(null);
  // a far doll's skeleton updates every third frame (thinned): the time owed
  const owed = useRef({ dt: 0, tick: 0 });
  useEffect(() => {
    if (own) setData(gl.domElement.dataset, "avatar", "loading");
    return () => {
      if (own) delete gl.domElement.dataset.avatar;
    };
  }, [own, gl]);

  // one stable callback per worn-part key (hair, shoes, each garment slot)
  const track = useMemo(() => {
    const made = new Map<
      string,
      (meshes: THREE.Mesh[] | null, up: number) => void
    >();
    return (key: string) => {
      let fn = made.get(key);
      if (!fn) {
        fn = (meshes, up) => {
          if (meshes) worn.current.set(key, meshes);
          else worn.current.delete(key);
          if (key === "shoes") lift.current = up;
          wornList.current = [
            ...bodyMeshes,
            ...[...worn.current.values()].flat(),
          ];
          invalidate();
        };
        made.set(key, fn);
      }
      return fn;
    };
  }, [bodyMeshes, invalidate]);

  useEffect(() => {
    wornList.current = [...bodyMeshes, ...[...worn.current.values()].flat()];
    for (const m of bodyMeshes) {
      const dict = m.morphTargetDictionary ?? {};
      for (const name of Object.keys(dict))
        if (name.startsWith("tuck_"))
          setMorph([m], name, tucks.includes(name) ? 1 : 0);
    }
  }, [bodyMeshes, tucks]);

  useFrame((state, rawDt) => {
    const dt = rawDt * TIME_SCALE;
    // never show the body before its outfit (or swimsuit), hair and shoes have
    // loaded: a doll stays hidden while they're still downloading
    const ready = isDollReady(worn.current, parts);
    if (root.current) root.current.visible = ready;
    if (own)
      setData(
        state.gl.domElement.dataset,
        "avatar",
        ready ? "ready" : "loading",
      );
    // far dolls swap to the low-poly body; the gap is hysteresis
    if (root.current && body.far) {
      // last frame's world matrix is close enough for picking a LOD, and
      // reading it costs nothing (getWorldPosition re-walks every parent)
      worldPos.setFromMatrixPosition(root.current.matrixWorld);
      const d = worldPos.distanceTo(state.camera.position);
      const isFar = d > (body.far.visible ? lodNear : lodFar);
      if (isFar !== body.far.visible) {
        body.far.visible = isFar;
        for (const m of body.near) m.visible = !isFar;
        for (const m of body.eyeballs) m.visible = !isFar;
      }
      farParts.current = isFar;
    }
    const t = state.clock.elapsedTime + seed * 7.3;
    const speed = walk?.current.speed ?? 0;
    const moving = speed > MOVING;
    // the built stride's phase, for the hand-made walk worn until the clips load
    phase.current += dt * walkPhaseRate(speed, BUILT_STRIDE / gait.cadence);
    // a seated NPC takes a seated hold, not a standing one lowered onto the seat
    const seeded = mood === "sit" ? SIT_HOLDS : POSE_HOLDS;
    const hold = picked ?? seeded[seed % seeded.length];
    const a = anim.current;
    // a far doll is a few pixels tall: pose its skeleton every third frame,
    // with the time it owes, instead of every frame (mixer, built pose and
    // fades are the doll's whole per-frame cost)
    let animDt = dt;
    if (!own && farParts.current) {
      const o = owed.current;
      o.dt += dt;
      if (++o.tick % 3 === 0) {
        animDt = o.dt;
        o.dt = 0;
      } else animDt = 0;
    } else owed.current.dt = 0;
    if (a && animDt > 0) {
      const clips = clipsFor(body.key);
      // (game time, so ?timescale slows the clips' windows with the clips)
      const now = state.clock.elapsedTime * TIME_SCALE;
      // the catalog's walk speeds are the woman's stride; his carries farther
      const pace = body.key ? speed / MAN_STRIDE : speed;
      const afloatNow = own && afloat.on;
      // sitting down or standing up plays a joining clip once, then the
      // posture's own loop; walking away cancels it
      const posture = postureOf({
        speed: pace,
        mood,
        seated: gait.seated,
        afloat: afloatNow,
      });
      if (a.posture !== posture) {
        const joining =
          a.posture && joins ? pickTransition(a.posture, posture, seed) : null;
        a.posture = posture;
        a.since = now;
        a.trans = null;
        if (joining && clips) {
          if (packsFor(body.key).has(joining.pack))
            a.trans = {
              id: joining.id,
              until: now + joining.seconds,
              rate: joining.rate,
            };
          else void loadPack(body.key, joining.pack);
        }
      }
      if (a.trans && (now >= a.trans.until || posture === "move"))
        a.trans = null;
      // setting off, arriving and turning play a short clip over the loop
      const around = stepLoco(a.loco, {
        dt: animDt,
        speed: pace,
        yaw: walk?.current.yaw,
        hurry: walk?.current.hurry === true,
        man: body.key !== "",
        // not while a held mood (dancing, posing, a pair's placing) owns her
        busy:
          a.trans !== null ||
          gait.seated ||
          afloatNow ||
          posture === "sit" ||
          !joins ||
          (!moving && mood !== "idle"),
      });
      // read by tests: the last set-off, arrival or turn on the player's doll
      if (around && own) state.gl.domElement.dataset.loco = around.id;
      if (around && clips) {
        if (packsFor(body.key).has(around.pack))
          a.run = { ...around, until: now + around.seconds };
        else void loadPack(body.key, around.pack);
      }
      // a jump plays the whole clip, in place: walking off ends it
      const jumps = walk?.current.jump ?? 0;
      if (a.jumped < 0) a.jumped = jumps;
      else if (jumps !== a.jumped) {
        a.jumped = jumps;
        const jump = clipOf("jump");
        if (jump && clips?.has("jump"))
          a.run = {
            id: "jump",
            until: now + jump.period,
            rate: 1,
            fade: 0.15,
            stay: true,
          };
      }
      // a reaction (a flinch, a trip) plays its clip once, wherever she is
      const react = walk?.current.react;
      if (react) {
        if (a.reacted < 0) a.reacted = react.n;
        else if (react.n !== a.reacted) {
          a.reacted = react.n;
          const clip = clipOf(react.id);
          if (clip && clips?.has(react.id))
            a.run = {
              id: react.id,
              until: now + clip.period,
              rate: 1,
              fade: 0.12,
            };
          else if (clip) void loadPack(body.key, clip.pack);
        }
      }
      if (a.run?.stay && moving) a.run = null;
      // a clip's fade out is as short as its fade in
      let fade = FADE;
      let want: Play | null;
      if (a.trans) {
        a.run = null;
        a.transPlay.id = a.trans.id;
        a.transPlay.rate = a.trans.rate;
        want = a.transPlay;
      } else if (a.run && now < a.run.until) {
        a.transPlay.id = a.run.id;
        a.transPlay.rate = a.run.rate;
        fade = a.run.fade;
        want = a.transPlay;
      } else {
        if (a.run) {
          fade = a.run.fade;
          a.run = null;
        }
        // the player's idles count from when she stopped; a stranger's from
        // the clock, offset by her seed, so a crowd changes out of step
        const stood = own ? now - a.since : t;
        const slot = idleSlot(stood);
        want = pickClip({
          loaded: clips !== null,
          packs: packsFor(body.key),
          own,
          slot,
          into: stood - slot * IDLE_SLOT_SECONDS,
          speed: pace,
          walk: gait.clip,
          mood,
          hold,
          dance,
          couple,
          seed,
          afloat: afloatNow,
          seated: gait.seated,
          // the player's own drinks and doses are known live; a peer's
          // substance comes in their move action (their drinks don't)
          body: own
            ? bodyFor(getMeters(), getBuzz(), getHangover())
            : under
              ? peakBody(under)
              : null,
        });
        if (want?.need) void loadPack(body.key, want.need);
      }
      const clip = want && want.id ? clips?.get(want.id) : undefined;
      if (want && clip) {
        if (a.playing !== want.id) {
          const next = a.mixer.clipAction(clip);
          next.reset();
          const once = a.trans !== null || a.run !== null;
          next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
          next.clampWhenFinished = once;
          // a pair dances in step on the shared clock (the follow half a loop
          // behind); everyone else starts their loop somewhere of their own
          const from =
            couple && clipOf(want.id)?.kind !== "walk"
              ? state.clock.elapsedTime
              : seed * 1.37;
          // a solo dance takes its place from the shared clock (sync.ts): dolls on
          // the same move are in step, beginning on the club's beat
          const shared = !once && !couple && clipOf(want.id)?.kind === "dance";
          const dc = shared ? danceClock() : null;
          next.time = once
            ? 0
            : dc
              ? syncOffset(dc.now, dc.tempo, clip.duration)
              : (from + want.offset) % clip.duration;
          next.play();
          if (a.action && a.action !== next)
            next.crossFadeFrom(a.action, fade, false);
          a.action = next;
          a.playing = want.id;
        }
        // a walk keeps pace with the ground (stride.ts)
        if (a.action) a.action.timeScale = want.rate;
      }
      // the built pose fades in where no clip plays (before the file loads, the
      // hand-made dances and poses for two, the hip-pop) and out where one does
      const built = want && clip ? 0 : 1;
      a.built +=
        Math.sign(built - a.built) *
        Math.min(animDt / FADE, Math.abs(built - a.built));
      // the mixer writes a bone only when its value changes: the look into
      // the camera comes off first, so it never piles up under a held pose
      if (gaze.on && body.head) body.head.quaternion.copy(gaze.kept);
      gaze.on = false;
      body.built.restore();
      if (a.action) a.mixer.update(animDt);
      kiss.current.on = false;
      kiss.current.shut = false;
      if (a.built > 0) {
        const move = mood === "dance" && !moving ? danceMove(dance) : null;
        // a kiss runs on the pair clock, so both partners lean in together
        const mt = move?.synced ? pairNow() : t;
        kiss.current.on = move?.synced === true;
        kiss.current.shut = move ? eyesShut(move, mt) : false;
        const danced = !move
          ? null
          : couple
            ? couplePoseAt(move, couple, mt, sampled)
            : poseAt(move, mt, sampled);
        if (danced && move?.synced && reach)
          applyReach(danced, reach, leanIn(danced));
        pose(
          proxy,
          gait.seated ? "sit" : moving ? "walk" : mood,
          t,
          phase.current,
          calm,
          danced,
          0,
          gait,
        );
        body.built.apply(proxy, a.built);
      }
      // a ponytail sways with the step, or idly; the clips leave it be
      if (body.pony && a.built < 0.5) {
        const ph =
          moving && a.action
            ? (a.action.time / a.action.getClip().duration) * Math.PI * 2
            : 0;
        sway.set(
          moving ? 0.12 + Math.cos(ph) * 0.08 : Math.sin(t * 1.6) * 0.05,
          0,
          moving ? Math.sin(ph) * 0.12 : Math.sin(t * 1.1) * 0.06,
        );
        body.pony.quaternion
          .copy(body.ponyRest)
          .multiply(turn.setFromEuler(sway));
      }
      // her own doll, up close: she looks into the camera (cameraZoom.ts),
      // whatever way the clip has her head, except mid-kiss
      const head = body.head;
      if (own && !kiss.current.on && head?.parent && root.current) {
        const parent = head.parent;
        head.getWorldPosition(headAt);
        head.getWorldQuaternion(headQ);
        headDir.copy(body.headFront).applyQuaternion(headQ);
        toCamera.subVectors(state.camera.position, headAt);
        const near = portraitAmount(toCamera.length());
        toCamera.normalize();
        front.setFromMatrixColumn(root.current.matrixWorld, 2).setY(0);
        const side = Math.abs(
          Math.atan2(toCamera.x, toCamera.z) - Math.atan2(front.x, front.z),
        );
        const off = headDir.angleTo(toCamera);
        const by = gazeTurn(off, Math.min(side, Math.PI * 2 - side), near);
        if (by > 1e-3) {
          gaze.kept.copy(head.quaternion);
          gaze.on = true;
          // the turn in the world, carried into the head's parent's frame
          gazeQ.setFromUnitVectors(headDir, toCamera);
          gazeQ.slerp(turn.identity(), 1 - by / off);
          parent.getWorldQuaternion(parentQ);
          head.quaternion.premultiply(parentQ);
          head.quaternion.premultiply(gazeQ);
          head.quaternion.premultiply(parentQ.invert());
        }
      }
      // the mixer writes a bone only when its value changes, so nothing is
      // added onto bones here (a held pose would drift): the drink's sway
      // and the soles' lift go on the model root, which nothing else moves
      const wobble = buzzed ? liveDrunk.wobble : 0;
      body.scene.rotation.set(
        wobble * 0.05 * Math.sin(t * 0.9 + 1),
        0,
        wobble * 0.08 * Math.sin(t * 1.3),
      );
      body.scene.position.set(
        wobble * 0.02 * Math.sin(t * 1.1),
        lift.current,
        0,
      );
    }
    // blink and molly's wide smile, on every mesh that carries the keys
    const tm = state.clock.elapsedTime;
    const closed = tm > blinkAt.current && tm < blinkAt.current + 0.14;
    // open eyes rest with the upper lid a little lowered, not wide and staring
    // only when it changes (or new meshes mount): a dictionary lookup per
    // worn mesh per doll per frame adds up in a crowd
    // molly and cocaine (her own doll only: a peer sends the substance, not
    // its level) open the eyes
    // wide, in fiftieths so the morphs change a few times a second, not every
    // frame; only molly smiles
    const meters = own ? getMeters() : null;
    const molly = meters ? Math.round(meters.molly.level * 50) / 50 : 0;
    const wide = meters
      ? Math.max(
          molly,
          Math.round(meters.cocaine.level * COCAINE_STARE * 50) / 50,
        )
      : 0;
    // weed lowers the lids (heavyLid), quantized like the rest
    const heavy = meters ? Math.round(heavyLid(meters) * 50) / 50 : 0;
    // red eyes: own doll only, behind ADULT_OK; set only on change
    const red = meters && ADULT_OK ? Math.round(redEyes(meters) * 50) / 50 : 0;
    if (body.redness.value !== red) {
      body.redness.value = red;
      invalidate();
    }
    const lid =
      closed || kiss.current.shut ? 1 : REST_LID - wide * WIDE_LID + heavy;
    if (lidShown.current !== lid || lidMeshes.current !== wornList.current) {
      lidShown.current = lid;
      lidMeshes.current = wornList.current;
      setMorph(wornList.current, "blink", lid);
    }
    if (
      smileShown.current !== molly ||
      smileMeshes.current !== wornList.current
    ) {
      smileShown.current = molly;
      smileMeshes.current = wornList.current;
      setMorph(wornList.current, "smile", Math.min(1, molly * 1.5));
    }
    // molly's big pupils and gurning jaw, less for cocaine and the
    // psychedelics (pupilDilation, jawClench); the clench grinds in and out
    // unless motion is reduced, when it holds; own doll only, behind ADULT_OK
    const adult = meters && ADULT_OK ? meters : null;
    const dilate = adult ? Math.round(pupilDilation(adult) * 50) / 50 : 0;
    if (body.pupil.value !== dilate) {
      body.pupil.value = dilate;
      invalidate();
    }
    const clench = adult ? jawClench(adult) : 0;
    const grind = calm
      ? 0.8
      : 0.65 + 0.35 * Math.sin(tm * GRIND_HZ * Math.PI * 2 + seed);
    const gurn = Math.round(clench * grind * 50) / 50;
    if (gurnShown.current !== gurn || gurnMeshes.current !== wornList.current) {
      gurnShown.current = gurn;
      gurnMeshes.current = wornList.current;
      setMorph(wornList.current, "gurn", gurn);
    }
    // face and body shape change rarely: set them only when they, or the
    // worn meshes (parts mount later), change, never every frame
    if (
      shapedFor.current !== wornList.current ||
      shapedWith.current !== shapeKeys
    ) {
      shapedFor.current = wornList.current;
      shapedWith.current = shapeKeys;
      for (const [name, value] of shapeKeys)
        setMorph(wornList.current, name, value);
    }
    if (tm > blinkAt.current + 0.14)
      blinkAt.current = tm + 2.2 + ((seed * 13.7 + tm) % 3.1);
  });

  return (
    <group {...rest} ref={root} scale={[1, heightScale, 1]}>
      <primitive object={body.scene} />
      <Jewelry
        piercings={piercings}
        anchors={body.anchors}
        bones={body.bones}
        restInverse={body.restInverse}
      />
      <ScubaGear
        on={own && gearOn}
        anchors={body.anchors}
        bones={body.bones}
        restInverse={body.restInverse}
      />
      {/* the pylon's file (356 KB) is fetched only for a doll that wears one */}
      {LIMB_SPOTS.some((spot) => limbsOf(look)[spot.id] === "prosthetic") && (
        <Suspense fallback={null}>
          <Prosthetics
            limbs={limbsOf(look)}
            bones={body.bones}
            restInverse={body.restInverse}
            shinHide={body.shinHide}
          />
        </Suspense>
      )}
      {gait.seated && (
        <Suspense fallback={null}>
          <Wheelchair walk={walk} />
        </Suspense>
      )}
      <Glasses
        style={makeupOf(look).glasses}
        anchors={body.anchors}
        bones={body.bones}
        restInverse={body.restInverse}
      />
      <HearingAids
        shell={makeupOf(look).hearing}
        anchors={body.anchors}
        bones={body.bones}
        restInverse={body.restInverse}
      />
      {parts.hair && (
        <Suspense fallback={null}>
          <Part
            key={parts.hair}
            url={parts.hair}
            bones={body.bones}
            tint={{ color: look.hairColor, kind: "hair" }}
            far={farParts}
            full={own}
            onMeshes={track("hair")}
          />
        </Suspense>
      )}
      {parts.garments
        .filter((garment) => own || garment.finish !== "cloth")
        .map((g) => {
          const part = {
            url: g.url,
            bones: body.bones,
            far: farParts,
            full: own,
            onMeshes: track(g.key),
          };
          return (
            <Suspense key={g.url} fallback={null}>
              {g.finish === "fishnet" ? (
                <FishnetPart {...part} color={g.color} />
              ) : (
                <Part {...part} tint={{ color: g.color, kind: g.finish }} />
              )}
            </Suspense>
          );
        })}
      {!own && (
        <Suspense key={garmentUrls} fallback={null}>
          <Garments
            garments={opaqueGarments}
            shoeTuck={shod ? `in_${shod}` : undefined}
            bones={body.bones}
            far={farParts}
            track={track}
          />
        </Suspense>
      )}
      {parts.shoes && (
        <Suspense fallback={null}>
          <Part
            key={parts.shoes}
            url={parts.shoes}
            bones={body.bones}
            tint={
              shoe === "platforms" || shoe === "boots"
                ? {
                    color:
                      look.outfit === "mini" ? "#f6e7ff" : look.outfitColor,
                    kind: "gloss",
                  }
                : { color: "#ffffff", kind: "keep" }
            }
            far={farParts}
            full={own}
            onMeshes={track("shoes")}
          />
        </Suspense>
      )}
    </group>
  );
}

// every doll needs the body, so start fetching it with the code
useGLTF.preload(`${MODELS}/body.glb`);
useGLTF.preload(`${MODELS}/body-lo.glb`);

/** Starts fetching a look's hair, garments and shoes before any doll mounts:
 * the player's own parts download alongside the body instead of after it. */
export function preloadLook(look: Look, swim: SwimLook | null = null) {
  const parts = partsFor(look, swim);
  // the player's own doll wears the full parts only (Part's `full`)
  for (const url of [
    parts.hair,
    ...parts.garments.map((g) => g.url),
    parts.shoes,
  ])
    if (url) useGLTF.preload(url);
}
