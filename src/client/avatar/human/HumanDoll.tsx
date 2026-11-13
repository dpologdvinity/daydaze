import { useGLTF } from "@react-three/drei";
import { afterSceneReady } from "../../world/ready.ts";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { HIDDEN_BONES, Prosthetics } from "./Prosthetics.tsx";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { couplePoseAt, type CoupleRole } from "../../../game/dance/couple.ts";
import {
  stillClipsOf,
  createPose,
  danceMove,
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
  FACE_PRESETS,
  limbsOf,
  LIMB_SPOTS,
  FIGURES,
  FACE_SLIDERS,
  faceOf,
  seededFace,
  piercingsOf,
  seededMakeup,
  encodeMakeup,
  type Face,
  makeupOf,
  type Look,
  shoesOf,
  type Mood,
  type SwimLook,
} from "../../../game/look.ts";
import { liveDrunk } from "../../effects/drunk.ts";
import { useReducedMotion } from "../../motion.ts";
import {
  DEFAULT_BODY,
  bodyScales,
  type BodyShape,
} from "../../../game/body.ts";
import { pose, type Rig } from "../pose.ts";
import { useQuality } from "../../world/quality.ts";
import { NPC_GAITS, gaitOf } from "../../../game/gaits.ts";
import { BUILT_STRIDE, walkPhaseRate } from "../../../game/dance/stride.ts";
import {
  BONE,
  BuiltPose,
  clipsFor,
  loadAnims,
  loadPack,
  packsFor,
} from "./anims.ts";
import { idleSlot } from "../../../game/dance/idlePlan.ts";
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
  readMarks,
  releaseFace,
  releaseIris,
  sharedLashes,
} from "./faceCanvas.ts";
import { Jewelry, readAnchors } from "./Jewelry.tsx";
import { Glasses } from "./Glasses.tsx";
import { HearingAids } from "./HearingAids.tsx";

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
const REST_LID = 0.12;

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
};

type Props = {
  /** Closet body sliders, 0 to 100 each. */
  body?: BodyShape;
  look: Look;
  swim?: SwimLook | null;
  mood: Mood;
  dance?: DanceMoveId;
  couple?: CoupleRole;
  /** A held motion-capture pose (STILL_CLIPS id) for the pose and sit moods. */
  hold?: string;
  buzzed?: boolean;
  walk?: { current: WalkState };
  seed?: number;
  /** The player's own doll: full detail at any distance on the low tier. */
  own?: boolean;
  /** False where sitting down or standing up must not play a clip (a ride
   * that carries her seated). */
  joins?: boolean;
} & Omit<ThreeElements["group"], "children">;

/** The part files a look wears, by kind. */
// salon styles wear the closest 3D hair until they get models of their own
const HAIR: Partial<Record<Look["hairStyle"], string>> = {
  "sleek-bob": "bob",
  "curl-cloud": "mid-curly",
};

export function partsFor(look: Look, swim: SwimLook | null) {
  const cut = look.outfit;
  // a man wears the parts fitted to the man's body
  const m = modelSuffix(look);
  return {
    // bald wears no hair model at all
    hair:
      look.hairStyle === "bald"
        ? null
        : `${MODELS}/hair-${HAIR[look.hairStyle] ?? look.hairStyle}${m}.glb`,
    outfit: swim
      ? `${MODELS}/swim-${swim.style}${m}.glb`
      : `${MODELS}/outfit-${cut}${m}.glb`,
    shoes: swim ? null : `${MODELS}/shoes-${shoesOf(look)}${m}.glb`,
    tucks: swim
      ? [`tuck_${swim.style}`]
      : [`tuck_${cut}`, `tuck_${shoesOf(look)}`],
  };
}

