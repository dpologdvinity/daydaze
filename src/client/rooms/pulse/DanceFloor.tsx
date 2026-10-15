import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { DANCE } from "./layout.ts";

/** Pulse's three room lights; the key light comes from the world. */
export function ClubLights() {
  const dance = useRef<THREE.PointLight>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (dance.current && !calm)
      dance.current.intensity = 3 + Math.sin(clock.elapsedTime * 4) * 1.2;
  });
  return (
    <>
      <hemisphereLight args={["#6b3cff", "#ff2f9a", 0.35]} />
      <pointLight
        ref={dance}
        position={[DANCE.x, 2.6, DANCE.y]}
        color="#ff2fa8"
        intensity={3}
        distance={8}
      />
      <pointLight
        position={[0, 2.4, -3.6]}
        color="#4fe3ff"
        intensity={4}
        distance={6}
      />
    </>
  );
}
