// Lechon and Kamayan Hall, Little Manila's Filipino restaurant scene: banig
// walls, swaying parols, the boodle-fight table, the spit-roast carving station
// and a videoke corner. Throws at render if the venue is missing from
// FOOD_VENUES. NPCs and ordering live in ./kamayan/Npcs.tsx.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FOOD_VENUES } from "../../game/food/venues.ts";
import {
  CARVING,
  FLOOR_BOUNDS,
  SOFA,
  TABLE,
  VIDEOKE,
} from "../../game/kamayanHall.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { KamayanNpcs } from "./kamayan/Npcs.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Batch } from "./shared/batch.ts";
import { bunting, plant, poster } from "./shared/details.ts";
import { groundMaps, surface } from "../city/worldTexture.ts";

const VENUE = FOOD_VENUES.find((v) => v.id === "lechon-kamayan-hall");
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
const CZ = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;
const HEIGHT = 3.8;
const PAROL_COLORS = [
  "#ff2f4f",
  "#ffd84f",
  "#4fe3ff",
  "#7dff6b",
  "#ff4fb3",
  "#ff8a3d",
];

const UP = new THREE.Vector3(0, 1, 0);
const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
  c: new THREE.Color(),
};

// a banig weave for the walls: woven pandan strips in two tones
const WEAVE = canvasTex(
  64,
  64,
  (ctx) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#c89a5a" : "#a8763a";
        ctx.fillRect(x * 8, y * 8, 8, 8);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x * 8, y * 8, (x + y) % 2 ? 8 : 2, (x + y) % 2 ? 2 : 8);
      }
  },
  [6, 2],
);

// the banig's real weave under its painted squares, from a CC0 scan
const WEAVE_RELIEF = groundMaps("bamboo_wall").normalMap;
WEAVE_RELIEF.repeat.set(8, 3);
const WOVEN = new THREE.MeshStandardMaterial({
  map: WEAVE,
  normalMap: WEAVE_RELIEF,
  roughness: 0.9,
});
// narra for the table and benches, darker wood at the carving station
const NARRA = surface("wood_veneer", {
  scale: 1.2,
  color: "#a0643a",
  roughness: 0.6,
});
const BENCH = surface("oak_wood_planks", {
  scale: 1,
  color: "#9a6a42",
  roughness: 0.8,
});
const STATION = surface("dark_wooden_planks", {
  scale: 1,
  color: "#8a6040",
  roughness: 0.7,
});
// banderitas in the flag's colors and the fiesta's
const BANDERITAS = ["#0038a8", "#ce1126", "#fcd116", "#ffffff", "#ff7ac8"];

/** Banderitas over the table, plants in the corners and fiesta posters. */
function buildDressing() {
  const b = new Batch();
  for (const z of [-3.6, 0.4, 3.2])
    bunting(
      b,
      [FLOOR_BOUNDS.x0 + 0.1, 3.5, z],
      [FLOOR_BOUNDS.x1 - 0.1, 3.5, z],
      36,
      BANDERITAS,
      0.4,
      0.16,
    );
  plant(b, { x: 6.4, z: -5.4 }, 1.6);
  plant(b, { x: -6.4, z: 5 }, 1.4);
  plant(b, { x: 6.5, z: 1.4 }, 1.3);
  for (const [z, d] of [
    [-3.2, 3],
    [-0.4, 1],
  ] as const)
    poster(
      b,
      { x: FLOOR_BOUNDS.x1 - 0.02, y: 2.2, z, ry: -Math.PI / 2 },
      d,
      0.7,
      0.9,
    );
  return b.build();
}

// banana leaves laid end to end: veins running off a pale midrib
const LEAF = canvasTex(
  256,
  64,
  (ctx) => {
    ctx.fillStyle = "#2f8a3a";
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = "rgba(200,255,180,0.35)";
    ctx.lineWidth = 1;
    for (let x = -32; x < 256; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 26, 0);
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 26, 64);
      ctx.stroke();
    }
    ctx.fillStyle = "#c8e8a0";
    ctx.fillRect(0, 30, 256, 4);
  },
  [4, 1],
);