const morphMeshes = (root: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.morphTargetDictionary) out.push(o);
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
function Wheelchair({ walk }: { walk?: { current: WalkState } }) {
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

function useBody(look: Look, eyeColor: Face["eyeColor"]) {
  // women and men are separate dolls, each with its own skeleton
  const m = modelSuffix(look);
  const gltf = useGLTF(`${MODELS}/body${m}.glb`);
  const loGltf = useGLTF(`${MODELS}/body${m}-lo.glb`);
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    const bones = new Map<string, THREE.Bone>();
    scene.traverse((o) => {
      if (o instanceof THREE.Bone) bones.set(o.name, o);
    });
    // the built-pose driver reads the bones' rest, so it is made first
    const built = new BuiltPose(bones, scene);
    const pony = bones.get(BONE.pony) ?? null;
    // model space to each bone's rest frame, for jewelry hung on bones;
    // the fresh clone is unparented, so its world space is model space
    scene.updateMatrixWorld(true);
    const restInverse = new Map<string, THREE.Matrix4>();
    for (const [name, bone] of bones)
      restInverse.set(name, bone.matrixWorld.clone().invert());
    let meta: unknown = null;
    scene.traverse((o) => {
      if (typeof o.userData.doll === "string") meta = o.userData.doll;
    });
    // a little self-glow from the skin's own texture softens harsh room
    // lighting into the dewy glam finish
    const skin = new THREE.MeshStandardMaterial({
      roughness: 0.58,
      emissive: "#ffffff",
      emissiveIntensity: 0.07,
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
      if (!(o instanceof THREE.Mesh)) return;
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
      if (
        o instanceof THREE.SkinnedMesh &&
        (o.material === skin || o.material === lashes)
      )
        near.push(o);
    });
    const lods: THREE.SkinnedMesh[] = [];
    loGltf.scene.traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh) || lods.length) return;
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
    for (const mesh of near)
      if (mesh instanceof THREE.SkinnedMesh) addShinWeights(mesh);
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
      marks: readMarks(meta),
      anchors: readAnchors(meta),
      restInverse,
      skin,
      eye,
      materials: [skin, lashes, eye, cornea],
    };
  }, [gltf, loGltf, m]);

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
          // each strand's highlight sits a little higher or lower
          "  #ifdef USE_MAP",
          "  float strand = fract(sin(floor(vMapUv.x * 40.0) * 12.9898) * 43758.5453);",
          "  #else",
          "  float strand = 0.5;",
          "  #endif",
          "  float shift = (strand - 0.5) * 0.35;",
          // straight locks sit near the highlight angle all along, so the
          // white lobe is kept faint and broken up strand by strand
          "  float glint = 0.5 + 0.5 * fract(strand * 7.13);",
          // the white lobe is a sparkle against dark hair: dimmer on it
          "  float dim = 0.4 + 0.6 * clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 4.0, 0.0, 1.0);",
          "  vec3 T1 = normalize(T + normal * (0.08 + shift));",
          "  vec3 T2 = normalize(T + normal * (-0.12 + shift));",
          "  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {",
          "    vec3 L = directionalLights[i].direction;",
          "    vec3 H = normalize(L + V);",
          "    float lit = smoothstep(-0.25, 0.5, dot(normal, L));",
          "    float a = hairLobe(T1, H, 36.0) * 0.2 * glint * dim;",
          "    float b = hairLobe(T2, H, 22.0) * 0.35;",
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
    roughness: map ? 0.7 : 0.55,
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

