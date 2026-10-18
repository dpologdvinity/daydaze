import { useFrame } from "@react-three/fiber";
import { useRef, type JSX } from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { PARLOR } from "../../game/salon.ts";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { Batch } from "./shared/batch.ts";
import { plant, poster, rug, stringLights } from "./shared/details.ts";
import { GOLD } from "./shared/materials.ts";
import { surface } from "../city/worldTexture.ts";

// dark painted brick, walnut cases lined in velvet, black leather
const BRICK = surface("brick_wall_13", { scale: 0.5, color: "#7a5a8a" });
const WALNUT = surface("wood_veneer", {
  scale: 1.5,
  color: "#6a3a2a",
  roughness: 0.45,
});
const VELVET = surface("velour_velvet", { scale: 3, color: "#c86a9a" });
const LEATHER = surface("leather_white", {
  scale: 2.5,
  color: "#3a2a40",
  roughness: 0.4,
});

/** Flash sheets in frames, plants, a rug and bulbs. */
function buildDressing() {
  const b = new Batch();
  [-3, -1.5, 1.5, 3].forEach((x, i) =>
    poster(
      b,
      { x, y: 2.2, z: -4 + 0.04 },
      [5, 6, 7, 2][i] ?? 0,
      1.1,
      1.4,
      GOLD,
    ),
  );
  plant(b, { x: 4.4, z: 3.4 }, 1.3);
  plant(b, { x: -4.4, z: 3.4 }, 1.3);
  rug(b, { x: 0, z: 0.4 }, 3, 2.2, "#c890d8");
  stringLights(b, [-4.8, 3.6, -3.8], [4.8, 3.6, -3.8], 18, "#ff9ad8", 0.25);
  return b.build();
}

const PINK = "#ff2f9a";
const { bounds } = PARLOR;
const W = bounds.x1 - bounds.x0;
const D = bounds.z1 - bounds.z0;

const PIERCER: Look = {
  skin: "#c48d68",
  hairStyle: "shag",
  hairColor: "#7b4dff",
  lips: "lips-burgundy-cherry",
  brows: "brows-y2k-thin",
  outfit: "baby-tee-mini",
  outfitColor: "#141018",
  shadow: "#d23cff",
};

/** The jewelry on velvet in a glass case: little glints that twinkle. */
function Case({ c }: { c: (typeof PARLOR.cases)[number] }) {
  const calm = useReducedMotion();
  const glints = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = glints.current;
    if (!g || calm) return;
    g.children.forEach((m, i) => {
      m.scale.setScalar(
        0.6 + Math.abs(Math.sin(clock.elapsedTime * 2 + i)) * 0.6,
      );
    });
  });
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  const depth = c.z1 - c.z0;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position-y={0.45} material={WALNUT}>
        <boxGeometry args={[c.x1 - c.x0, 0.9, depth]} />
      </mesh>
      <mesh position-y={0.92} material={VELVET}>
        <boxGeometry args={[c.x1 - c.x0 - 0.1, 0.04, depth - 0.1]} />
      </mesh>
      <mesh position-y={1.05}>
        <boxGeometry args={[c.x1 - c.x0, 0.25, depth]} />
        <meshStandardMaterial
          color="#cfe9ff"
          transparent
          opacity={0.18}
          roughness={0.05}
        />
      </mesh>
      <group ref={glints}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            position={[
              ((i % 2) - 0.5) * 0.3,
              0.96,
              -depth / 2 + 0.4 + (i * (depth - 0.8)) / 7,
            ]}
          >
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshBasicMaterial
              color={hdr(
                ["#ffffff", "#ffcb5c", "#f2a98f", "#cfe9ff"][i % 4],
                2,
              )}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Ink & Needle on Gallery Row: a moody parlor with flash art on the walls,
 * glass cases of fine jewelry and a reclined piercing chair. Tap Vix, the
 * piercer, or use the parlor's panel to pick a spot and a piece.
 */
export function Parlor({ onPick }: { onPick: PickHandler }): JSX.Element {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#0e0812"]} />
      <fog attach="fog" args={["#1a0c22", 10, 24]} />
      <hemisphereLight args={["#e8d0ff", "#2a0c22", 1.3]} />
      <pointLight
        position={[0, 3, -1]}
        color="#ffe8f4"
        intensity={6}
        distance={12}
      />
      <Floor
        width={W}
        depth={D}
        color="#2a2030"
        texture={{ id: "brushed_concrete", scale: 0.5 }}
        low={{ metalness: 0.1, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.piercing} color={PINK} />
      {(
        [
          [0, bounds.z0 - 0.1, W + 0.4, 0.2],
          [bounds.x0 - 0.1, 0, 0.2, D],
          [bounds.x1 + 0.1, 0, 0.2, D],
        ] as const
      ).map(([x, z, w, d]) => (
        <mesh key={`${x}${z}`} position={[x, 2, z]} material={BRICK}>
          <boxGeometry args={[w, 4, d]} />
        </mesh>
      ))}
      {/* flash art: framed sheets of little designs on the back wall */}
      <primitive object={dressing} />
      {PARLOR.cases.map((c) => (
        <Case key={c.x0} c={c} />
      ))}
      {/* the reclined piercing chair */}
      <group position={[PARLOR.chair[0], 0, PARLOR.chair[1]]}>
        <mesh position-y={0.5} material={LEATHER}>
          <boxGeometry args={[0.7, 0.14, 1.2]} />
        </mesh>
        <mesh position={[0, 0.85, -0.55]} rotation-x={-0.5} material={LEATHER}>
          <boxGeometry args={[0.7, 0.8, 0.12]} />
        </mesh>
        <mesh position-y={0.25}>
          <cylinderGeometry args={[0.08, 0.3, 0.5, 12]} />
          <meshStandardMaterial
            color="#d8d8e0"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      </group>
      <NeonText
        text="INK & NEEDLE"
        color={PINK}
        font={MARQUEE}
        width={3.8}
        k={3.2}
        position={[0, 3.4, bounds.z0 + 0.03]}
        flicker
      />
      <TalkingNpc
        name="Vix"
        role="coat-check"
        look={PIERCER}
        mood="idle"
        at={[PARLOR.piercer[0], 0, PARLOR.piercer[1]]}
        rot={-Math.PI / 2}
        seed={361}
        greet
        context={{ venue: "piercing", neighborhood: "arts-district" }}
      />
    </>
  );
}