/** A five-pointed parol, a little thick, to hang lit from the ceiling. */
function parolGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.12 : 0.28;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) shape.lineTo(x, y);
    else shape.moveTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: false,
  });
  g.translate(0, 0, -0.04);
  return g;
}

function Parols() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(parolGeometry, []);
  const spots = useMemo(
    () =>
      [-5, -2.5, 0, 2.5, 5].flatMap((x, i) => [
        [x, 3.1, TABLE.z - 1.6, i * 2],
        [x + 1.2, 3.2, TABLE.z + 2.2, i * 2 + 1],
      ]),
    [],
  );
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = calm ? 0 : clock.elapsedTime;
    const { m: mat, q, p, s } = scratch;
    spots.forEach(([x, y, z, k], i) => {
      q.setFromAxisAngle(UP, Math.sin(t * 0.6 + k) * 0.5);
      mat.compose(p.set(x, y + Math.sin(t + k) * 0.03, z), q, s.set(1, 1, 1));
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={(m) => {
        ref.current = m;
        if (!m) return;
        spots.forEach((_, i) =>
          m.setColorAt(i, hdr(PAROL_COLORS[i % PAROL_COLORS.length], 1.8)),
        );
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
      args={[geo, undefined, spots.length]}
      frustumCulled={false}
    >
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** The boodle fight: a low table under banana leaves, rice mounded down the
 * middle and the feast round it, the lechon at the head. */
function BoodleTable() {
  const len = TABLE.x1 - TABLE.x0;
  // rice in a ridge down the leaves; dishes either side of it
  const rice = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = TABLE.x0 + 0.3; x < TABLE.x1 - 1.4; x += 0.28)
      out.push([x, TABLE.z]);
    return out;
  }, []);
  const dishes = useMemo(() => {
    const colors = [
      "#ff8a3d",
      "#c82a2a",
      "#ffd84f",
      "#8a8a7a",
      "#5a3a1a",
      "#3a8a3a",
    ];
    const out: {
      x: number;
      z: number;
      c: string;
      s: [number, number, number];
    }[] = [];
    let k = 0;
    for (let x = TABLE.x0 + 0.4; x < TABLE.x1 - 1.5; x += 0.42)
      for (const side of [-1, 1]) {
        const c = colors[k++ % colors.length];
        out.push({ x, z: TABLE.z + side * 0.3, c, s: [0.14, 0.06, 0.1] });
      }
    return out;
  }, []);
  return (
    <group>
      <mesh
        position={[(TABLE.x0 + TABLE.x1) / 2, 0.36, TABLE.z]}
        material={NARRA}
      >
        <boxGeometry args={[len, 0.72, TABLE.half * 2]} />
      </mesh>
      <mesh
        position={[(TABLE.x0 + TABLE.x1) / 2, 0.725, TABLE.z]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[len - 0.1, TABLE.half * 2 - 0.1]} />
        <meshStandardMaterial map={LEAF} roughness={0.5} />
      </mesh>
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          const { m: mat, q, p, s } = scratch;
          rice.forEach(([x, z], i) =>
            m.setMatrixAt(
              i,
              mat.compose(p.set(x, 0.74, z), q.identity(), s.set(1, 0.6, 1)),
            ),
          );
          m.instanceMatrix.needsUpdate = true;
          m.computeBoundingSphere();
        }}
        args={[undefined, undefined, rice.length]}
      >
        <sphereGeometry args={[0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f8f4ec" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          const { m: mat, q, p, s, c } = scratch;
          dishes.forEach((d, i) => {
            m.setMatrixAt(
              i,
              mat.compose(p.set(d.x, 0.76, d.z), q.identity(), s.set(...d.s)),
            );
            m.setColorAt(i, c.set(d.c));
          });
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
          m.computeBoundingSphere();
        }}
        args={[undefined, undefined, dishes.length]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <Lechon position={[TABLE.x1 - 0.75, 0.73, TABLE.z]} />
      {/* the benches down both sides */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            (TABLE.x0 + TABLE.x1) / 2,
            0.22,
            TABLE.z + side * (TABLE.half + 0.45),
          ]}
          material={BENCH}
        >
          <boxGeometry args={[len, 0.44, 0.36]} />
        </mesh>
      ))}
    </group>
  );
}

