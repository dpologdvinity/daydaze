// The Forest Trail's tappable hikers: three walkers resting by the trailhead
// bench, on the bridge and at the lookout. A tap shows a line from the hiker
// bank (game/dialogue/hiker.ts) in a bubble for 4.5 s.

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Look } from "../../../game/look.ts";
import { HIKERS } from "../../../game/forest.ts";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../../game/dialogue/pick.ts";
import { Doll } from "../../avatar/Doll.tsx";

/** One look each, in earth and forest tones (ids as in the closet). */
const LOOKS: readonly Look[] = [
  {
    skin: "#94603f",
    hairStyle: "ponytail",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "flares",
    outfitColor: "#141018",
    shadow: "#8a5a3c",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "buns",
    hairColor: "#ff4fb3",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "mini",
    outfitColor: "#ffb02e",
    shadow: "#3fe0d0",
  },
  {
    skin: "#e6b48e",
    hairStyle: "buns",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-y2k-thin",
    outfit: "fur",
    outfitColor: "#e8e2ff",
    shadow: "#ffb02e",
  },
];

const BUBBLE_MS = 4500;
const ignore = () => {};

function Hiker({ i }: { i: number }) {
  const spot = HIKERS[i];
  const [line, setLine] = useState<string | null>(null);
  // lines said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  useEffect(() => {
    if (line === null) return;
    const id = window.setTimeout(() => setLine(null), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [line]);
  const look = LOOKS[i % LOOKS.length];
  if (!spot || !look) return null;
  const talk = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    loadDialogue().then(() => {
      const picked = pickLine({
        role: "hiker",
        situation: "tapped",
        rng: Math.random,
        recent: recent.current,
      });
      recent.current = picked.recent;
      setLine(picked.text);
    }, ignore);
  };
  return (
    <group position={[spot.at[0], 0, spot.at[1]]} rotation-y={spot.yaw}>
      <Doll look={look} mood="idle" seed={i + 61} onClick={talk} />
      {line !== null && (
        <Html position={[0, 2.05, 0]} center zIndexRange={[20, 10]}>
          <p className="bubble npc-bubble">{line}</p>
        </Html>
      )}
    </group>
  );
}

/** The trail's hikers. */
export function Hikers() {
  return (
    <>
      {HIKERS.map((_, i) => (
        <Hiker key={i} i={i} />
      ))}
    </>
  );
}
