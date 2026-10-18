import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
  SCRAMBLER_ARM,
  SCRAMBLER_AT,
  SCRAMBLER_CAR,
  scramblerTurns,
  STARSHIP_AT,
  STARSHIP_RADIUS,
  starshipTurn,
} from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { GOLD, LACQUER } from "../shared/materials.ts";
import { MARQUEE, NeonText } from "../shared/Neon.tsx";
import { Bulbs } from "./Bulbs.tsx";

const TAU = Math.PI * 2;
const ARMS = 3;
const CAR_COLORS = [
  "#ff2f9a",
  "#3fe0d0",
  "#ffb02e",
  "#9b5cff",
  "#7dff6b",
  "#ff4fb3",
];

const HUB_BULBS = Array.from(
  { length: 18 },
  (_, i): [number, number, number] => {
    const a = (i / 18) * TAU;
    return [Math.cos(a) * 3.4, 0.32, Math.sin(a) * 3.4];
  },
);

/** The Scrambler: three arms swing round a hub while each arm's pair of
 * cars spins the other way, whipping riders past each other. */
export function Scrambler() {
  const calm = useReducedMotion();
  const hub = useRef<THREE.Group>(null);
  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const turn = scramblerTurns(clock.elapsedTime, calm);
    if (hub.current) hub.current.rotation.y = turn.hub;
    for (const s of spinners.current) if (s) s.rotation.y = turn.car;
  });
  const [x, z] = SCRAMBLER_AT;
  return (
    <group position={[x, 0, z]}>
      {/* the deck, its bulb rim and the central tower */}
      <mesh position-y={0.1}>
        <cylinderGeometry args={[3.5, 3.6, 0.2, 32]} />
        <meshStandardMaterial color="#1e2a4a" roughness={0.6} />
      </mesh>
      <Bulbs points={HUB_BULBS} radius={0.07} />
      <mesh position-y={1.4} material={LACQUER}>
        <cylinderGeometry args={[0.3, 0.4, 2.8, 12]} />
      </mesh>
      <mesh position-y={2.9} material={GOLD}>
        <coneGeometry args={[0.6, 0.6, 12]} />
      </mesh>
      <group ref={hub}>
        {Array.from({ length: ARMS }, (_, i) => {
          const a = (i / ARMS) * TAU;
          return (
            <group key={i} rotation-y={-a}>
              {/* the arm out from the tower, dipping to the cars */}
              <mesh
                position={[SCRAMBLER_ARM / 2, 1.5, 0]}
                rotation-z={0.35}
                material={GOLD}
              >
                <boxGeometry args={[SCRAMBLER_ARM + 0.4, 0.14, 0.14]} />
              </mesh>
              <group
                position={[SCRAMBLER_ARM, 0, 0]}
                ref={(g) => {
                  spinners.current[i] = g;
                }}
              >
                <mesh position-y={0.8} material={LACQUER}>
                  <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
                </mesh>
                {[0, Math.PI].map((b, k) => (
                  <group key={k} rotation-y={-b}>
                    {/* a tub car with a seat back, out on the spinner */}
                    <mesh position={[SCRAMBLER_CAR, 0.35, 0]}>
                      <cylinderGeometry args={[0.5, 0.42, 0.5, 14, 1, true]} />
                      <meshStandardMaterial
                        color={CAR_COLORS[(i * 2 + k) % CAR_COLORS.length]}
                        side={THREE.DoubleSide}
                        roughness={0.35}
                      />
                    </mesh>
                    <mesh position={[SCRAMBLER_CAR, 0.12, 0]}>
                      <cylinderGeometry args={[0.42, 0.42, 0.06, 14]} />
                      <meshStandardMaterial color="#141018" />
                    </mesh>
                  </group>
                ))}
              </group>
            </group>
          );
        })}
      </group>
      <NeonText
        text="SCRAMBLER"
        color="#3fe0d0"
        font={MARQUEE}
        width={3}
        k={3}
        position={[0, 3.6, 0]}
      />
    </group>
  );
}

const STARSHIP_LIGHTS = Array.from(
  { length: 24 },
  (_, i): [number, number, number] => {
    const a = (i / 24) * TAU;
    return [Math.cos(a) * 3.05, 2.45, Math.sin(a) * 3.05];
  },
);

const WALL_PAD = new THREE.BoxGeometry(1.25, 2.2, 0.3);
const WALL_MAT = new THREE.MeshStandardMaterial({ roughness: 0.7 });

/** Places the twelve wall pads round the rotor, pink and purple in turn. */
function setWall(mesh: THREE.InstancedMesh | null) {
  if (!mesh) return;
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    o.position.set(
      Math.cos(a) * (STARSHIP_RADIUS + 0.35),
      1.2,
      Math.sin(a) * (STARSHIP_RADIUS + 0.35),
    );
    o.rotation.set(0, -a + Math.PI / 2, 0);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.set(i % 2 ? "#9b5cff" : "#ff4fb3"));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** The Starship: a round rotor that spins so fast its riders stay pinned to
 * the padded wall. The top is open so you can watch them. */
export function Starship() {
  const calm = useReducedMotion();
  const rotor = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (rotor.current)
      rotor.current.rotation.y = starshipTurn(clock.elapsedTime, calm);
  });
  const [x, z] = STARSHIP_AT;
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.1}>
        <cylinderGeometry args={[3.3, 3.4, 0.2, 32]} />
        <meshStandardMaterial color="#20103a" roughness={0.6} />
      </mesh>
      <group ref={rotor}>
        {/* the padded wall, in alternating colors, open at the top */}
        <instancedMesh
          ref={setWall}
          args={[WALL_PAD, WALL_MAT, 12]}
          frustumCulled={false}
        />
        <mesh position-y={2.4}>
          <torusGeometry args={[3.05, 0.12, 8, 40]} />
          <meshStandardMaterial
            color="#c0c0c8"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <Bulbs points={STARSHIP_LIGHTS} radius={0.08} />
      </group>
      {/* the stair up and a doorway gap in the outer rail */}
      <mesh position={[0, 0.3, 3.5]}>
        <boxGeometry args={[1.4, 0.2, 0.8]} />
        <meshStandardMaterial color="#c0c0c8" metalness={0.6} roughness={0.4} />
      </mesh>
      <NeonText
        text="STARSHIP"
        color="#ff4fb3"
        font={MARQUEE}
        width={3}
        k={3}
        position={[0, 3.3, 3.2]}
      />
    </group>
  );
}
