// The Ferris wheel at the boardwalk's Fairground end: Arif's animated model
// (Poly Pizza, CC-BY; public/models/beach/ferris-animated.glb), turning slowly
// on its own clips. One instance, drawn only when the player is within
// DRAWN meters; it faces the sea along the boardwalk.

import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, type JSX } from "react";
import { FERRIS } from "../../game/city/boardwalk.ts";
import { useReducedMotion } from "../motion.ts";
import { cityFurniture } from "./CityFurniture.tsx";

const URL = "/models/beach/ferris-animated.glb";
/** The model is 6.2 m tall; the wheel stands 26 m. */
const SCALE = 4.2;
/** Its lowest point sits 3.77 m below its origin. */
const BASE = 3.77 * SCALE;
const GROUND = 0.14;
/** Meters from the player past which it is left out. */
const DRAWN = 280;
/** How fast the clips play: a slow, restful turn. */
const SPEED = 0.25;

function Wheel(): JSX.Element {
  const gltf = useGLTF(URL);
  const { actions } = useAnimations(gltf.animations, gltf.scene);
  const reduced = useReducedMotion();
  useEffect(() => {
    for (const action of Object.values(actions)) {
      if (!action) continue;
      action.timeScale = reduced ? 0 : SPEED;
      action.play();
    }
  }, [actions, reduced]);
  return (
    <primitive
      object={gltf.scene}
      position={[FERRIS.x, GROUND + BASE, FERRIS.z]}
      rotation={[0, Math.PI / 2, 0]}
      scale={SCALE}
    />
  );
}

export function BoardwalkFerris(): JSX.Element | null {
  const { at } = cityFurniture.use();
  const near = Math.hypot(at[0] - FERRIS.x, at[1] - FERRIS.z) < DRAWN;
  return near ? <Wheel /> : null;
}

useGLTF.preload(URL);
