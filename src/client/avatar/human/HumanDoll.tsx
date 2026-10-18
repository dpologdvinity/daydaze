import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { couplePoseAt, type CoupleRole } from "../../../game/dance/couple.ts";
import {
  STILL_CLIPS,
  stillClipsOf,
  createPose,
  danceMove,
  loadMocap,
  poseAt,
  type DanceMoveId,
  type Pose,
} from "../../../game/dance/moves.ts";
import {
  FACE_PRESETS,
  FIGURES,
  FACE_SLIDERS,
  faceOf,
  seededFace,
  piercingsOf,
  seededMakeup,
  encodeMakeup,
  type Face,
  silhouetteOf,
  type Look,
  type Silhouette,
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
import { SIT_DROP, pose, type Rig } from "../pose.ts";
import { useQuality } from "../../world/quality.ts";
import { gaitOf, type GaitId } from "../../../game/gaits.ts";

// strangers walk naturally, a few with more swing
const NPC_GAITS: GaitId[] = [
  "natural",
  "relaxed",
  "natural",
  "confident",
  "sassy",
];
import { paintFace, paintIris, paintLashes, readMarks } from "./faceCanvas.ts";
import { Jewelry, readAnchors } from "./Jewelry.tsx";

/**
 * The 3D doll: a skinned, shape-keyed body built in Blender from MakeHuman's
 * CC0 base (art/doll/blender/), with hair and clothes as separate models on
 * the same rig, loaded only when worn. Poses come from the same pose code as
 * the old doll: it poses plain groups, and their transforms are copied onto
 * the bones each frame.
 */

const MODELS = "/models/doll";
const REST_LID = 0.12;

// the motion-capture keys come in their own chunk, fetched once a doll exists
void loadMocap();

// a doll given no held pose (an NPC) strikes one of these, by seed; the
// first, none, keeps the built hip-pop pose (or the built sit)
const POSE_HOLDS = [undefined, ...stillClipsOf("pose").map((c) => c.id)];
const SIT_HOLDS = [undefined, ...stillClipsOf("sit").map((c) => c.id)];
// meters from the camera where a doll swaps to and from the low-poly body
const LOD_FAR = 9;
const LOD_NEAR = 8;
const worldPos = new THREE.Vector3();
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
} & Omit<ThreeElements["group"], "children">;

// shortcut: shoes follow the outfit until the closet has a shoe picker
const SHOES: Record<Silhouette, string> = {
  flares: "sneakers",
  mini: "platforms",
  fur: "boots",
  jeans: "sneakers",
  shorts: "sneakers",
  blouse: "platforms",
};

/** The part files a look wears, by kind. */
// salon styles wear the closest 3D hair until they get models of their own
const HAIR: Partial<Record<Look["hairStyle"], string>> = {
  "sleek-bob": "bob",
  "curl-cloud": "mid-curly",
};

export function partsFor(look: Look, swim: SwimLook | null) {
  // shop outfits are cut from the three starting silhouettes
  const cut = silhouetteOf(look.outfit);
  return {
    hair: `${MODELS}/hair-${HAIR[look.hairStyle] ?? look.hairStyle}.glb`,
    outfit: swim
      ? `${MODELS}/swim-${swim.style}.glb`
      : `${MODELS}/outfit-${cut}.glb`,
    shoes: swim ? null : `${MODELS}/shoes-${SHOES[cut]}.glb`,
    tucks: swim
      ? [`tuck_${swim.style}`]
      : [`tuck_${cut}`, `tuck_${SHOES[cut]}`],
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

function useBody(look: Look, eyeColor: Face["eyeColor"]) {
  const gltf = useGLTF(`${MODELS}/body.glb`);
  const loGltf = useGLTF(`${MODELS}/body-lo.glb`);
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    const bones = new Map<string, THREE.Bone>();
    scene.traverse((o) => {
      if (o instanceof THREE.Bone) bones.set(o.name, o);
    });
    const rest = new Map<string, THREE.Vector3>();
    for (const [name, bone] of bones) rest.set(name, bone.position.clone());
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
      lods.push(mesh);
      scene.add(mesh);
    });
    return {
      scene,
      near,
      far: lods[0] ?? null,
      bones,
      rest,
      marks: readMarks(meta),
      anchors: readAnchors(meta),
      restInverse,
      skin,
      eye,
      materials: [skin, lashes, eye, cornea],
    };
  }, [gltf, loGltf]);

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
      tex?.dispose();
    };
  }, [
    body,
    look.skin,
    look.lips,
    look.brows,
    look.shadow,
    look.makeup,
    invalidate,
  ]);
  useEffect(() => {
    const tex = paintIris(eyeColor);
    body.eye.map?.dispose();
    body.eye.map = tex;
    body.eye.needsUpdate = true;
    invalidate();
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
          "  float glint = 0.3 + 0.7 * fract(strand * 7.13);",
          "  vec3 T1 = normalize(T + normal * (0.08 + shift));",
          "  vec3 T2 = normalize(T + normal * (-0.12 + shift));",
          "  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {",
          "    vec3 L = directionalLights[i].direction;",
          "    vec3 H = normalize(L + V);",
          "    float lit = smoothstep(-0.25, 0.5, dot(normal, L));",
          "    float a = hairLobe(T1, H, 90.0) * 0.22 * glint;",
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
  });
  // the shine bands run along strand cards; on the broad, smooth scalp cap
  // they would read as white streaks, so the cap stays matte
  return map && cutout ? hairShine(material) : material;
}