/** A whole roast pig, skin crackled glossy, an apple in its mouth. */
function Lechon(props: { position: [number, number, number]; spin?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame((_, dt) => {
    if (props.spin && ref.current && !calm) ref.current.rotation.x += dt * 0.8;
  });
  const skin = (
    <meshStandardMaterial color="#9a4a14" roughness={0.25} metalness={0.15} />
  );
  return (
    <group position={props.position}>
      <group ref={ref} position-y={props.spin ? 0 : 0.18}>
        <mesh rotation-z={Math.PI / 2} scale={[1, 1, 0.85]}>
          <capsuleGeometry args={[0.2, 0.5, 6, 12]} />
          {skin}
        </mesh>
        <mesh position={[0.48, 0.02, 0]} scale={[1.2, 0.9, 0.85]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          {skin}
        </mesh>
        <mesh position={[0.64, 0, 0]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color="#c81e2a" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** The videoke: a screen on the front wall with its bouncing ball, and the
 * sofa turned to it. */
function Videoke() {
  const calm = useReducedMotion();
  const ball = useRef<THREE.Mesh>(null);
  const tex = useMemo(
    () =>
      canvasTex(256, 160, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 160);
        g.addColorStop(0, "#1a3a8a");
        g.addColorStop(1, "#ff4fb3");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 160);
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♪ VIDEOKE ♪", 128, 34);
        ctx.font = "700 40px serif";
        ["♪", "♫", "♪", "♩", "♫"].forEach((n, i) =>
          ctx.fillText(n, 40 + i * 44, 100 + (i % 2) * 18),
        );
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (!ball.current || calm) return;
    const t = (clock.elapsedTime * 1.4) % 5;
    ball.current.position.x = -0.6 + Math.floor(t) * 0.3 + (t % 1) * 0.3;
    ball.current.position.y = 0.05 + Math.sin((t % 1) * Math.PI) * 0.12;
  });
  return (
    <>
      <group
        position={[VIDEOKE[0], 1.6, VIDEOKE[1] - 0.06]}
        rotation-y={Math.PI}
      >
        <mesh position-z={-0.03}>
          <boxGeometry args={[1.7, 1.1, 0.06]} />
          <meshStandardMaterial color="#0a0a10" />
        </mesh>
        <mesh>
          <planeGeometry args={[1.56, 0.96]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh ref={ball} position-z={0.02}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial color={hdr("#ffe28a", 2.4)} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[(SOFA.x0 + SOFA.x1) / 2, 0.25, SOFA.z1 - 0.3]}>
        <boxGeometry args={[SOFA.x1 - SOFA.x0, 0.5, 0.6]} />
        <meshStandardMaterial color="#c2185b" roughness={0.6} />
      </mesh>
      <mesh position={[(SOFA.x0 + SOFA.x1) / 2, 0.6, SOFA.z0 + 0.15]}>
        <boxGeometry args={[SOFA.x1 - SOFA.x0, 0.7, 0.25]} />
        <meshStandardMaterial color="#c2185b" roughness={0.6} />
      </mesh>
    </>
  );
}

function Shell() {
  const woven = <primitive object={WOVEN} attach="material" />;
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
      <mesh position={[0, HEIGHT / 2, FLOOR_BOUNDS.z0 - 0.1]}>
        <boxGeometry args={[W + 0.4, HEIGHT, 0.2]} />
        {woven}
      </mesh>
      {[FLOOR_BOUNDS.x0 - 0.1, FLOOR_BOUNDS.x1 + 0.1].map((x) => (
        <mesh key={x} position={[x, HEIGHT / 2, CZ]}>
          <boxGeometry args={[0.2, HEIGHT, D]} />
          {woven}
        </mesh>
      ))}
      {/* capiz-shell windows down the north wall, lit from outside */}
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 2, FLOOR_BOUNDS.z0 + 0.02]}>
          <planeGeometry args={[1.6, 1.4, 6, 5]} />
          <meshBasicMaterial
            color={hdr("#fff0d8", 0.9)}
            toneMapped={false}
            wireframe
          />
        </mesh>
      ))}
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={`g${x}`} position={[x, 2, FLOOR_BOUNDS.z0 + 0.01]}>
          <planeGeometry args={[1.6, 1.4]} />
          <meshBasicMaterial color={hdr("#ffe8c8", 0.55)} toneMapped={false} />
        </mesh>
      ))}
      <NeonText
        text="KAIN NA!"
        color="#ffd84f"
        font={MARQUEE}
        width={3.2}
        k={3.6}
        flicker
        position={[0, 3.25, FLOOR_BOUNDS.z0 + 0.06]}
      />
    </>
  );
}

