import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { RoomDefinition } from "../../../game/rooms.ts";
import { useReducedMotion } from "../../motion.ts";
import { hdr } from "./materials.ts";

/** A breathing ring on the floor at every portal, sized from the room data. */
export function PortalPads({
  room,
  color = "#ffb02e",
}: {
  room: RoomDefinition;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (!group.current || calm) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.06;
    for (const ring of group.current.children) ring.scale.set(s, s, 1);
  });
  return (
    <group ref={group}>
      {room.portals.map((p) => (
        <mesh
          key={p.id}
          position={[p.position[0], 0.015, p.position[1]]}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[p.radius * 0.82, p.radius, 48]} />
          <meshBasicMaterial
            color={hdr(color, 3)}
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}
