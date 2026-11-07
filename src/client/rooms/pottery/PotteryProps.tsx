// Clay Day furniture built from plain boxes and cylinders: the CC-BY photogrammetry
// wheel and kiln scans we tried were hundreds of thousands of noisy triangles per
// chunk and fell apart when decimated, so these share a few materials instead.
import * as THREE from "three";

const ENAMEL = new THREE.MeshStandardMaterial({
  color: "#5f9486",
  roughness: 0.55,
});
const STEEL = new THREE.MeshStandardMaterial({
  color: "#c9ccd0",
  roughness: 0.35,
  metalness: 0.6,
});
const BRICK = new THREE.MeshStandardMaterial({
  color: "#d9b48a",
  roughness: 0.9,
});
const WOOD = new THREE.MeshStandardMaterial({
  color: "#b98a5e",
  roughness: 0.8,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#2b2522",
  roughness: 0.6,
});
const GLOW = new THREE.MeshStandardMaterial({
  color: "#ff7a2a",
  emissive: "#ff6a1a",
  emissiveIntensity: 1.4,
});

type At = { position: readonly [number, number, number] };

/** An electric wheel: motor cabinet, splash pan and a spinning head, about 1.5 m wide. */
export function Wheel({ position }: At) {
  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh position={[0, 0.3, 0]} material={ENAMEL}>
        <boxGeometry args={[1.1, 0.6, 0.9]} />
      </mesh>
      <mesh position={[0, 0.64, 0]} material={STEEL}>
        <cylinderGeometry args={[0.62, 0.55, 0.1, 32]} />
      </mesh>
      <mesh position={[0, 0.74, 0]} material={BLACK}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 24]} />
      </mesh>
      <mesh position={[0.5, 0.68, 0.5]} material={BLACK}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
      </mesh>
    </group>
  );
}

/** A three-board drying rack, 2.2 m wide; boards sit at y 0.5, 1.1 and 1.7. */
export function DryingShelf({ position }: At) {
  return (
    <group position={[position[0], position[1], position[2]]}>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1, 0]} material={WOOD}>
          <boxGeometry args={[0.1, 2, 0.6]} />
        </mesh>
      ))}
      {[0.5, 1.1, 1.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={WOOD}>
          <boxGeometry args={[2.2, 0.06, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, 1, -0.28]} material={WOOD}>
        <boxGeometry args={[2.1, 2, 0.04]} />
      </mesh>
    </group>
  );
}

/** A top-loading kiln: brick drum, domed lid, a glowing spy hole and a vent pipe. */
export function Kiln({ position, firing }: At & { firing: boolean }) {
  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh position={[0, 0.5, 0]} material={BRICK}>
        <cylinderGeometry args={[0.75, 0.8, 1, 8]} />
      </mesh>
      <mesh position={[0, 1.15, 0]} material={BRICK}>
        <cylinderGeometry args={[0.62, 0.75, 0.3, 8]} />
      </mesh>
      <mesh position={[0, 1.3, 0]} material={STEEL}>
        <cylinderGeometry args={[0.35, 0.62, 0.1, 8]} />
      </mesh>
      <mesh
        position={[0.5, 0.5, 0.58]}
        rotation={[0, 0.6, 0]}
        material={firing ? GLOW : BLACK}
      >
        <boxGeometry args={[0.2, 0.2, 0.06]} />
      </mesh>
      <mesh position={[0.55, 1.55, 0]} material={STEEL}>
        <cylinderGeometry args={[0.07, 0.07, 1, 10]} />
      </mesh>
    </group>
  );
}
