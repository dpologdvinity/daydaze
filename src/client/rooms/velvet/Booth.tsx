import { useMemo } from "react";
import * as THREE from "three";
import { Cocktail } from "../shared/Cocktail.tsx";
import { GOLD, LACQUER, neonMat } from "../shared/materials.ts";
import { BOOTH } from "./layout.ts";

function sectorShape(r0: number, r1: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

export function Booth() {
  const velvet = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#5c0b3f",
        sheen: 1,
        sheenColor: new THREE.Color("#ff6ac8"),
        sheenRoughness: 0.35,
        roughness: 0.65,
      }),
    [],
  );
  const { seat, backs } = useMemo(() => {
    const span = 1.85;
    const ext = (shape: THREE.Shape, depth: number, bevel: number) => {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        curveSegments: 32,
      });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const seat = ext(sectorShape(0.95, 1.5, -span, span), 0.36, 0.05);
    const n = 11;
    const backs = Array.from({ length: n }, (_, i) => {
      const a0 = -span + (i * 2 * span) / n + 0.012;
      const a1 = -span + ((i + 1) * 2 * span) / n - 0.012;
      return ext(sectorShape(1.5, 1.68, a0, a1), 0.95, 0.055);
    });
    return { seat, backs };
  }, []);
  return (
    <group position={BOOTH}>
      <mesh geometry={seat} material={velvet} position-y={0.06} />
      {backs.map((g, i) => (
        <mesh key={i} geometry={g} material={velvet} position-y={0.06} />
      ))}
      <mesh position-y={0.04} rotation-x={-Math.PI / 2} material={GOLD}>
        <ringGeometry args={[1.48, 1.74, 64, 1, -1.9, 3.8]} />
      </mesh>
      {/* table */}
      <group position={[-0.25, 0, 0]}>
        <mesh position-y={0.36} material={GOLD}>
          <cylinderGeometry args={[0.05, 0.16, 0.72, 16]} />
        </mesh>
        <mesh position-y={0.73} material={LACQUER}>
          <cylinderGeometry args={[0.5, 0.5, 0.04, 40]} />
        </mesh>
        <mesh position-y={0.73} rotation-x={Math.PI / 2} material={GOLD}>
          <torusGeometry args={[0.5, 0.018, 8, 48]} />
        </mesh>
        <Cocktail position={[0.15, 0.75, 0.18]} scale={0.85} />
        <Cocktail position={[0.1, 0.75, -0.22]} scale={0.85} />
        {[
          [-0.18, 0.05],
          [-0.05, -0.05],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.75, z]}>
            <mesh position-y={0.04}>
              <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
              <meshStandardMaterial color="#ff3d8a" transparent opacity={0.6} />
            </mesh>
            <mesh position-y={0.07} material={neonMat("#ffc46a", 5)}>
              <sphereGeometry args={[0.012, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
