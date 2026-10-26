// Dev-only doll lab, not linked from the game. Open
// /src/client/avatar/lineup.html?shot=face|body|lineup|far on the dev server.
// Writes draw-call and triangle counts to data-stats on <body> for before/after.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import {
  decodeMakeup,
  DEFAULT_LOOK,
  HAIR_STYLES,
  OUTFITS,
  BEARDS,
  type Look,
} from "../../game/look.ts";
import { ToonDoll as Doll } from "./Doll.tsx";
import { HumanDoll } from "./human/HumanDoll.tsx";
import { isDanceMoveId, stillClipsOf } from "../../game/dance/moves.ts";
import { liftOf, roleMove, together } from "../../game/dance/together.ts";
import { GAITS } from "../../game/gaits.ts";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";

// ?human=1 shows the 3D doll built in Blender instead of the toon doll
const human = new URLSearchParams(location.search).get("human") === "1";

const shot = new URLSearchParams(location.search).get("shot") ?? "lineup";
// ?still=1 draws 8 frames on demand and stops: SwiftShader queues GPU work,
// so a live loop leaves a capture minutes behind
const still = new URLSearchParams(location.search).get("still") === "1";

/** `?hair=<style>` swaps the face shot's hair, for checking one style. */
function hairParam(): Look["hairStyle"] {
  const id = new URLSearchParams(location.search).get("hair");
  return HAIR_STYLES.find((h) => h.id === id)?.id ?? "waves";
}
/** `?makeup=<code>` puts encodeMakeup's code on the face shots' doll. */
function makeupParam(): Partial<Look> {
  const q = new URLSearchParams(location.search);
  const code = q.get("makeup");
  // `?men=1` puts the face and portrait shots on the masculine body, with
  // `?beard=` (a BEARDS id)
  const beard = BEARDS.find((b) => b.id === q.get("beard"))?.id;
  return {
    ...(code && decodeMakeup(code) ? { makeup: code } : {}),
    ...(q.get("men") === "1"
      ? { body: "masculine", lips: "lips-bare-balm", beard: beard ?? "none" }
      : {}),
  };
}
// `?moves=a,b` picks the dance shot's moves
const DANCES = (
  new URLSearchParams(location.search).get("moves")?.split(",") ?? [
    "salsa",
    "lambada",
    "expressive",
    "salsa-turns",
    "groove",
  ]
).filter(isDanceMoveId);
// held poses for the pose, sit and lay shots, one per doll; `?holds=a,b`
// picks them instead
const picked = new URLSearchParams(location.search).get("holds")?.split(",");
const holdsOf = (kind: "pose" | "sit" | "lay") =>
  picked ?? stillClipsOf(kind).map((c) => c.id);
const HOLDS = {
  pose: holdsOf("pose"),
  sit: holdsOf("sit"),
  lay: holdsOf("lay"),
};
// a steady walking pace for the walk shot
const WALKING = { current: { speed: 1.4 } };

