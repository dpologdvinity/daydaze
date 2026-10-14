import { useMemo } from "react";
import * as THREE from "three";
import { lathe } from "../../avatar/dollGeometry.ts";
import { gradientMap } from "../../avatar/toon.ts";

export function MangoCocktail(props: {
  position: [number, number, number];
  scale?: number;
}) {
  const { glass, drink } = useMemo(() => {
    const glass = lathe(
      [
        [0, 0.05],
        [0.01, 0.05],
        [0.012, 0.008],
        [0.09, 0.006],
        [0.11, 0.03],
        [0.17, 0.05],
        [0.24, 0.042],
        [0.3, 0.056],
      ],
      24,
    );
    const drink = lathe(
      [
        [0.1, 0],
        [0.11, 0.026],
        [0.17, 0.045],
        [0.24, 0.037],
        [0.27, 0.044],
        [0.27, 0],
      ],
      24,
    );
    const p = drink.attributes.position;
    const col = new Float32Array(p.count * 3);
    const a = new THREE.Color("#ff2f4a"),
      b = new THREE.Color("#ffc21f"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.lerpColors(a, b, THREE.MathUtils.smoothstep(p.getY(i), 0.12, 0.25));
      col.set([c.r * 1.8, c.g * 1.8, c.b * 1.8], i * 3);
    }
    drink.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { glass, drink };
  }, []);
  return (
    <group {...props}>
      <mesh geometry={drink}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial
          color="#ffe8f5"
          metalness={0.1}
          roughness={0.02}
          transparent
          opacity={0.3}
          envMapIntensity={2}
        />
      </mesh>
      {/* mango wedge, straw, umbrella */}
      <mesh
        position={[0.05, 0.29, 0]}
        rotation-z={-0.5}
        scale={[0.05, 0.03, 0.025]}
      >
        <sphereGeometry args={[1, 16, 10, 0, Math.PI]} />
        <meshToonMaterial color="#ffa21f" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.02, 0.32, 0.01]} rotation-z={0.25}>
        <cylinderGeometry args={[0.005, 0.005, 0.22, 8]} />
        <meshToonMaterial color="#ff2f9a" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.05, 0.42, -0.01]} rotation={[0.3, 0, 0.45]}>
        <coneGeometry args={[0.07, 0.035, 12, 1, true]} />
        <meshToonMaterial
          color="#ff5fc1"
          gradientMap={gradientMap}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
