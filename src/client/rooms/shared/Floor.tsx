// The walkable floor every room stands on: a plane that turns a click into a
// walk order, mirrored with MeshReflectorMaterial on high quality and a plain
// glossy material on low. A drag (over 6 px) is taken as a camera orbit and
// ignored.

import { MeshReflectorMaterial } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";
import { useQuality } from "../../world/quality.ts";
import { tiledMaps } from "../../city/worldTexture.ts";

/**
 * Called with the clicked floor point as [x, z] in room space, to walk the
 * player there.
 */
export type PickHandler = (point: Vec2) => void;

/**
 * The walkable ground. High quality mirrors the room in it; low quality
 * keeps the same color as a plain glossy surface.
 */
export function Floor({
  width,
  depth,
  center = [0, 0],
  color,
  map,
  texture,
  mirror = 0.7,
  mixStrength = 3.2,
  roughness = 0.55,
  envMapIntensity = 1,
  low = { metalness: 0.6, roughness: roughness * 0.55 },
  onPick,
}: {
  width: number;
  depth: number;
  /** Center of the floor on the XZ plane. */
  center?: [number, number];
  color: string;
  map?: THREE.Texture;
  /** A Poly Haven CC0 set (public/textures/<id>), `scale` repeats a meter;
   * `color` tints it. With `map` too, `map` stays the color and the set
   * adds its relief (normal and roughness). */
  texture?: { id: string; scale: number };
  mirror?: number;
  mixStrength?: number;
  roughness?: number;
  /** How strongly the room's environment map shows in the glossy surface. */
  envMapIntensity?: number;
  /** Low quality has no mirror; a big glossy plane can flood with specular. */
  low?: { metalness: number; roughness: number };
  onPick: PickHandler;
}) {
  const quality = useQuality();
  const set = texture && tiledMaps(texture.id, width, depth, texture.scale);
  const maps = set
    ? { ...set, map: map ?? set.map }
    : { map, normalMap: null, roughnessMap: null };
  const click = (e: ThreeEvent<MouseEvent>) => {
    // a drag is an orbit, not a walk order
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[center[0], 0, center[1]]}
      onClick={click}
      name="floor"
    >
      <planeGeometry args={[width, depth]} />
      {quality === "low" ? (
        <meshStandardMaterial
          color={color}
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.roughnessMap}
          metalness={low.metalness}
          roughness={low.roughness}
          envMapIntensity={envMapIntensity}
        />
      ) : (
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={mixStrength}
          mixContrast={1.1}
          roughness={roughness}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color={color}
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.roughnessMap}
          metalness={texture ? 0.1 : 0.6}
          envMapIntensity={envMapIntensity}
          mirror={mirror}
        />
      )}
    </mesh>
  );
}
