// Three more amusement park rides: the Scrambler, the Starship rotor and the
// Super Slide. Motion comes from the pure helpers in src/game/amusementPark.ts
// (scramblerTurns, starshipTurn, slideHeight); these components only pose
// meshes.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  SCRAMBLER_ARM,
  SCRAMBLER_AT,
  SCRAMBLER_CAR,
  scramblerTurns,
  STARSHIP_AT,
  STARSHIP_RADIUS,
  starshipTurn,
  slideHeight,
  SUPER_SLIDE,
} from "../../../game/amusementPark.ts";
import { Batch } from "../shared/batch.ts";
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

const LANE_COLORS = ["#ff2f9a", "#ffd84f", "#3fe0d0", "#9b5cff"];
const STEEL = new THREE.MeshStandardMaterial({
  color: "#c8ccd8",
  roughness: 0.4,
  metalness: 0.5,
});
const DECK = new THREE.MeshStandardMaterial({
  color: "#ff8a3d",
  roughness: 0.6,
});

/** The four lanes as one ribbon, each lane its own color, humps and all. */
function laneGeometry(): THREE.BufferGeometry {
  const { x, topZ, bottomZ, lanes } = SUPER_SLIDE;
  const steps = 60;
  const half = 0.46;
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  lanes.forEach((lane, li) => {
    c.set(LANE_COLORS[li] ?? "#ffffff");
    for (let i = 0; i < steps; i++) {
      const a = i / steps;
      const b = (i + 1) / steps;
      const za = topZ + (bottomZ - topZ) * a;
      const zb = topZ + (bottomZ - topZ) * b;
      const ya = slideHeight(a) + 0.1;
      const yb = slideHeight(b) + 0.1;
      const x0 = x + lane - half;
      const x1 = x + lane + half;
      pos.push(x0, ya, za, x0, yb, zb, x1, ya, za);
      pos.push(x1, ya, za, x0, yb, zb, x1, yb, zb);
      for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** The Super Slide: a tower at the north end, four wavy lanes in candy
 * colors down to the run-out, and a chain lift up the east side that
 * carries riders to the top. */
export function SuperSlide() {
  const S = SUPER_SLIDE;
  const len = S.bottomZ - S.topZ;
  const parts = useMemo(() => {
    const b = new Batch();
    // posts under the lanes, every couple of meters, at both edges
    for (let s = 0.08; s < 0.95; s += 0.16)
      for (const side of [-2, 2]) {
        const h = slideHeight(s);
        b.add(new THREE.CylinderGeometry(0.06, 0.06, h, 6), STEEL, {
          position: [S.x + side, h / 2, S.topZ + len * s],
        });
      }
    // the tower's legs and its platform at the top of the lanes
    for (const dx of [-2.2, 2.2])
      for (const dz of [-1.2, 0.4])
        b.add(new THREE.CylinderGeometry(0.1, 0.1, S.top, 8), STEEL, {
          position: [S.x + dx, S.top / 2, S.topZ + dz],
        });
    b.add(new THREE.BoxGeometry(4.8, 0.15, 2), DECK, {
      position: [S.x, S.top + 0.05, S.topZ - 0.4],
    });
    // the chain lift: a rail up the east side, on its own posts
    const rail = Math.hypot(len, S.top);
    b.add(new THREE.BoxGeometry(0.25, 0.12, rail), STEEL, {
      position: [S.liftX, S.top / 2, (S.topZ + S.bottomZ) / 2],
      rotation: [-Math.atan2(S.top, len), 0, 0],
    });
    for (let s = 0.2; s < 1; s += 0.3)
      b.add(new THREE.CylinderGeometry(0.06, 0.06, S.top * s, 6), STEEL, {
        position: [S.liftX, (S.top * s) / 2, S.bottomZ - len * s],
      });
    return b.build();
  }, [S, len]);
  const lanes = useMemo(laneGeometry, []);
  return (
    <group>
      <primitive object={parts} />
      <mesh geometry={lanes}>
        <meshStandardMaterial
          vertexColors
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <NeonText
        text="SUPER SLIDE"
        color="#ffd84f"
        font={MARQUEE}
        width={4}
        position={[S.x, S.top + 1.4, S.topZ - 1.2]}
      />
    </group>
  );
}
