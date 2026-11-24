// Dev-only doll lab, not linked from the game. Open
// /src/client/avatar/lineup.html?shot=face|body|lineup|far on the dev server.
// Writes draw-call and triangle counts to data-stats on <body> for before/after.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import {
  decodeFace,
  encodeFace,
  DEFAULT_FACE,
  SKINS,
  decodeMakeup,
  DEFAULT_LOOK,
  HAIR_COLORS,
  HAIR_STYLES,
  isShoe,
  OUTFITS,
  BEARDS,
  type Look,
} from "../../game/look.ts";
import { decodeWear } from "../../game/wardrobe.ts";
import { ToonDoll as Doll } from "./Doll.tsx";
import { HumanDoll } from "./human/HumanDoll.tsx";
import {
  danceMove,
  isDanceMoveId,
  stillClipsOf,
} from "../../game/dance/moves.ts";
import {
  followSpot,
  isTogetherId,
  liftOf,
  mirrored,
  roleMove,
  together,
} from "../../game/dance/together.ts";
import { pinPairClock } from "./pairClock.ts";
import { faceHeight } from "../../game/dance/reach.ts";
import { GAIT_LIST } from "../../game/gaits.ts";
import { naturalPace } from "../../game/dance/clips.ts";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { BODY_TRAITS, cleanBody, DEFAULT_BODY } from "../../game/body.ts";
import { isBone, isMesh } from "../world/guards.ts";

// ?human=1 shows the 3D doll built in Blender instead of the toon doll
const human = new URLSearchParams(location.search).get("human") === "1";

const shot = new URLSearchParams(location.search).get("shot") ?? "lineup";
const portraitLift =
  new URLSearchParams(location.search).get("men") === "1" ? 0.08 : 0;
// shots whose dolls walk in place, side on
const walksInPlace = ["walk", "limbswalk", "trackwalk"].includes(shot);
// ?still=1 draws 8 frames on demand and stops: SwiftShader queues GPU work,
// so a live loop leaves a capture minutes behind
const still = new URLSearchParams(location.search).get("still") === "1";
// Neutral studio lighting for comparing anatomy and materials with references.
const studio = new URLSearchParams(location.search).get("studio") === "1";
const bodyParams = cleanBody(
  Object.fromEntries(
    BODY_TRAITS.map((trait) => {
      const value = new URLSearchParams(location.search).get(trait);
      return [trait, value === null ? DEFAULT_BODY[trait] : Number(value)];
    }),
  ),
);

