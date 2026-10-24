// The Water Park's tappable regulars in swimwear: the lifeguard on her chair,
// the snack bar cashier, two swimmers treading water, a sunbather and a dancer
// under the splash bucket. A tap shows a line from the dialogue banks in a
// bubble for 4.5 s; swimmers bob unless reduced motion is on.

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { Look, Mood, SwimLook } from "../../../game/look.ts";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../../game/dialogue/pick.ts";
import type { DialogueRole } from "../../../game/dialogue/types.ts";
import { POOL } from "../../../game/waterPark.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";
import { LIFEGUARD_SEAT } from "./Deck.tsx";

type Local = {
  look: Look;
  swim: SwimLook;
  mood: Mood;
  at: [number, number, number];
  rot: number;
  /** Treading water: only the head and shoulders show, bobbing. */
  swimming?: boolean;
  role: DialogueRole;
};

// Sitting lowers the hips 0.45 m below standing; seats are given at their top.
const SIT = 0.45;
const IN_POOL = POOL.water - 1.12;

const LOCALS: readonly Local[] = [
  {
    // lifeguard, up on the chair across the pool
    look: {
      skin: "#94603f",
      hairStyle: "ponytail",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
    },
    swim: { style: "one-piece", color: "#ff2f9a" },
    mood: "sit",
    at: [LIFEGUARD_SEAT[0], LIFEGUARD_SEAT[1] + 0.05 - SIT, LIFEGUARD_SEAT[2]],
    rot: 0,
    role: "lifeguard",
  },
  {
    // snack bar cashier, behind the counter
    look: {
      skin: "#f3d4c4",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "mini",
      outfitColor: "#ffb02e",
      shadow: "#3fe0d0",
    },
    swim: { style: "bikini", color: "#9b5cff" },
    mood: "idle",
    at: [-11.15, 0, 2.6],
    rot: Math.PI / 2,
    role: "snack-cashier",
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "waves",
      hairColor: "#f1d78f",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "flares",
      outfitColor: "#ff2f9a",
      shadow: "#ffb02e",
    },
    swim: { style: "bikini", color: "#ffb02e" },
    mood: "idle",
    at: [-5.6, IN_POOL, -5.0],
    rot: 0.4,
    swimming: true,
    role: "swimmer",
  },
  {
    look: {
      skin: "#e6b48e",
      hairStyle: "buns",
      hairColor: "#7b4dff",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-y2k-thin",
      outfit: "fur",
      outfitColor: "#e8e2ff",
      shadow: "#d23cff",
    },
    swim: { style: "one-piece", color: "#3fe0d0" },
    mood: "idle",
    at: [-1.4, IN_POOL, -3.4],
    rot: -0.3,
    swimming: true,
    role: "swimmer",
  },
  {
    // sunbathing at the foot of a lounger
    look: {
      skin: "#c48d68",
      hairStyle: "waves",
      hairColor: "#b77a3e",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "mini",
      outfitColor: "#3fe0d0",
      shadow: "#ff2f9a",
    },
    swim: { style: "bikini", color: "#ff2f9a" },
    mood: "sit",
    at: [0.2, 0.38 - SIT, 6.15],
    rot: 0,
    role: "swimmer",
  },
  {
    // dancing under the splash bucket, waiting for it to tip
    look: {
      skin: "#f3d4c4",
      hairStyle: "ponytail",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "flares",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    swim: { style: "bikini", color: "#e8e2ff" },
    mood: "dance",
    at: [-6.0, 0, 5.3],
    rot: 0.3,
    role: "swimmer",
  },
];

const BUBBLE_MS = 4500;

function Person({ local, seed }: { local: Local; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  const [line, setLine] = useState<{ text: string } | null>(null);
  // lines this regular said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  useEffect(() => {
    if (line === null) return;
    const id = window.setTimeout(() => setLine(null), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [line]);
  useFrame(({ clock }) => {
    if (!group.current || !local.swimming || calm) return;
    const t = clock.elapsedTime + seed;
    group.current.position.y = local.at[1] + Math.sin(t * 1.8) * 0.05;
    group.current.rotation.y = local.rot + Math.sin(t * 0.4) * 0.3;
  });
  const talk = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    // the line banks load lazily; a failed load is retried on the next tap
    loadDialogue().then(() => {
      const picked = pickLine({
        role: local.role,
        situation: "tapped",
        rng: Math.random,
        recent: recent.current,
      });
      recent.current = picked.recent;
      setLine({ text: picked.text });
    }, ignore);
  };
  return (
    <group ref={group} position={local.at} rotation-y={local.rot}>
      <Doll
        look={local.look}
        swim={local.swim}
        mood={local.mood}
        seed={seed}
        onClick={talk}
      />
      {line !== null && (
        <Html
          position={[0, local.mood === "sit" ? 1.75 : 2.05, 0]}
          center
          zIndexRange={[20, 10]}
        >
          <p className="bubble npc-bubble">{line.text}</p>
        </Html>
      )}
    </group>
  );
}

/** Water Park regulars: tap one and they say something. */
export function Locals() {
  return (
    <>
      {LOCALS.map((l, i) => (
        <Person key={i} local={l} seed={i + 21} />
      ))}
    </>
  );
}

const ignore = () => {};