/** The carving station: a counter, the lechon turning on its spit over a
 * glowing bed of coals, and the server in front. */
function Carving() {
  const cz = (CARVING.z0 + CARVING.z1) / 2;
  const cx = (CARVING.x0 + CARVING.x1) / 2;
  return (
    <group>
      <mesh position={[cx, 0.5, cz]} material={STATION}>
        <boxGeometry
          args={[CARVING.x1 - CARVING.x0, 1, CARVING.z1 - CARVING.z0]}
        />
      </mesh>
      <mesh position={[cx, 1.02, cz]}>
        <boxGeometry args={[CARVING.x1 - CARVING.x0, 0.04, 1.6]} />
        <meshBasicMaterial color={hdr("#ff5a1a", 1.8)} toneMapped={false} />
      </mesh>
      <mesh position={[cx, 1.42, cz]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 1.8, 6]} />
        <meshStandardMaterial color="#c9c9d4" metalness={0.9} />
      </mesh>
      <group rotation-y={Math.PI / 2} position={[cx, 1.42, cz - 0.35]}>
        <Lechon position={[0, 0, 0]} spin />
      </group>
    </group>
  );
}

/**
 * Lechon and Kamayan Hall, Little Manila's sit-down Filipino restaurant:
 * woven banig walls and capiz windows, parol stars swaying overhead, a long
 * boodle-fight table under banana leaves heaped with rice, shrimp, salted
 * eggs and mango, a whole lechon at its head and another turning on the spit
 * at the carving station, and a videoke corner by the door where the titas
 * sing. Tap Tess at the station for the next dish.
 */
export function KamayanHall({ onPick }: { onPick: PickHandler }) {
  if (!VENUE)
    throw new Error("Lechon and Kamayan Hall is missing from the venues");
  return (
    <>
      <color attach="background" args={["#1a0a06"]} />
      <fog attach="fog" args={["#2a120a", 12, 30]} />
      <hemisphereLight args={["#ffd8a0", "#5a2a14", 0.7]} />
      <pointLight
        position={[0, 3, TABLE.z]}
        color="#ffc070"
        intensity={6}
        distance={12}
      />
      <pointLight
        position={[-5.8, 2.2, -2]}
        color="#ff7a2a"
        intensity={3}
        distance={6}
      />
      <Floor
        width={W}
        depth={D}
        center={[(FLOOR_BOUNDS.x0 + FLOOR_BOUNDS.x1) / 2, CZ]}
        color="#8a5a3a"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        mirror={0.15}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["kamayan-hall"]} color="#ffd84f" />
      <Shell />
      <Parols />
      <BoodleTable />
      <Carving />
      <Videoke />
      <KamayanNpcs venue={VENUE} />
    </>
  );
}