type Tint = { color: string; kind: "hair" | "cloth" | "gloss" | "keep" };

/** A part's low-poly twin, worn while the doll is far off (optimize-doll.sh
 * simplifies every hair, outfit and shoe file into one). */
const lodOf = (url: string) => url.replace(/\.glb$/, "-lo.glb");

/** A worn part, re-bound to the body's bones and tinted; past the doll's
 * LOD distance its low-poly twin shows instead. */
function Part({
  url,
  bones,
  tint,
  far,
  onMeshes,
}: {
  url: string;
  bones: Map<string, THREE.Bone>;
  tint: Tint;
  /** Set while the doll wears its far LOD. */
  far: { current: boolean };
  /** The part's meshes, and how far its soles lift the doll (meters). */
  onMeshes: (meshes: THREE.Mesh[] | null, lift: number) => void;
}) {
  const gltf = useGLTF(url);
  const gltfLo = useGLTF(lodOf(url));
  // the glossy hair shading and its soft-edge pass are for capable GPUs
  const rich = useQuality() === "high";
  const part = useMemo(() => {
    const near = buildPart(gltf.scene, bones, tint, rich);
    const lo = buildPart(gltfLo.scene, bones, tint, false);
    lo.group.visible = false;
    const group = new THREE.Group();
    group.add(near.group, lo.group);
    return {
      group,
      near: near.group,
      lo: lo.group,
      materials: [...near.materials, ...lo.materials],
      lift: near.lift,
    };
  }, [gltf, gltfLo, bones, tint.color, tint.kind, rich]);
  useFrame(() => {
    if (part.lo.visible !== far.current) {
      part.lo.visible = far.current;
      part.near.visible = !far.current;
    }
  });

  useEffect(() => {
    onMeshes(morphMeshes(part.group), part.lift);
    return () => {
      onMeshes(null, 0);
      part.materials.forEach((m) => m.dispose());
    };
  }, [part, onMeshes]);
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
      // glTF marks cut-out parts as blend or mask; an opaque one keeps its fill
      const cutout = Boolean(old && (old.transparent || old.alphaTest > 0));
      // the hair shine runs across each strand: it needs the cards' real
      // tangents (shared geometry, so once per part), kept under their own
      // name so no material takes them for a normal-map frame
      const g = src.geometry;
      if (
        tint.kind === "hair" &&
        old?.map &&
        !g.getAttribute("hairTangent") &&
        g.index &&
        g.getAttribute("normal") &&
        g.getAttribute("uv")
      ) {
        g.computeTangents();
        g.setAttribute("hairTangent", g.getAttribute("tangent"));
        g.deleteAttribute("tangent");
      }
      const mat =
        tint.kind === "hair"
          ? hairMaterial(tint.color, old?.map ?? null, hasShade, rich, cutout)
          : new THREE.MeshStandardMaterial({
              map: old?.map ?? null,
              color: tint.kind === "keep" ? "#ffffff" : tint.color,
              roughness: tint.kind === "gloss" ? 0.22 : 0.7,
            });
      materials.push(mat);
      mesh.material = mat;
      group.add(mesh);
      // strand cards draw twice: a solid core that writes depth, then the
      // thin wisps at the card edges blended on top, so the hairline and ends
      // read soft instead of cut out
      if (rich && tint.kind === "hair" && old?.map && cutout) {
        // the wisps pass is plain standard shading: thin edges show no
        // highlight anyway, and blended overdraw is the costly part
        const wisps = new THREE.MeshStandardMaterial({
          map: old.map,
          color: tint.color,
          vertexColors: hasShade,
          roughness: 0.5,
          side: THREE.DoubleSide,
          alphaTest: 0.12,
          transparent: true,
          depthWrite: false,
        });
        materials.push(wisps);
        const soft = mesh.clone();
        soft.bind(skeleton, src.bindMatrix);
        soft.morphTargetInfluences?.fill(0);
        soft.material = wisps;
        soft.renderOrder = 1;
        group.add(soft);
      }
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
  body: shape = DEFAULT_BODY,
  ...rest
}: Props) {
  // NPC looks carry no face, so their seed picks one
  const heightScale = bodyScales(shape).height;
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
  const piercings = useMemo(() => piercingsOf(look), [look.piercings]);
  const parts = partsFor(look, swim);
  const tuckKey = parts.tucks.join(",");
  const tucks = useMemo(() => tuckKey.split(","), [tuckKey]);
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
    keys.push(["bust", (shape.bust - 50) / 50]);
    keys.push(["hips", (shape.hips - 50) / 50]);
    keys.push(["waist", (shape.waist - 50) / 50]);
    return keys;
  }, [face, shape]);
  const shapedFor = useRef<THREE.Mesh[] | null>(null);
  const shapedWith = useRef<typeof shapeKeys | null>(null);
  const lift = useRef(0);
  // read by each worn part, to swap in its low-poly twin
  const farParts = useRef(false);
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

  useFrame((state, dt) => {
    // never show the body before its outfit (or swimsuit) and hair have
    // loaded: a doll stays hidden while they're still downloading
    if (root.current)
      root.current.visible =
        worn.current.has("outfit") && worn.current.has("hair");
    // far dolls swap to the low-poly body; the gap is hysteresis
    if (root.current && body.far) {
      // last frame's world matrix is close enough for picking a LOD, and
      // reading it costs nothing (getWorldPosition re-walks every parent)
      worldPos.setFromMatrixPosition(root.current.matrixWorld);
      const d = worldPos.distanceTo(state.camera.position);
      const isFar = d > (body.far.visible ? LOD_NEAR : LOD_FAR);
      if (isFar !== body.far.visible) {
        body.far.visible = isFar;
        for (const m of body.near) m.visible = !isFar;
      }
      farParts.current = isFar;
    }
    const t = state.clock.elapsedTime + seed * 7.3;
    const speed = walk?.current.speed ?? 0;
    const moving = speed > 0.05;
    phase.current += dt * speed * 6.2 * gait.cadence;
    // a seated NPC takes a seated hold, not a standing one lowered onto the seat
    const seeded = mood === "sit" ? SIT_HOLDS : POSE_HOLDS;
    const hold = picked ?? seeded[seed % seeded.length];
    const held =
      !moving && hold && (mood === "pose" || mood === "sit")
        ? STILL_CLIPS.get(hold)
        : undefined;
    const move =
      held ?? (mood === "dance" && !moving ? danceMove(dance) : null);
    const danced = !move
      ? null
      : couple && !held
        ? couplePoseAt(move, couple, t, sampled)
        : poseAt(move, t, sampled);
    // a captured sit keeps its legs but sits at the game's seat height
    if (danced && held && mood === "sit") danced.root[1] = SIT_DROP;
    pose(
      proxy,
      moving ? "walk" : held ? "dance" : mood,
      t,
      phase.current,
      calm,
      danced,
      buzzed ? liveDrunk.wobble : 0,
      gait,
    );
    for (const j of JOINTS) {
      const g = proxy[j];
      const bone = body.bones.get(j);
      const r = body.rest.get(j);
      if (!g || !bone || !r) continue;
      bone.quaternion.copy(g.quaternion);
      bone.position.copy(r).add(g.position);
      if (j === "body") bone.position.y += lift.current;
      bone.scale.copy(g.scale);
    }
    // blink and a faint smile, on every mesh that carries the keys
    const tm = state.clock.elapsedTime;
    const closed = tm > blinkAt.current && tm < blinkAt.current + 0.14;
    // open eyes rest with the upper lid a little lowered, not wide and staring
    setMorph(wornList.current, "blink", closed ? 1 : REST_LID);
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
      <Suspense fallback={null}>
        <Part
          key={parts.hair}
          url={parts.hair}
          bones={body.bones}
          tint={{ color: look.hairColor, kind: "hair" }}
          far={farParts}
          onMeshes={track.hair}
        />
      </Suspense>
      <Suspense fallback={null}>
        <Part
          key={parts.outfit}
          url={parts.outfit}
          bones={body.bones}
          tint={{ color: swim?.color ?? look.outfitColor, kind: "cloth" }}
          far={farParts}
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
              SHOES[silhouetteOf(look.outfit)] === "sneakers"
                ? { color: "#ffffff", kind: "keep" }
                : {
                    color:
                      silhouetteOf(look.outfit) === "mini"
                        ? "#f6e7ff"
                        : look.outfitColor,
                    kind: "gloss",
                  }
            }
            far={farParts}
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
  for (const url of [parts.hair, parts.outfit, parts.shoes])
    if (url) {
      useGLTF.preload(url);
      useGLTF.preload(lodOf(url));
    }
}