const LINEUP: Look[] = [
  {
    ...DEFAULT_LOOK,
    skin: "#f3d4c4",
    hairStyle: "waves",
    hairColor: "#f1d78f",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "flares",
    outfitColor: "#3fe0d0",
    shadow: "#ff2f9a",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#e6b48e",
    hairStyle: "ponytail",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "mini",
    outfitColor: "#9b5cff",
    shadow: "#d23cff",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#c48d68",
    hairStyle: "buns",
    hairColor: "#4a2a1c",
    lips: "lips-burgundy-cherry",
    brows: "brows-fox-snatched",
    outfit: "fur",
    outfitColor: "#e8e2ff",
    shadow: "#8a5a3c",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#94603f",
    hairStyle: "bob",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-sculpted-espresso",
    outfit: "flares",
    outfitColor: "#ffb02e",
    shadow: "#3fe0d0",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#633c29",
    hairStyle: "braids",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "mini",
    outfitColor: "#141018",
    shadow: "#ffb02e",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#633c29",
    hairStyle: "afro",
    hairColor: "#1b1014",
    lips: "lips-hot-pink-glam",
    brows: "brows-fox-snatched",
    outfit: "fur",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
];

// `?outfits=a,b,c` dresses the body shot's three dolls
const OUTFIT_PICK = new URLSearchParams(location.search)
  .get("outfits")
  ?.split(",");
const BODY = (["flares", "mini", "fur"] as const).map((fallback, i) => ({
  ...LINEUP[i],
  outfit: OUTFITS.find((o) => o.id === OUTFIT_PICK?.[i])?.id ?? fallback,
}));

// `?shot=men`: three masculine dolls, in menswear with short cuts and beards
const MEN: Look[] = [
  {
    ...DEFAULT_LOOK,
    body: "masculine",
    skin: "#c48d68",
    hairStyle: "crop",
    hairColor: "#1b1014",
    lips: "lips-bare-balm",
    brows: "brows-sculpted-espresso",
    outfit: "suit",
    outfitColor: "#141018",
    shadow: "#8a5a3c",
    beard: "short",
  },
  {
    ...DEFAULT_LOOK,
    body: "masculine",
    skin: "#633c29",
    hairStyle: "coils",
    hairColor: "#1b1014",
    lips: "lips-bare-balm",
    brows: "brows-sculpted-espresso",
    outfit: "white-tee",
    outfitColor: "#e8e2ff",
    shadow: "#8a5a3c",
    beard: "stubble",
  },
  {
    ...DEFAULT_LOOK,
    body: "masculine",
    skin: "#f3d4c4",
    hairStyle: "swept",
    hairColor: "#4a2a1c",
    lips: "lips-bare-balm",
    brows: "brows-feathered-honey",
    outfit: "puffer",
    outfitColor: "#6b7a2a",
    shadow: "#8a5a3c",
    beard: "full",
  },
];

const SHOTS = {
  men: {
    looks: MEN,
    x: (i: number) => (i - 1) * 1.4,
    cam: [0, 0.95, 6.2] as const,
    target: [0, 0.85, 0] as const,
    fov: 32,
  },
  lineup: {
    looks: LINEUP,
    x: (i: number) => (i - 2.5) * 0.95,
    cam: [0, 1.0, 9.8] as const,
    target: [0, 0.9, 0] as const,
    fov: 34,
  },
  body: {
    looks: BODY,
    x: (i: number) => (i - 1) * 1.4,
    cam: [0, 0.95, 6.2] as const,
    target: [0, 0.85, 0] as const,
    fov: 32,
  },
  face: {
    looks: [{ ...LINEUP[0], hairStyle: hairParam(), ...makeupParam() }],
    x: () => 0,
    cam: [0, 1.5, 0.95] as const,
    target: [0, 1.42, 0] as const,
    fov: 22,
  },
  // head and shoulders with the crown in frame, for judging hair
  portrait: {
    looks: [{ ...LINEUP[0], hairStyle: hairParam(), ...makeupParam() }],
    x: () => 0,
    cam: [0, 1.5, 1.25] as const,
    target: [0, 1.45, 0] as const,
    fov: 24,
  },
  // distant crowd: what a doll costs when it is far from the camera
  far: {
    looks: LINEUP.slice(0, 1),
    x: () => 0,
    cam: [0, 1.0, 26] as const,
    target: [0, 0.9, 0] as const,
    fov: 34,
  },
  // five dance moves side by side
  dance: {
    looks: LINEUP.slice(0, 5),
    x: (i: number) => (i - 2) * 1.0,
    cam: [0, 1.1, 7.2] as const,
    target: [0, 0.95, 0] as const,
    fov: 36,
  },
  // a piggyback, three-quarter on: the carrier, and the rider placed on
  // their back exactly as the game places them (together.ts)
  piggyback: {
    looks: LINEUP.slice(1, 3),
    x: () => 0,
    cam: [2.6, 1.5, 2.6] as const,
    target: [0, 1.0, 0] as const,
    fov: 38,
  },
  // every walk style, walking in place, side on
  walk: {
    looks: GAITS.map((g, i) => ({ ...LINEUP[i % LINEUP.length], gait: g.id })),
    x: (i: number) => (i - (GAITS.length - 1) / 2) * 0.9,
    cam: [0, 1.0, 9] as const,
    target: [0, 0.9, 0] as const,
    fov: 36,
  },
  // every held motion-capture pose, front on
  pose: {
    looks: HOLDS.pose.map((_, i) => LINEUP[i % LINEUP.length]),
    x: (i: number) => (i - (HOLDS.pose.length - 1) / 2) * 1.0,
    cam: [0, 1.0, 7.5] as const,
    target: [0, 0.9, 0] as const,
    fov: 36,
  },
  sit: {
    looks: HOLDS.sit.map((_, i) => LINEUP[i % LINEUP.length]),
    x: (i: number) => (i - (HOLDS.sit.length - 1) / 2) * 1.1,
    cam: [2.5, 1.2, 5] as const,
    target: [0, 0.6, 0] as const,
    fov: 36,
  },
  lay: {
    looks: HOLDS.lay.map((_, i) => LINEUP[i % LINEUP.length]),
    x: () => 0,
    cam: [2.5, 1.5, 3.5] as const,
    target: [0, 0.4, 0] as const,
    fov: 40,
  },
  // every piercing, close up: lip, nose and brow on one, navel on another
  pierce: {
    looks: [
      { ...LINEUP[1], hairStyle: "buns" as const, piercings: "4321" },
      { ...LINEUP[3], outfit: "flares" as const, piercings: "0002" },
    ],
    x: (i: number) => (i - 0.5) * 0.5,
    cam: [0, 1.3, 1.6] as const,
    target: [0, 1.25, 0] as const,
    fov: 40,
  },
  // three makeup looks, close up
  makeup: {
    looks: [
      { ...LINEUP[0], makeup: "220100" },
      { ...LINEUP[3], lips: "lips-red-carpet" as const, makeup: "432232" },
      { ...LINEUP[5], lips: "lips-mauve-velvet" as const, makeup: "135123" },
    ],
    x: (i: number) => (i - 1) * 0.32,
    cam: [0, 1.56, 1.25] as const,
    target: [0, 1.53, 0] as const,
    fov: 30,
  },
  // every hair style from behind and the side, close enough to judge strands
  hair: {
    looks: (
      ["waves", "ponytail", "bob", "braids", "afro", "buns"] as const
    ).map((hairStyle, i) => ({ ...LINEUP[i % LINEUP.length], hairStyle })),
    x: (i: number) => (i - 2.5) * 0.62,
    cam: [0.6, 1.6, 2.6] as const,
    target: [0, 1.45, 0] as const,
    fov: 50,
  },
  // every free outfit, front on
  outfits: {
    looks: (
      ["flares", "mini", "fur", "jeans", "shorts", "blouse"] as const
    ).map((outfit, i) => ({ ...LINEUP[i], outfit })),
    x: (i: number) => (i - 2.5) * 0.9,
    cam: [0, 1.0, 7.5] as const,
    target: [0, 0.9, 0] as const,
    fov: 36,
  },
  // long styles close up from three-quarters behind, where cards show most
  hair3q: {
    looks: (["waves", "long-straight", "mid-wavy"] as const).map(
      (hairStyle, i) => ({ ...LINEUP[i], hairStyle }),
    ),
    x: (i: number) => (i - 1) * 0.7,
    cam: [1.6, 1.55, -1.9] as const,
    target: [0, 1.3, 0] as const,
    fov: 38,
  },
  // the low-poly LOD body seen close up, to check its seams and face
  lod: {
    looks: LINEUP.slice(0, 3),
    x: (i: number) => (i - 1) * 0.9,
    cam: [0, 1.0, 9.5] as const,
    target: [0, 0.9, 0] as const,
    fov: 12,
  },
};
type ShotName = keyof typeof SHOTS;
const plan = SHOTS[shot as ShotName] ?? SHOTS.lineup;
// `?cam=x,y,z` moves the shot's camera, to look at a pose from another side
const camAt = new URLSearchParams(location.search)
  .get("cam")
  ?.split(",")
  .map(Number);
const cam =
  camAt?.length === 3 && camAt.every(Number.isFinite)
    ? ([camAt[0], camAt[1], camAt[2]] as const)
    : plan.cam;

function measure(root: THREE.Object3D) {
  let calls = 0;
  let tris = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent)
      if (!p.visible) return;
    const g = o.geometry;
    const n = g.index ? g.index.count : g.attributes.position.count;
    calls += Array.isArray(o.material) ? o.material.length : 1;
    tris += n / 3;
  });
  return { calls, tris: Math.round(tris) };
}