type Tint = { color: string; kind: "hair" | "cloth" | "gloss" | "keep" };

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
  const rich = useQuality() === "high";
  const { color, kind } = tint;
  const lo = useMemo(
    () => buildPart(gltfLo.scene, bones, { color, kind }, full && rich),
    [gltfLo, bones, color, kind, full, rich],
  );
  // the full model, once it has been wanted and has loaded
  const [wantNear, setWantNear] = useState(false);
  const [near, setNear] = useState<Built | null>(null);
  useFrame(() => {
    if (full) return;
    if (!wantNear && !far.current) setWantNear(true);
    const showLo = far.current || !near;
    if (lo.group.visible !== showLo) lo.group.visible = showLo;
    if (near && near.group.visible === showLo) near.group.visible = !showLo;
  });
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
  const rich = useQuality() === "high";
  const { color, kind } = tint;
  const part = useMemo(
    () => buildPart(gltf.scene, bones, { color, kind }, rich),
    [gltf, bones, color, kind, rich],
  );
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
      if (o instanceof THREE.SkinnedMesh) meshes.push(o);
    });
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    let lift = 0;
    scene.traverse((o) => {
      const v: unknown = o.userData.lift;
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 0.2)
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
  hold: picked,
  buzzed = false,
  walk,
  seed = 0,
  own = false,
  joins = true,
  body: shape = DEFAULT_BODY,
  ...rest
}: Props) {
  // NPC looks carry no face, so their seed picks one
  const heightScale = bodyScales(shape).height;
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
  const gait = gaitOf(
    look.gait ?? (seed ? NPC_GAITS[seed % NPC_GAITS.length] : undefined),
  );
  const piercingCode = look.piercings;
  const piercings = useMemo(
    () => piercingsOf({ piercings: piercingCode }),
    [piercingCode],
  );
  const parts = partsFor(look, swim);
  const tuckKey = parts.tucks.join(",");
  const tucks = useMemo(() => tuckKey.split(","), [tuckKey]);
  const calm = useReducedMotion();
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);
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
  // every face and body key with its value: face sliders, figure, face
  // presets (the picked option at 1, the group's others at 0) and the closet
  // body sliders (50 is the base shape, 0 and 100 the key at -1 and 1)
  const shapeKeys = useMemo((): readonly (readonly [string, number])[] => {
    const keys: [string, number][] = [];
    for (const s of FACE_SLIDERS) keys.push([s.id, face[s.id]]);
    for (const b of FIGURES)
      if (b.id !== "classic") keys.push([b.id, face.figure === b.id ? 1 : 0]);
    for (const g of FACE_PRESETS)
      for (const o of g.options.slice(1))
        keys.push([`${g.key}_${o.id}`, face[g.field] === o.id ? 1 : 0]);
    // the monolid has no key of its own: a deep fold-down (the hooded key)
    // with a slight lift at the outer corners
    if (face.eyeShape === "monolid") {
      keys.push(["eye_hooded", 0.9]);
      keys.push(["eye_upturned", 0.3]);
    }
    // the man's body has no bust key (setMorph skips a missing key)
    keys.push(["bust", (shape.bust - 50) / 50]);
    keys.push(["hips", (shape.hips - 50) / 50]);
    keys.push(["waist", (shape.waist - 50) / 50]);
    return keys;
  }, [face, shape]);
  const shapedFor = useRef<THREE.Mesh[] | null>(null);
  const shapedWith = useRef<typeof shapeKeys | null>(null);
  const lift = useRef(0);
  // read by each worn part, to swap in its low-poly twin
  // start far, so nobody fetches full parts before their first LOD check
  const farParts = useRef(true);
  const lidShown = useRef(-1);
  const lidMeshes = useRef<THREE.Mesh[] | null>(null);
  // a far doll's skeleton updates every third frame (thinned): the time owed
  const owed = useRef({ dt: 0, tick: 0 });
  const track = useMemo(() => {
    const make = (key: string) => (meshes: THREE.Mesh[] | null, up: number) => {
      if (meshes) worn.current.set(key, meshes);
      else worn.current.delete(key);
      if (key === "shoes") lift.current = up;
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
          setMorph([m], name, tucks.includes(name) ? 1 : 0);
    }
  }, [bodyMeshes, tucks]);

  useFrame((state, rawDt) => {
    const dt = rawDt * TIME_SCALE;
    // never show the body before its outfit (or swimsuit) and hair have
    // loaded: a doll stays hidden while they're still downloading
    if (root.current)
      root.current.visible =
        worn.current.has("outfit") && (!parts.hair || worn.current.has("hair"));
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
        const slot = idleSlot(own ? now - a.since : t);
        want = pickClip({
          loaded: clips !== null,
          packs: packsFor(body.key),
          own,
          slot,
          speed: pace,
          walk: gait.clip,
          mood,
          hold,
          dance,
          couple,
          seed,
          afloat: afloatNow,
          seated: gait.seated,
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
          next.time = once ? 0 : (from + want.offset) % clip.duration;
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
      body.built.restore();
      if (a.action) a.mixer.update(animDt);
      if (a.built > 0) {
        const move = mood === "dance" && !moving ? danceMove(dance) : null;
        const danced = !move
          ? null
          : couple
            ? couplePoseAt(move, couple, t, sampled)
            : poseAt(move, t, sampled);
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
    // blink and a faint smile, on every mesh that carries the keys
    const tm = state.clock.elapsedTime;
    const closed = tm > blinkAt.current && tm < blinkAt.current + 0.14;
    // open eyes rest with the upper lid a little lowered, not wide and staring
    // only when it changes (or new meshes mount): a dictionary lookup per
    // worn mesh per doll per frame adds up in a crowd
    const lid = closed ? 1 : REST_LID;
    if (lidShown.current !== lid || lidMeshes.current !== wornList.current) {
      lidShown.current = lid;
      lidMeshes.current = wornList.current;
      setMorph(wornList.current, "blink", lid);
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
            onMeshes={track.hair}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Part
          key={parts.outfit}
          url={parts.outfit}
          bones={body.bones}
          tint={{ color: swim?.color ?? look.outfitColor, kind: "cloth" }}
          far={farParts}
          full={own}
          onMeshes={track.outfit}
        />
      </Suspense>
      {parts.shoes && (
        <Suspense fallback={null}>
          <Part
            key={parts.shoes}
            url={parts.shoes}
            bones={body.bones}
            tint={
              shoesOf(look) === "sneakers"
                ? { color: "#ffffff", kind: "keep" }
                : {
                    color:
                      look.outfit === "mini" ? "#f6e7ff" : look.outfitColor,
                    kind: "gloss",
                  }
            }
            far={farParts}
            full={own}
            onMeshes={track.shoes}
          />
        </Suspense>
      )}
    </group>
  );
}

// every doll needs the body, so start fetching it with the code
useGLTF.preload(`${MODELS}/body.glb`);
useGLTF.preload(`${MODELS}/body-lo.glb`);

/** Starts fetching a look's hair, outfit and shoes before any doll mounts:
 * the player's own parts download alongside the body instead of after it. */
export function preloadLook(look: Look, swim: SwimLook | null = null) {
  const parts = partsFor(look, swim);
  // the player's own doll wears the full parts only (Part's `full`)
  for (const url of [parts.hair, parts.outfit, parts.shoes])
    if (url) useGLTF.preload(url);
}
