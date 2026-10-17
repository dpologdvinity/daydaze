import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { danceOffAt } from "../../../game/danceOff.ts";
import { useReducedMotion } from "../../motion.ts";
import { MARQUEE, NeonText } from "../shared/Neon.tsx";
import { danceOffClock } from "./danceOffClock.ts";
import { DANCE } from "./layout.ts";

/** "DANCE-OFF" in neon over the floor while one is on, flashing on the beat
 * (steady under reduced motion). */
export function DanceOffSign() {
  const calm = useReducedMotion();
  const sign = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = sign.current;
    if (!m) return;
    const t = danceOffClock();
    m.visible = danceOffAt(t).on && (calm || Math.floor(t * 4) % 4 !== 3);
  });
  return (
    <NeonText
      ref={sign}
      text="DANCE-OFF"
      color="#ff2f9a"
      font={MARQUEE}
      width={4.2}
      position={[DANCE.x, 3.1, DANCE.y - 2.4]}
      visible={false}
    />
  );
}