function Probe({ count }: { count: number }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (still && frames.current < 8) invalidate();
    document.body.dataset.frames = String(frames.current);
    if (frames.current !== 12) return;
    const dolls = Array.from({ length: count }, (_, i) =>
      measure(scene.getObjectByName(`doll-${i}`) ?? new THREE.Object3D()),
    );
    const total = measure(scene);
    document.body.dataset.stats = JSON.stringify({ dolls, scene: total });
  });
  return null;
}

function Lab() {
  return (
    <Canvas
      frameloop={still ? "demand" : "always"}
      dpr={1}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{
        position: [...cam],
        fov: plan.fov,
        near: 0.05,
        far: 200,
      }}
      onCreated={({ camera, gl, scene }) => {
        // dev-only: lets a test script inspect the lab scene
        Reflect.set(window, "labScene", scene);
        camera.lookAt(plan.target[0], plan.target[1], plan.target[2]);
        gl.setClearColor("#07020b");
      }}
    >
      {human && (
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 3, 1]} />
          <Lightformer
            intensity={1.2}
            color="#ff74d4"
            position={[-4, 1, -2]}
            scale={[3, 3, 1]}
          />
          <Lightformer
            intensity={1}
            color="#7bdcff"
            position={[4, 1, -1]}
            scale={[3, 3, 1]}
          />
        </Environment>
      )}
      <ambientLight intensity={human ? 0.3 : 0.9} />
      <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.6} />
      <directionalLight
        position={[-2, 1, -2]}
        intensity={0.5}
        color="#ff74d4"
      />
      {plan.looks.map((look, i) => (
        <group
          key={i}
          name={`doll-${i}`}
          position={
            shot === "piggyback" && i === 1
              ? [0, liftOf("piggyback"), -together("piggyback").gap]
              : [plan.x(i), 0, 0]
          }
        >
          {human ? (
            <Suspense fallback={null}>
              <HumanDoll
                look={look}
                mood={
                  shot === "dance" || shot === "piggyback"
                    ? "dance"
                    : shot === "sit" || shot === "lay"
                      ? "sit"
                      : shot === "pose"
                        ? "pose"
                        : "idle"
                }
                hold={
                  shot === "pose" || shot === "sit" || shot === "lay"
                    ? HOLDS[shot][i]
                    : "none"
                }
                dance={
                  shot === "piggyback"
                    ? roleMove("piggyback", i === 0 ? "lead" : "follow")
                    : DANCES[i % DANCES.length]
                }
                seed={i}
                walk={shot === "walk" ? WALKING : undefined}
                rotation-y={shot === "walk" ? Math.PI / 2 : 0}
              />
            </Suspense>
          ) : (
            <Doll look={look} mood="idle" seed={i} />
          )}
        </group>
      ))}
      <Probe count={plan.looks.length} />
    </Canvas>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("lineup.html is missing #root.");
createRoot(root).render(<Lab />);
