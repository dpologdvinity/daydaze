// Lathed clay: rebuild only after edits, dispose replacements, rotate in place.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { thicknessAt, type Clay } from "../../../game/pottery.ts";

export function PotMesh({
  clay,
  color,
  spin = false,
}: {
  clay: Clay;
  color: string;
  spin?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const points = [new THREE.Vector2(0.001, 0)];
    for (let i = 0; i < 8; i++)
      points.push(
        new THREE.Vector2(
          (clay.left[i] + clay.right[i]) / 2,
          (i * clay.height) / 7,
        ),
      );
    for (let i = 7; i >= 0; i--)
      points.push(
        new THREE.Vector2(
          Math.max(
            0.03,
            (clay.left[i] + clay.right[i]) / 2 - thicknessAt(clay, i),
          ),
          Math.max(0.06, (i * clay.height) / 7),
        ),
      );
    points.push(new THREE.Vector2(0.001, 0.06));
    return new THREE.LatheGeometry(points, 40);
  }, [clay]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    if (spin && mesh.current) mesh.current.rotation.y += Math.min(dt, 0.1) * 2;
  });
  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={spin ? 0.72 : 0.24}
        metalness={spin ? 0 : 0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
