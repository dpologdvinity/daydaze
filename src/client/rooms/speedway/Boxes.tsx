import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Box } from "./strips.ts";

/**
 * Many boxes in one draw call. `glow` boxes are unlit, so neon reads as light
 * and bloom picks it up on the high tier.
 */
export function Boxes({
  boxes,
  glow = false,
  color = "#ffffff",
  ball = false,
}: {
  boxes: readonly Box[];
  glow?: boolean;
  /** Base color of the solid boxes, multiplied by each box's color. */
  color?: string;
  /** Low-poly spheres in the same boxes, for heads. */
  ball?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const place = new THREE.Object3D();
    boxes.forEach((b, i) => {
      place.position.set(b.x, b.y + b.height / 2, b.z);
      place.rotation.set(0, b.yaw, 0);
      place.scale.set(b.length, b.height, b.depth);
      place.updateMatrix();
      m.setMatrixAt(i, place.matrix);
      if (b.color) m.setColorAt(i, b.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [boxes]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, boxes.length]}
      frustumCulled={false}
    >
      {ball ? (
        <sphereGeometry args={[0.5, 6, 4]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      {glow ? (
        <meshBasicMaterial toneMapped={false} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.7} />
      )}
    </instancedMesh>
  );
}
