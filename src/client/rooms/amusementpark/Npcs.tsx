import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  PARK_CONTEXT,
  PARK_NPC_ROLES,
  type ParkNpcId,
} from "../../../game/amusementPark.ts";
import { pickLine, type RecentLines } from "../../../game/dialogue/pick.ts";
import type { Look, Mood } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";

const BUBBLE_MS = 6000;

type Npc = {
  id: ParkNpcId;
  name: string;
  look: Look;
  mood: Mood;
  at: readonly [number, number];
  rot: number;
};

// Ride staff stand at the rides; visitors wander the midway. Each NPC speaks
// for a dialogue role, so a tap picks a fairground line from that role's bank.
export const PARK_NPCS: readonly Npc[] = [
  {
    id: "tamsin",
    name: "Tamsin",
    look: {
      skin: "#e6b48e",
      hairStyle: "buns",
      hairColor: "#b77a3e",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-y2k-thin",
      outfit: "shorts",
      outfitColor: "#ffb02e",
      shadow: "#3fe0d0",
    },
    mood: "idle",
    at: [-12.3, 5.5],
    rot: Math.PI / 2,
  },
  {
    id: "gus",
    name: "Gus",
    look: {
      skin: "#94603f",
      hairStyle: "waves",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "fur",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
    },
    mood: "idle",
    at: [4.6, -6.6],
    rot: -0.4,
  },
  {
    id: "mabel",
    name: "Mabel",
    look: {
      skin: "#633c29",
      hairStyle: "ponytail",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "mini",
      outfitColor: "#e8e2ff",
      shadow: "#ff2f9a",
    },
    mood: "pose",
    at: [12.3, 4],
    rot: -Math.PI / 2,
  },
  {
    id: "dex",
    name: "Dex",
    look: {
      skin: "#c48d68",
      hairStyle: "buns",
      hairColor: "#7b4dff",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "jeans",
      outfitColor: "#9b5cff",
      shadow: "#d23cff",
    },
    mood: "pose",
    at: [-10.4, 0.5],
    rot: Math.PI / 2,
  },
  {
    id: "sunny",
    name: "Sunny",
    look: {
      skin: "#f3d4c4",
      hairStyle: "waves",
      hairColor: "#4a2a1c",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "fur",
      outfitColor: "#3fe0d0",
      shadow: "#ffb02e",
    },
    mood: "dance",
    at: [-3.5, -2.5],
    rot: 0.6,
  },
  {
    id: "rafe",
    name: "Rafe",
    look: {
      skin: "#e6b48e",
      hairStyle: "ponytail",
      hairColor: "#1b1014",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-y2k-thin",
      outfit: "shorts",
      outfitColor: "#e8e2ff",
      shadow: "#3fe0d0",
    },
    mood: "lean",
    at: [3.2, 1.8],
    rot: -0.5,
  },
  {
    id: "ayo",
    name: "Ayo",
    look: {
      skin: "#94603f",
      hairStyle: "waves",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-sculpted-espresso",
      outfit: "mini",
      outfitColor: "#3fe0d0",
      shadow: "#ff2f9a",
    },
    mood: "idle",
    at: [1, -3.2],
    rot: 0.3,
  },
];

/** A standing doll that says a fairground line from its dialogue role when tapped. */
export function ParkNpc({ npc, seed }: { npc: Npc; seed: number }) {
  const [line, setLine] = useState<string | null>(null);
  // lines this NPC said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const picked = pickLine({
      role: PARK_NPC_ROLES[npc.id],
      situation: "tapped",
      context: PARK_CONTEXT,
      rng: Math.random,
      recent: recent.current,
    });
    recent.current = picked.recent;
    setLine(picked.text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLine(null), BUBBLE_MS);
  };
  return (
    <group position={[npc.at[0], 0, npc.at[1]]} rotation-y={npc.rot}>
      <Doll look={npc.look} mood={npc.mood} seed={seed} />
      {/* a see-through tap target around the doll */}
      <mesh position={[0, 0.95, 0]} onClick={say}>
        <cylinderGeometry args={[0.5, 0.5, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {line && (
        <Html position={[0, 2.25, 0]} center>
          <p className="bubble">
            <strong>{npc.name}: </strong>
            {line}
          </p>
        </Html>
      )}
    </group>
  );
}
