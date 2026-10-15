import type { Ref } from "react";
import type { Group } from "three";
import type { CarClass, CarSpec } from "../../../game/driving/car.ts";
import { NEON } from "./neon.ts";

// Body and cabin heights per class, so each reads as its class at a glance.
const SHAPE: Record<CarClass, { body: number; cabin: number; cabinZ: number }> =
  {
    beater: { body: 0.7, cabin: 0.55, cabinZ: -0.05 },
    everyday: { body: 0.65, cabin: 0.6, cabinZ: -0.05 },
    y2k: { body: 0.9, cabin: 0.7, cabinZ: 0 },
    luxury: { body: 0.6, cabin: 0.5, cabinZ: -0.1 },
    exotic: { body: 0.42, cabin: 0.34, cabinZ: -0.15 },
    kart: { body: 0.4, cabin: 0.3, cabinZ: -0.1 },
    bumper: { body: 0.8, cabin: 0.12, cabinZ: 0 },
  };

/**
 * A low-poly car in its class's silhouette: a body, a cabin and a tail strip.
 * Nose points down +z, so yaw matches the physics. Starts hidden.
 */
export function CarMesh({
  spec,
  color,
  ref,
}: {
  spec: CarSpec;
  color: string;
  ref?: Ref<Group>;
}) {
  const shape = SHAPE[spec.class];
  const lift = 0.12;
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, lift + shape.body / 2, 0]}>
        <boxGeometry args={[spec.width, shape.body, spec.length]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh
        position={[
          0,
          lift + shape.body + shape.cabin / 2,
          shape.cabinZ * spec.length,
        ]}
      >
        <boxGeometry
          args={[spec.width * 0.8, shape.cabin, spec.length * 0.45]}
        />
        <meshStandardMaterial color="#120e22" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0, lift + shape.body * 0.6, -spec.length / 2 - 0.02]}>
        <boxGeometry args={[spec.width * 0.8, 0.1, 0.04]} />
        <meshBasicMaterial color={NEON.red} toneMapped={false} />
      </mesh>
    </group>
  );
}
