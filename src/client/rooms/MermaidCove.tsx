import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Look } from "../../game/look.ts";
import { COVE_ROCKS, LOG_SEATS, SAND } from "../../game/mermaidCove.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { leave, tick } from "./cove/session.ts";
import { Lagoon, type Waterline } from "./cove/Lagoon.tsx";
import { Mermaid } from "./cove/Mermaid.tsx";
import { Shells } from "./cove/Shells.tsx";
import { usePart } from "./ocean/ReefProps.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { surface } from "../city/worldTexture.ts";

// real rock round the lagoon, a darker sea cave, sun-bleached driftwood; the
// faint violet glow keeps the rocks' shapes from going black at night
const COVE_ROCK = surface("rock_face", {
  scale: 0.8,
  color: "#c4b8e8",
  emissive: "#1c1238",
  emissiveIntensity: 1,
});
const CAVE_ROCK = surface("rock_face", {
  scale: 0.5,
  color: "#a496cc",
  emissive: "#140c2c",
  emissiveIntensity: 1,
});
const DRIFTWOOD = surface("palm_bark", { scale: 1.5, color: "#d8c0a0" });
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { useEndOnUnmount } from "./shared/useNow.ts";

const PINK = "#ff4fb3";
/** The moon, low over the sea cave. */
const MOON = [8, 13, -45] as const;
/** The lounging mermaids' tints, by rock. */
const LOUNGE_TINTS = ["#ffd8e8", "#c2daff"];
/** The reef kit's flat boulder, scaled long under a lounging mermaid. Its
 * domed top peaks 0.41 of the unscaled height above center; she sits 8 cm
 * over the peak, so her tail lies along the dome instead of sinking in. */
const LOUNGE_SCALE = [2, 2.2, 3.1] as const;
const LOUNGE_LIFT = 0.2;
const LOUNGE_TOP = LOUNGE_LIFT + 0.41 * LOUNGE_SCALE[1] + 0.08;

/** Where each rock meets the water, for the lagoon's foam: the boulders'
 * outlines a little inside their widest (the water cuts them below center). */
const WATERLINES: readonly Waterline[] = COVE_ROCKS.map((rock) => ({
  x: rock.x,
  z: rock.z,
  yaw: rock.yaw,
  ax: rock.lounge ? 0.95 * LOUNGE_SCALE[0] : 0.85 * rock.r,
  az: rock.lounge ? 0.95 * 0.956 * LOUNGE_SCALE[2] : 0.8 * rock.r,
}));

/** A rock from the reef kit (Quaternius, CC0) in the cove's lavender stone:
 * the long flat boulder a mermaid lounges on, or a rounder one `r` across. */
function Boulder({ lounge, r }: { lounge: boolean; r: number }) {
  const part = usePart(lounge ? "rock-flat" : "rock-moss");
  if (!part) return null;
  return (
    <mesh
      geometry={part.geometry}
      material={COVE_ROCK}
      position-y={lounge ? LOUNGE_LIFT : r * 0.25}
      scale={lounge ? [...LOUNGE_SCALE] : [r, r * 0.9, r]}
    />
  );
}

// Marina's look is shared by her talking NPC.
const MARINA_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "mermaid",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-feathered-honey",
  outfit: "baby-tee-mini",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Ticks Siren Song's playback, and stops it when you leave the cove. */
function SongClock() {
  useEndOnUnmount(leave);
  useFrame(() => tick(performance.now()));
  return null;
}

/**
 * Mermaid Cove off Shore Boulevard: a crescent of moonlit sand round a
 * glowing lagoon, rocks and a sea cave's arch beyond, mermaids swaying in
 * the water and flicking their tails, driftwood logs to sit on, and four
 * singing shells at the waterline for Siren Song.
 */
export function MermaidCove({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#0a0820"]} />
      <fog attach="fog" args={["#140c34", 18, 70]} />
      <Stars
        radius={80}
        depth={20}
        count={900}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#b8a8ff", "#0b3a4a", 1.3]} />
      {/* moonlight from the moon over the cave: it rims the rocks, the arch
          and the mermaids, and lays a glittering path on the water */}
      <directionalLight position={MOON} color="#a9c2ff" intensity={1.8} />
      <pointLight
        position={[0, 4, 3]}
        color="#bff8ff"
        intensity={5}
        distance={16}
      />
      <Floor
        width={SAND.x1 - SAND.x0}
        depth={SAND.z1 - SAND.z0}
        center={[0, (SAND.z0 + SAND.z1) / 2]}
        color="#f4e2c8"
        texture={{ id: "coast_sand_01", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      {/* the lagoon, glowing faintly from below; opaque, so the swimming
          mermaids are seen from the waist up */}
      <Lagoon rocks={WATERLINES} />
      <PortalPads room={ROOMS["mermaid-cove"]} color={PINK} />
      {/* rocks round the lagoon, mermaids lounging on the two long ones, and
          the sea cave's arch */}
      {COVE_ROCKS.map((rock, i) => (
        <group key={i} position={[rock.x, 0, rock.z]} rotation-y={rock.yaw}>
          <Boulder lounge={rock.lounge} r={rock.r} />
          {rock.lounge && (
            <group position-y={LOUNGE_TOP}>
              <Mermaid tint={LOUNGE_TINTS[i] ?? "#ffffff"} />
            </group>
          )}
        </group>
      ))}
      <mesh position={[0, 0, -16]} scale={[1.4, 1.2, 1]}>
        <torusGeometry args={[6, 1.6, 8, 24, Math.PI]} />
        <primitive object={CAVE_ROCK} attach="material" />
      </mesh>
      {/* the moon; the water's ripples catch its light */}
      <mesh position={MOON}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial
          color={hdr("#fff4dc", 1.4)}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <Mermaid loop={0} tint="#bbfff0" singer />
      <Mermaid loop={1} tint="#f4ccff" />
      <Shells />
      <SongClock />
      {/* driftwood logs up the beach */}
      {[-7.2, 7.2].map((x) => (
        <mesh
          key={x}
          position={[x, 0.2, LOG_SEATS[0][1] + 0.05]}
          rotation-z={Math.PI / 2}
        >
          <cylinderGeometry args={[0.2, 0.22, 1.9, 10]} />
          <primitive object={DRIFTWOOD} attach="material" />
        </mesh>
      ))}
      <Sparkles
        count={60}
        scale={[18, 3, 14]}
        position={[0, 1.4, -4]}
        size={2.4}
        speed={calm ? 0 : 0.25}
        color="#9ff8ff"
        opacity={0.8}
      />
      <NeonText
        text="MERMAID COVE"
        color={PINK}
        font={MARQUEE}
        width={4.6}
        k={3.2}
        position={[0, 3.4, SAND.z1 - 0.1]}
        rotation-y={Math.PI}
      />
      <TalkingNpc
        name="Marina"
        role="regular"
        look={MARINA_LOOK}
        mood="idle"
        at={[SAND.x1 - 1.6, 0, 4.4]}
        rot={-Math.PI / 2}
        seed={275}
        greet
        context={{ venue: "mermaid-cove", neighborhood: "beachside" }}
      />
    </>
  );
}
