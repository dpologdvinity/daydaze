import { useMemo } from "react";
import * as THREE from "three";
import { lathe, lumpy } from "../../avatar/dollGeometry.ts";
import { gradientMap } from "../../avatar/toon.ts";
import { GOLD } from "./materials.ts";

/** A potted palm in a gold planter, 2.6 m tall at scale 1. */
export function Palm({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { trunk, frond } = useMemo(() => {
    const trunk = lumpy(
      lathe(
        [
          [0, 0.07],
          [0.6, 0.055],
          [1.2, 0.045],
          [1.7, 0.04],
          [1.75, 0],
        ],
        10,
      ),
      0.008,
      40,
    );
    const frond = new THREE.PlaneGeometry(0.34, 1.1, 1, 12);
    const p = frond.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = (p.getY(i) + 0.55) / 1.1;
      p.setX(
        i,
        p.getX(i) * Math.sin(Math.PI * Math.min(1, y * 1.1)) * (1 - y * 0.4),
      );
      p.setY(i, y * 1.1);
      p.setZ(i, -0.6 * y * y);
    }
    frond.computeVertexNormals();
    return { trunk, frond };
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.25} material={GOLD}>
        <cylinderGeometry args={[0.26, 0.2, 0.5, 20]} />
      </mesh>
      <mesh geometry={trunk} position-y={0.45}>
        <meshToonMaterial color="#3a2418" gradientMap={gradientMap} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          geometry={frond}
          position-y={2.15}
          rotation={[-0.5 - (i % 3) * 0.25, (i / 10) * Math.PI * 2, 0, "YXZ"]}
        >
          <meshToonMaterial
            color={i % 2 ? "#1f5a34" : "#2a7240"}
            gradientMap={gradientMap}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
