import { useFrame } from "@react-three/fiber";
import { useRef, type JSX } from "react";
import * as THREE from "three";
import { BENCH_X, COURT } from "../../../game/dome.ts";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { useReducedMotion } from "../../motion.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = { venue: "dome", neighborhood: "fairground" };

const VENDOR_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "tracksuit-y2k",
  outfitColor: "#ffb02e",
  shadow: "#ffb02e",
};

/** Dancers working the baseline between plays. */
const DANCERS: readonly { look: Look; at: [number, number] }[] = [
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "pigtails",
      hairColor: "#f1d78f",
      lips: "lips-hot-pink-glam",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [-6.4, -2.8],
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "coils",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-fox-snatched",
      outfit: "baby-tee-mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    at: [6.4, -2.8],
  },
];

/** Players warming up down the west sideline, in the Dome's teal. */
const WARMUP: readonly { look: Look; at: Vec2 }[] = (
  [
    ["#633c29", "braids", "#1b1014", [COURT.x0 + 1, 3.2]],
    ["#f3d4c4", "low-pony", "#f1d78f", [COURT.x0 + 1, 5]],
  ] as const
).map(([skin, hairStyle, hairColor, at]) => ({
  look: {
    skin,
    hairStyle,
    hairColor,
    lips: "lips-nude-pink-gloss",
    brows: "brows-sculpted-espresso",
    outfit: "tracksuit-y2k",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  },
  at,
}));

/** The ball the first warm-up player bounces at her side. */
function Dribble({ at }: { at: Vec2 }) {
  const calm = useReducedMotion();
  const ball = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ball.current) return;
    // a bounce every half second: fast down, slowing to the hand
    const f = calm ? 0.5 : (clock.elapsedTime * 2) % 1;
    ball.current.position.y = 0.12 + Math.abs(Math.sin(f * Math.PI)) * 0.72;
  });
  return (
    <mesh ref={ball} position={[at[0] + 0.35, 0.5, at[1] + 0.15]}>
      <sphereGeometry args={[0.12, 14, 10]} />
      <meshStandardMaterial color="#e8702a" roughness={0.7} />
    </mesh>
  );
}

/** The Dome's snack seller courtside, dancers on the baseline and players
 * warming up on the sideline. */
export function DomeNpcs(): JSX.Element {
  return (
    <>
      <TalkingNpc
        name="Bree"
        role="snack-cashier"
        look={VENDOR_LOOK}
        mood="idle"
        at={[BENCH_X - 0.6, 0, COURT.z1 - 1.4]}
        rot={-Math.PI / 2}
        seed={151}
        greet
        context={CONTEXT}
      />
      {WARMUP.map((p, i) => (
        <group
          key={i}
          position={[p.at[0], 0, p.at[1]]}
          rotation-y={Math.PI / 2}
        >
          <CrowdFigure look={p.look} seed={156 + i} />
        </group>
      ))}
      <Dribble at={WARMUP[0].at} />
      {DANCERS.map((d, i) => (
        <group
          key={i}
          position={[d.at[0], 0, d.at[1]]}
          rotation-y={d.at[0] < 0 ? 0.6 : -0.6}
        >
          <CrowdFigure
            look={d.look}
            move={i % 2 ? "arm-wave" : "house"}
            seed={152 + i}
          />
        </group>
      ))}
    </>
  );
}