/** `?hair=<style>` swaps the face shot's hair, for checking one style. */
function hairParam(): Look["hairStyle"] {
  const id = new URLSearchParams(location.search).get("hair");
  return HAIR_STYLES.find((h) => h.id === id)?.id ?? DEFAULT_LOOK.hairStyle;
}
/** `?makeup=<code>` puts encodeMakeup's code on the face shots' doll. */
function makeupParam(): Partial<Look> {
  const q = new URLSearchParams(location.search);
  const code = q.get("makeup");
  // `?face=<code>` likewise puts encodeFace's code on it (a monolid, say)
  const faceCode = q.get("face");
  // `?skin=<index>` picks a SKINS tone, to see skin marks on each
  const skin = q.has("skin") ? SKINS[Number(q.get("skin"))]?.id : undefined;
  // `?men=1` puts the face and portrait shots on the masculine body, with
  // `?beard=` (a BEARDS id)
  const beard = BEARDS.find((b) => b.id === q.get("beard"))?.id;
  return {
    ...(code && decodeMakeup(code) ? { makeup: code } : {}),
    ...(faceCode && decodeFace(faceCode) ? { face: faceCode } : {}),
    ...(skin ? { skin } : {}),
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
// `?emote=<TogetherId>` picks the together shot's emote (a kiss by default),
// and `?at=<seconds>` the moment of a timed one: mid-kiss unless set
const pairQuery = new URLSearchParams(location.search);
const EMOTE = ((e) => (isTogetherId(e) ? e : "kiss"))(pairQuery.get("emote"));
const shutAt = danceMove(roleMove(EMOTE, "lead")).shut;
const pinAt = Number(pairQuery.get("at") ?? Number.NaN);
pinPairClock(
  Number.isFinite(pinAt) ? pinAt : shutAt ? (shutAt[0] + shutAt[1]) / 2 : 0,
);
// the together shot's couples, side on, each placed as the game places a
// pair (together.ts): even heights, a tall lead with a short follow, and a
// masculine lead with a short follow
const PAIR_HEIGHTS = [50, 50, 100, 0, 50, 0];
const pairSpot = (i: number) => {
  const lead: [number, number] = [
    (Math.floor(i / 2) - 1) * 1.3 - together(EMOTE).gap / 2,
    0,
  ];
  // yaw pi/2 faces +x: the camera on +z sees each pair in profile
  const spot =
    i % 2 === 0
      ? { at: lead, yaw: Math.PI / 2 }
      : followSpot(EMOTE, lead, Math.PI / 2);
  return {
    at: spot.at,
    yaw: spot.yaw,
    role: i % 2 ? "follow" : "lead",
  } as const;
};

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
// the walk shot: each gait at its clip's own pace, so it plays at 1x
const WALKING = GAIT_LIST.map((g) => ({
  current: { speed: naturalPace(g.clip, false) ?? 1.4 },
}));

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
// `?wears=tee~ff2f9a.cargos~141018,...` dresses them (and the pose, sit and
// dance dolls) in mixed garments instead: one wear code per doll, garments
// split by "." and each `id~hex` (URL-safe for wardrobe.ts's "id#hex+...")
const WEAR_PICK = new URLSearchParams(location.search)
  .get("wears")
  ?.split(",")
  .map((code) =>
    code
      .split(".")
      .map((g) => g.replace("~", "#"))
      .join("+"),
  )
  .filter((code) => decodeWear(code) !== null);
// ?shoes=a,b,c picks a shoe per doll for fit and pose reviews.
const SHOE_PICK = new URLSearchParams(location.search).get("shoes")?.split(",");
const shod = (look: Look, i: number): Look => {
  const shoes = SHOE_PICK?.[i % SHOE_PICK.length];
  return isShoe(shoes) ? { ...look, shoes } : look;
};
const worn = (look: Look, i: number): Look => {
  const wear = WEAR_PICK?.[i % WEAR_PICK.length];
  return wear ? { ...look, wear } : look;
};
const BODY = (["flares", "mini", "fur"] as const).map((fallback, i) =>
  worn(
    {
      ...LINEUP[i],
      outfit: OUTFITS.find((o) => o.id === OUTFIT_PICK?.[i])?.id ?? fallback,
    },
    i,
  ),
);

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

/**
 * `?men=1&outfit=<id>` dresses the pose, sit and dance shots' dolls as men in
 * one outfit (a suit by default), to check how cloth sits over the skin in
 * motion.
 */
const suited = (look: Look): Look => {
  const q = new URLSearchParams(location.search);
  if (q.get("men") !== "1") return look;
  return {
    ...look,
    body: "masculine",
    lips: "lips-bare-balm",
    beard: "none",
    outfit: OUTFITS.find((o) => o.id === q.get("outfit"))?.id ?? "suit",
    outfitColor: "#141018",
  };
};

/**
 * `?shot=hairs&styles=a,b,c&colors=1b1014,f1d78f&men=1`: one head-and-shoulders
 * doll per style, wearing the matching color (the last one repeats), for
 * judging hair. `?cam=0,1.52,-2.4` looks from behind.
 */
function hairsLooks(): Look[] {
  const q = new URLSearchParams(location.search);
  const colors = (q.get("colors") ?? "1b1014").split(",");
  const base = q.get("men") === "1" ? MEN[0] : LINEUP[0];
  return (q.get("styles") ?? "waves").split(",").map((id, i) => ({
    ...base,
    hairStyle: HAIR_STYLES.find((h) => h.id === id)?.id ?? "waves",
    hairColor:
      HAIR_COLORS.find(
        (c) => c.id === `#${colors[Math.min(i, colors.length - 1)]}`,
      )?.id ?? base.hairColor,
    ...(q.get("men") === "1" ? { beard: "none" as const } : {}),
  }));
}

const SHOTS = {
  hairs: {
    looks: hairsLooks(),
    x: (i: number) => (i - (hairsLooks().length - 1) / 2) * 0.36,
    cam: [0, 1.52, 2.4] as const,
    target: [0, 1.4, 0] as const,
    fov: 40,
  },
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
  // The same face and outfit at three weights, with shared fitted morphs.
  builds: {
    looks: [0, 1, 2].map(() => ({ ...DEFAULT_LOOK, outfit: "jeans" as const })),
    x: (i: number) => (i - 1) * 1.25,
    cam: [0, 0.95, 4.5] as const,
    target: [0, 0.85, 0] as const,
    fov: 32,
  },
  face: {
    looks: [{ ...DEFAULT_LOOK, hairStyle: hairParam(), ...makeupParam() }],
    x: () => 0,
    cam: [0, 1.57 + portraitLift, 1.1] as const,
    target: [0, 1.53 + portraitLift, 0] as const,
    fov: 25,
  },
  // the closet's eye tile (public/closet/eye-*.webp): the eyes, close up,
  // on a clear background (`?clear=1`)
  eyetile: {
    looks: [{ ...DEFAULT_LOOK, hairStyle: "buns" as const, ...makeupParam() }],
    x: () => 0,
    cam: [0, 1.55 + portraitLift * 1.5, 0.55] as const,
    target: [0, 1.55 + portraitLift * 1.5, 0] as const,
    fov: 8,
  },
  // Native lip preset previews use the same neutral face.
  lipTile: {
    looks: [{ ...DEFAULT_LOOK, hairStyle: "buns" as const, ...makeupParam() }],
    x: () => 0,
    cam: [0, 1.482 + portraitLift * 1.375, 0.48] as const,
    target: [0, 1.482 + portraitLift * 1.375, 0] as const,
    fov: 8,
  },
  // prosthetic legs: shorts and a mini show the pylon, jeans cover it
  limbs: {
    looks: [
      { ...LINEUP[0], outfit: "shorts", limbs: "10" },
      { ...LINEUP[5], outfit: "jeans", limbs: "11" },
      { ...LINEUP[2], outfit: "mini", limbs: "01" },
    ] satisfies Look[],
    x: (i: number) => (i - 1) * 1.1,
    cam: [0.6, 0.8, 4.2] as const,
    target: [0, 0.6, 0] as const,
    fov: 30,
  },
  // the same three walking in place, side on
  limbswalk: {
    looks: [
      { ...LINEUP[0], outfit: "shorts", limbs: "11" },
      { ...LINEUP[5], outfit: "jeans", limbs: "11" },
      { ...LINEUP[2], outfit: "mini", limbs: "11" },
    ] satisfies Look[],
    x: (i: number) => (i - 1) * 1.1,
    cam: [0.6, 0.8, 4.2] as const,
    target: [0, 0.6, 0] as const,
    fov: 30,
  },
  // women walking in place in the three trouser outfits, side on, to check the
  // skin behind the knee and calf (`?cam=` looks from behind)
  trackwalk: {
    looks: (
      [
        { ...LINEUP[0], outfit: "tracksuit-y2k" },
        { ...LINEUP[5], outfit: "flares" },
        { ...LINEUP[2], outfit: "jeans" },
      ] satisfies Look[]
    ).map(worn),
    x: (i: number) => (i - 1) * 1.1,
    cam: [0.6, 0.6, 3.2] as const,
    target: [0, 0.5, 0] as const,
    fov: 30,
  },
  // wheelchair users, a woman, a man and a woman in a long skirt, from the front
  chair: {
    looks: [
      { ...LINEUP[0], gait: "wheelchair" },
      { ...LINEUP[5], gait: "wheelchair" },
      { ...LINEUP[2], outfit: "corset-maxi", gait: "wheelchair" },
    ] satisfies Look[],
    x: (i: number) => (i - 1) * 1.3,
    cam: [0.8, 1.1, 4.4] as const,
    target: [0, 0.7, 0] as const,
    fov: 30,
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
    looks: LINEUP.slice(0, 1).map(worn),
    x: () => 0,
    cam: [0, 1.0, 26] as const,
    target: [0, 0.9, 0] as const,
    fov: 34,
  },
  // five dance moves side by side
  dance: {
    looks: LINEUP.slice(0, 5).map((look, i) => worn(suited(look), i)),
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
  // a paired emote (`?emote=`, a kiss by default) at three height pairings
  together: {
    looks: [
      LINEUP[0],
      LINEUP[1],
      LINEUP[2],
      LINEUP[3],
      { ...MEN[0], outfit: "jeans" as const },
      LINEUP[4],
    ],
    x: () => 0,
    cam: [0, 1.45, 4.2] as const,
    target: [0, 1.35, 0] as const,
    fov: 34,
  },
  // every walk style, walking in place, side on
  walk: {
    looks: GAIT_LIST.map((g, i) => ({
      ...LINEUP[i % LINEUP.length],
      gait: g.id,
    })),
    x: (i: number) => (i - (GAIT_LIST.length - 1) / 2) * 0.9,
    cam: [0, 1.0, 9] as const,
    target: [0, 0.9, 0] as const,
    fov: 36,
  },
  // every held motion-capture pose, front on
  pose: {
    looks: HOLDS.pose.map((_, i) => worn(suited(LINEUP[i % LINEUP.length]), i)),
    x: (i: number) => (i - (HOLDS.pose.length - 1) / 2) * 1.0,
    cam: [0, 1.0, 7.5] as const,
    target: [0, 0.9, 0] as const,
    fov: 36,
  },
  sit: {
    looks: HOLDS.sit.map((_, i) => worn(suited(LINEUP[i % LINEUP.length]), i)),
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
  // lip liner, styles and finishes: defined ombre in metallic, overlined
  // glitter, a blurred stain with a 90s brown liner
  lips: {
    looks: [
      {
        ...LINEUP[0],
        lips: "lips-rosewood" as const,
        makeup: "14101400000021",
      },
      {
        ...LINEUP[3],
        lips: "lips-doll-pink" as const,
        makeup: "25212000000030",
      },
      {
        ...LINEUP[5],
        lips: "lips-raspberry" as const,
        makeup: "00300400000042",
      },
    ],
    x: (i: number) => (i - 1) * 0.32,
    cam: [0, 1.5, 1.25] as const,
    target: [0, 1.5, 0] as const,
    fov: 26,
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
  // the textured styles, from behind and the side
  textured: {
    looks: (
      [
        "locs",
        "box-braids",
        "cornrows",
        "bantu-knots",
        "twist-out",
        "puffs",
      ] as const
    ).map((hairStyle, i) => ({ ...LINEUP[i % LINEUP.length], hairStyle })),
    x: (i: number) => (i - 2.5) * 0.62,
    cam: [0.6, 1.6, 2.6] as const,
    target: [0, 1.45, 0] as const,
    fov: 50,
  },
  // the plus-size figure on the masculine build, and seated in a wheelchair
  plusMen: {
    looks: [
      { ...MEN[0], face: encodeFace({ ...DEFAULT_FACE, figure: "plus" }) },
      { ...MEN[1], face: encodeFace({ ...DEFAULT_FACE, figure: "plus" }) },
      {
        ...LINEUP[1],
        gait: "wheelchair",
        face: encodeFace({ ...DEFAULT_FACE, figure: "plus" }),
      },
    ] satisfies Look[],
    x: (i: number) => (i - 1) * 1.1,
    cam: [0.6, 1.0, 4.6] as const,
    target: [0, 0.8, 0] as const,
    fov: 32,
  },
  // the plus-size figure in different outfits, hair and head coverings
  plus: {
    looks: (
      [
        ["flares", "waves"],
        ["mini", "hijab"],
        ["blouse", "buzz"],
        ["sundress", "turban"],
        ["hoodie-bikers", "head-wrap"],
      ] as const
    ).map(([outfit, hairStyle], i) => ({
      ...LINEUP[i],
      outfit,
      hairStyle,
      face: encodeFace({ ...DEFAULT_FACE, figure: "plus" }),
    })),
    x: (i: number) => (i - 2) * 0.8,
    cam: [0, 1.0, 5.6] as const,
    target: [0, 0.9, 0] as const,
    fov: 32,
  },
  // the head coverings, three-quarters on
  coverings: {
    looks: (["hijab", "head-wrap", "turban"] as const).map((hairStyle, i) => ({
      ...LINEUP[i],
      hairStyle,
      hairColor: "#7b4dff" as const,
    })),
    x: (i: number) => (i - 1) * 0.55,
    cam: [0.6, 1.6, 2.6] as const,
    target: [0, 1.45, 0] as const,
    fov: 40,
  },
  // the same coverings on the masculine build
  coveringsMen: {
    looks: (["turban", "head-wrap", "hijab"] as const).map((hairStyle, i) => ({
      ...MEN[i],
      hairStyle,
      hairColor: "#3a6bff" as const,
    })),
    x: (i: number) => (i - 1) * 0.55,
    cam: [0.6, 1.6, 2.6] as const,
    target: [0, 1.45, 0] as const,
    fov: 40,
  },
  // a bindi and hearing aids, close up from the side and front
  accessories: {
    looks: [
      { ...LINEUP[0], hairStyle: "pixie" as const, makeup: "221010000013" },
      { ...LINEUP[3], hairStyle: "bob" as const, makeup: "221010010022" },
      { ...LINEUP[5], hairStyle: "pixie" as const, makeup: "221010010013" },
    ],
    x: (i: number) => (i - 1) * 0.3,
    cam: [0.55, 1.58, 1.0] as const,
    target: [0, 1.55, 0] as const,
    fov: 30,
  },
  // the close-cropped styles, front on and close: buzz, shaved sides, bald, edges
  cropped: {
    looks: (["buzz", "shaved-sides", "bald", "edges"] as const).map(
      (hairStyle, i) => ({ ...LINEUP[i % LINEUP.length], hairStyle }),
    ),
    x: (i: number) => (i - 1.5) * 0.6,
    cam: [0, 1.62, 2.6] as const,
    target: [0, 1.58, 0] as const,
    fov: 28,
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
const isShotName = (s: string): s is ShotName => Object.hasOwn(SHOTS, s);
const plan = isShotName(shot) ? SHOTS[shot] : SHOTS.lineup;
const looks = SHOE_PICK ? plan.looks.map(shod) : plan.looks;
// `?cam=x,y,z` moves the shot's camera, to look at a pose from another side
// and `?target=x,y,z` the point it looks at, for a close-up of one doll
const vecParam = (name: string) => {
  const v = new URLSearchParams(location.search)
    .get(name)
    ?.split(",")
    .map(Number);
  return v?.length === 3 && v.every(Number.isFinite)
    ? ([v[0], v[1], v[2]] as const)
    : null;
};
const cam = vecParam("cam") ?? plan.cam;
const target = vecParam("target") ?? plan.target;

function measure(root: THREE.Object3D) {
  let calls = 0;
  let tris = 0;
  root.traverse((o) => {
    if (!isMesh(o)) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent)
      if (!p.visible) return;
    const g = o.geometry;
    const n = g.index ? g.index.count : g.attributes.position.count;
    calls += Array.isArray(o.material) ? o.material.length : 1;
    tris += n / 3;
  });
  return { calls, tris: Math.round(tris) };
}

// Catalog comparisons show anatomy in the bind pose, independent of load time
// and idle animation. This is limited to the dev lab's preset thumbnail shots.
const PREVIEW_EXPRESSIONS = [
  ["blink", 0.04],
  ["smile", 0],
  ["gurn", 0],
] as const;

function NeutralPreview() {
  const { scene: source } = useGLTF(
    `/models/doll/body${portraitLift ? "-m" : ""}.glb`,
  );
  const rest = useMemo(() => {
    const bones = new Map<string, THREE.Bone>();
    source.traverse((node) => {
      // isBone, not instanceof: instanceof narrows to Bone<any> (no-unsafe-argument)
      if (isBone(node)) bones.set(node.name, node);
    });
    return bones;
  }, [source]);
  const restore = useMemo(
    () => (node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh && node.morphTargetInfluences) {
        for (const [key, value] of PREVIEW_EXPRESSIONS) {
          const index = node.morphTargetDictionary?.[key];
          if (index !== undefined) node.morphTargetInfluences[index] = value;
        }
      }
      if (!(node instanceof THREE.Bone)) return;
      const original = rest.get(node.name);
      if (!original) return;
      node.position.copy(original.position);
      node.quaternion.copy(original.quaternion);
      node.scale.copy(original.scale);
    },
    [rest],
  );
  useFrame(({ scene, camera, gl }) => {
    scene.traverse(restore);
    scene.updateMatrixWorld(true);
    gl.render(scene, camera);
  }, 1);
  return null;
}

function Probe({
  count,
  selection,
}: {
  count: number;
  selection: string | null;
}) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const frames = useRef(0);
  const settled = useRef(0);
  useFrame(() => {
    frames.current += 1;
    let ready = true;
    for (let i = 0; i < count; i++) {
      const doll = scene.getObjectByName(`doll-${i}`);
      let visible = false;
      doll?.traverse((o) => {
        // a near doll still in its far twin (HumanDoll's Part, Garments)
        if (o.userData.nearPending === true) ready = false;
        if (!isMesh(o)) return;
        let shown = true;
        for (let p: THREE.Object3D | null = o; p; p = p.parent)
          if (!p.visible) shown = false;
        if (shown) visible = true;
      });
      if (!visible) ready = false;
    }
    settled.current = ready ? settled.current + 1 : 0;
    if (still && settled.current < 12) invalidate();
    document.body.dataset.frames = String(frames.current);
    document.body.dataset.ready = settled.current >= 10 ? "true" : "false";
    if (settled.current >= 10)
      document.body.dataset.previewFace = selection ?? "";
    if (settled.current !== 10) return;
    const dolls = Array.from({ length: count }, (_, i) =>
      // eslint-disable-next-line no-restricted-syntax -- runs once at frame 12 for the screenshot measure, never in play
      measure(scene.getObjectByName(`doll-${i}`) ?? new THREE.Object3D()),
    );
    const total = measure(scene);
    document.body.dataset.stats = JSON.stringify({ dolls, scene: total });
  });
  return null;
}

function Lab() {
  const [previewFace, setPreviewFace] = useState<string | null>(null);
  useEffect(() => {
    if (shot !== "eyetile" && shot !== "lipTile") return;
    // Reuse one WebGL context while the capture script changes native presets.
    const select = (code: unknown) => {
      if (typeof code === "string" && decodeFace(code)) setPreviewFace(code);
    };
    Reflect.set(window, "setPreviewFace", select);
    return () => {
      Reflect.deleteProperty(window, "setPreviewFace");
    };
  }, []);
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
        camera.lookAt(target[0], target[1], target[2]);
        gl.setClearColor(
          studio ? "#24232a" : "#07020b",
          new URLSearchParams(location.search).get("clear") === "1" ? 0 : 1,
        );
      }}
    >
      {human && (
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 3, 1]} />
          <Lightformer
            intensity={1.2}
            color={studio ? "#ffffff" : "#ff74d4"}
            position={[-4, 1, -2]}
            scale={[3, 3, 1]}
          />
          <Lightformer
            intensity={1}
            color={studio ? "#ffffff" : "#7bdcff"}
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
        color={studio ? "#ffffff" : "#ff74d4"}
      />
      {looks.map((look, i) => (
        <group
          key={i}
          name={`doll-${i}`}
          position={
            shot === "piggyback" && i === 1
              ? [0, liftOf("piggyback"), -together("piggyback").gap]
              : shot === "together"
                ? [
                    pairSpot(i).at[0],
                    pairSpot(i).role === "follow" ? liftOf(EMOTE) : 0,
                    pairSpot(i).at[1],
                  ]
                : [plan.x(i), 0, 0]
          }
          rotation-y={shot === "together" ? pairSpot(i).yaw : 0}
        >
          {human ? (
            <Suspense fallback={null}>
              <HumanDoll
                look={previewFace ? { ...look, face: previewFace } : look}
                mood={
                  shot === "dance" ||
                  shot === "piggyback" ||
                  shot === "together"
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
                    : shot === "together"
                      ? roleMove(EMOTE, pairSpot(i).role)
                      : DANCES[i % DANCES.length]
                }
                couple={
                  shot === "together" && mirrored(EMOTE)
                    ? pairSpot(i).role
                    : undefined
                }
                partnerFace={
                  shot === "together"
                    ? faceHeight(plan.looks[i ^ 1] ?? look, {
                        ...bodyParams,
                        height: PAIR_HEIGHTS[i ^ 1] ?? 50,
                      })
                    : undefined
                }
                seed={shot === "builds" ? 0 : i}
                body={
                  shot === "builds"
                    ? { ...bodyParams, weight: i * 50 }
                    : shot === "together"
                      ? { ...bodyParams, height: PAIR_HEIGHTS[i] ?? 50 }
                      : bodyParams
                }
                // the face shot is a portrait of your own doll: she looks
                // into the camera, as in the game's close zoom
                own={shot === "face"}
                walk={walksInPlace ? WALKING[i % WALKING.length] : undefined}
                rotation-y={walksInPlace ? Math.PI / 2 : 0}
              />
            </Suspense>
          ) : (
            <Doll look={look} mood="idle" seed={i} />
          )}
        </group>
      ))}
      <Probe
        key={previewFace}
        count={plan.looks.length}
        selection={previewFace}
      />
      {(shot === "eyetile" || shot === "lipTile") && (
        <Suspense fallback={null}>
          <NeutralPreview />
        </Suspense>
      )}
    </Canvas>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("lineup.html is missing #root.");
createRoot(root).render(<Lab />);
