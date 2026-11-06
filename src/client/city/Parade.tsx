// The Pride parade on the Beachside boardwalk: four floats with rainbow arches,
// neon signs and two dancers each, placed every frame by floatX from the shared
// parade clock. Floats outside the route and dancers beyond 140 m are hidden;
// reduced motion freezes them.

import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { floatX, FLOATS, PARADE_Z } from "../../game/city/parade.ts";
import type { Look } from "../../game/look.ts";
import { useReducedMotion } from "../motion.ts";
import { CrowdFigure } from "../rooms/shared/CrowdFigure.tsx";
import { hdr } from "../rooms/shared/materials.ts";
import { MARQUEE, NeonText } from "../rooms/shared/Neon.tsx";
import { paradeClock } from "./eventClocks.ts";

const RAINBOW = [
  "#ff2f4f",
  "#ff8a2f",
  "#ffd84f",
  "#3fd06a",
  "#2e7dff",
  "#9b5cff",
];
const SIGNS = ["PRIDE", "LOVE WINS", "SAPPHIC SUMMER", "DAYDAZE"];
/** Dancers stay hidden past this distance from the camera. */
const DANCER_RANGE = 140;

const DANCERS: readonly Look[] = (
  [
    ["#f3d4c4", "pigtails", "#ff4fb3", "baby-tee-mini", "#ff2f9a"],
    ["#633c29", "afro", "#7b4dff", "mini", "#9b5cff"],
    ["#c48d68", "mermaid", "#f1d78f", "sequin-slip", "#ffb02e"],
    ["#94603f", "pixie", "#7ee8a2", "shorts", "#3fe0d0"],
    ["#e6b48e", "shag", "#1b1014", "jeans", "#e8e2ff"],
    ["#f3d4c4", "coils", "#b77a3e", "baby-tee-mini", "#ffb02e"],
    ["#633c29", "braids", "#1b1014", "mini", "#ff2f9a"],
    ["#c48d68", "top-knot", "#4a2a1c", "sequin-slip", "#9b5cff"],
  ] as const
).map(([skin, hairStyle, hairColor, outfit, outfitColor]) => ({
  skin,
  hairStyle,
  hairColor,
  outfit,
  outfitColor,
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  shadow: "#ffd1f0",
}));

const TRUCK_URL = "/models/beach/parade-truck.glb";
useGLTF.preload(TRUCK_URL);

/** One float: a pickup truck (Quaternius, CC0) turned to roll east, a
 * rainbow arch over its bed, a neon sign and two dancers on the bed. */
function Float({ k }: { k: number }) {
  const truck = useGLTF(TRUCK_URL).scene;
  const mine = useMemo(() => truck.clone(true), [truck]);
  return (
    <>
      {/* the model's nose points +z; the parade rolls toward +x */}
      <primitive object={mine} rotation-y={Math.PI / 2} />
      {RAINBOW.map((c, i) => (
        <mesh key={c} position={[-1.5, 1.05, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[1.35 - i * 0.12, 0.07, 6, 24, Math.PI]} />
          <meshBasicMaterial color={hdr(c, 1.5)} toneMapped={false} />
        </mesh>
      ))}
      <NeonText
        text={SIGNS[k % SIGNS.length]}
        color={RAINBOW[(k * 2) % RAINBOW.length]}
        font={MARQUEE}
        width={2.6}
        k={3}
        position={[-3.05, 1.9, 0]}
        rotation-y={-Math.PI / 2}
      />
    </>
  );
}

/**
 * The Pride parade on the Beachside boardwalk: four floats under rainbow
 * arches roll east from one end to the other every few minutes, with
 * dancers aboard. Floats out of the parade, and dancers far from the
 * camera, are hidden. Under reduced motion the floats stand still where
 * they are.
 */
export function Parade() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const floats = useRef<(THREE.Group | null)[]>([]);
  const crews = useRef<(THREE.Group | null)[]>([]);
  const frozen = useRef<number | null>(null);
  useFrame(() => {
    const live = paradeClock();
    if (!calm) frozen.current = null;
    else frozen.current ??= live;
    const t = frozen.current ?? live;
    for (let k = 0; k < FLOATS; k++) {
      const g = floats.current[k];
      if (!g) continue;
      const x = floatX(t, k);
      g.visible = x !== null;
      if (x === null) continue;
      g.position.set(x, 0, PARADE_Z);
      const crew = crews.current[k];
      if (crew)
        crew.visible =
          Math.hypot(camera.position.x - x, camera.position.z - PARADE_Z) <
          DANCER_RANGE;
    }
  });
  return (
    <>
      {Array.from({ length: FLOATS }, (_, k) => (
        <group
          key={k}
          ref={(g) => {
            floats.current[k] = g;
          }}
          visible={false}
        >
          <Float k={k} />
          <group
            ref={(g) => {
              crews.current[k] = g;
            }}
          >
            {[-2.3, -0.8].map((dx, i) => (
              <group
                key={dx}
                position={[dx, 1.05, i ? 0.35 : -0.35]}
                rotation-y={i ? -0.3 : 0.3}
              >
                <CrowdFigure
                  look={DANCERS[(k * 2 + i) % DANCERS.length]}
                  dance
                  seed={301 + k * 2 + i}
                />
              </group>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
