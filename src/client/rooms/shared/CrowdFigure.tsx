import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "../../../game/look.ts";
import { useReducedMotion } from "../../motion.ts";

/**
 * A low-poly stand-in for a full doll for background figures: four meshes
 * that share three materials, in the look's skin, hair and outfit colours.
 * A full doll costs about sixty draw calls, so a club can afford only a few.
 * `dance` bobs the figure on the beat; reduced motion holds it still.
 */
export function CrowdFigure({
  look,
  dance = false,
  seed = 0,
}: {
  look: Look;
  dance?: boolean;
  seed?: number;
}) {
  const body = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshToonMaterial({ color: look.skin }),
      hair: new THREE.MeshToonMaterial({ color: look.hairColor }),
      outfit: new THREE.MeshToonMaterial({ color: look.outfitColor }),
    }),
    [look.skin, look.hairColor, look.outfitColor],
  );
  useFrame(({ clock }) => {
    if (!body.current || !dance || calm) return;
    const t = clock.elapsedTime * 4 + seed;
    body.current.position.y = Math.abs(Math.sin(t)) * 0.06;
    body.current.rotation.z = Math.sin(t * 0.5) * 0.06;
  });
  return (
    <group ref={body}>
      <mesh position={[0, 0.95, 0]} material={mats.outfit}>
        <cylinderGeometry args={[0.3, 0.4, 0.9, 10]} />
      </mesh>
      <mesh position={[0, 0.25, 0]} material={mats.outfit}>
        <cylinderGeometry args={[0.2, 0.3, 0.5, 10]} />
      </mesh>
      <mesh position={[0, 1.6, 0]} material={mats.skin}>
        <sphereGeometry args={[0.2, 12, 10]} />
      </mesh>
      <mesh position={[0, 1.67, -0.02]} material={mats.hair}>
        <sphereGeometry args={[0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}
