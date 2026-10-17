import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../game/amusementPark.ts";
import {
  BAR,
  DANCE,
  STAGE,
  STOOL_X,
  STOOL_ZS,
  TABLE_SEATS,
  TABLES,
} from "../../game/laNoche.ts";
import { ROOMS } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { Bulbs } from "./amusementpark/Bulbs.tsx";
import { LaNocheNpcs } from "./lanoche/Npcs.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { PropSet } from "./shared/Prop.tsx";

const WALL_X = 6.2;
const BACK_Z = -6.2;
const FRONT_Z = 6.2;
const HEIGHT = 4.4;
const ORANGE = "#ff8a3d";
const RED = "#ff2f4f";
const GOLD = "#ffd27a";

/** Festoon lights looping across the room in three swags. */
function swags(): Vec3[] {
  const out: Vec3[] = [];
  for (const z of [-2.4, 0.6, 3.6])
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      out.push([
        -WALL_X + t * WALL_X * 2,
        3.9 - Math.sin(t * Math.PI) * 0.8,
        z + Math.sin(t * Math.PI * 2) * 0.3,
      ]);
    }
  return out;
}
const SWAGS = swags();

function Shell() {
  const plaster = <meshStandardMaterial color="#6a1a24" roughness={0.85} />;
  return (
    <>
      <mesh position={[0, HEIGHT / 2, BACK_Z]}>
        <boxGeometry args={[WALL_X * 2, HEIGHT, 0.2]} />
        {plaster}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * WALL_X, HEIGHT / 2, (FRONT_Z + BACK_Z) / 2]}
        >
          <boxGeometry args={[0.2, HEIGHT, FRONT_Z - BACK_Z]} />
          {plaster}
        </mesh>
      ))}
      {/* a gold dado rail round the walls */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (WALL_X - 0.12), 1.1, (FRONT_Z + BACK_Z) / 2]}
        >
          <boxGeometry args={[0.04, 0.06, FRONT_Z - BACK_Z]} />
          <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </>
  );
}

/** The band's stage: a red-carpeted platform with a gold lip, congas, a
 * keyboard and the singer's mic. */
function Stage() {
  const w = STAGE.x1 - STAGE.x0;
  const d = STAGE.z1 - STAGE.z0;
  const cz = (STAGE.z0 + STAGE.z1) / 2;
  const y = STAGE.height;
  return (
    <>
      <mesh position={[0, y / 2, cz]}>
        <boxGeometry args={[w, y, d]} />
        <meshStandardMaterial color="#8a1424" roughness={0.9} />
      </mesh>
      <mesh position={[0, y, STAGE.z1]}>
        <boxGeometry args={[w, 0.04, 0.06]} />
        <meshBasicMaterial color={hdr(GOLD, 2.2)} toneMapped={false} />
      </mesh>
      {/* the conga pair, stage left */}
      {[-0.22, 0.22].map((dx, i) => (
        <mesh key={dx} position={[-2.6 + dx, y + 0.38 + i * 0.03, cz - 0.1]}>
          <cylinderGeometry args={[0.14, 0.1, 0.76 + i * 0.06, 16]} />
          <meshStandardMaterial color="#9a5a2a" roughness={0.5} />
        </mesh>
      ))}
      {/* the keyboard, stage right */}
      <group position={[2.6, y, cz - 0.2]}>
        <mesh position-y={0.8}>
          <boxGeometry args={[1.2, 0.08, 0.36]} />
          <meshStandardMaterial color="#141018" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.85, 0.06]}>
          <boxGeometry args={[1.1, 0.02, 0.16]} />
          <meshStandardMaterial color="#f4f0e8" roughness={0.3} />
        </mesh>
        {[-0.5, 0.5].map((dx) => (
          <mesh key={dx} position={[dx, 0.4, 0]}>
            <boxGeometry args={[0.04, 0.8, 0.3]} />
            <meshStandardMaterial color="#2a2430" metalness={0.6} />
          </mesh>
        ))}
      </group>
      {/* the singer's mic stand, centre stage */}
      <mesh position={[0, y + 0.75, STAGE.z1 - 0.35]}>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
        <meshStandardMaterial color="#c9c9d4" metalness={0.9} roughness={0.3} />
      </mesh>
      <NeonText
        text="La Noche"
        color={ORANGE}
        font={SCRIPT}
        width={4.2}
        k={3.8}
        position={[0, 3.2, BACK_Z + 0.16]}
      />
    </>
  );
}

function Bar() {
  const length = BAR.z1 - BAR.z0;
  const cz = (BAR.z0 + BAR.z1) / 2;
  const cx = (BAR.front + BAR.back) / 2;
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, Math.PI / 2] as const),
    [],
  );
  return (
    <>
      <mesh position={[cx, 0.52, cz]}>
        <boxGeometry args={[BAR.back - BAR.front, 1.04, length]} />
        <meshStandardMaterial color="#3a1a14" roughness={0.6} />
      </mesh>
      <mesh position={[cx - 0.05, 1.07, cz]}>
        <boxGeometry args={[BAR.back - BAR.front + 0.1, 0.05, length + 0.1]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* a shelf of rum and mezcal bottles behind, lit amber */}
      <mesh position={[WALL_X - 0.15, 1.6, cz]}>
        <boxGeometry args={[0.2, 0.04, length]} />
        <meshStandardMaterial color="#2a140e" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[WALL_X - 0.15, 1.76, BAR.z0 + 0.3 + i * 0.42]}>
          <cylinderGeometry args={[0.04, 0.045, 0.28, 8]} />
          <meshBasicMaterial
            color={hdr(i % 3 ? "#c87a2a" : "#e8d8a8", 0.9)}
            toneMapped={false}
          />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <PropSet
          model="bar-stool"
          width={0.42}
          depth={0.42}
          height={0.82}
          at={stools}
        />
      </Suspense>
    </>
  );
}

function Tables() {
  // each chair turned to face the dance floor (facing is (sin yaw, cos yaw))
  const chairs = useMemo(
    () =>
      TABLE_SEATS.map(
        ([x, z]) => [x, 0, z, Math.atan2(DANCE[0] - x, DANCE[1] - z)] as const,
      ),
    [],
  );
  return (
    <>
      {TABLES.map(([x, z]) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position-y={0.74}>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
            <meshStandardMaterial color="#e8d8c8" roughness={0.4} />
          </mesh>
          <mesh position-y={0.37}>
            <cylinderGeometry args={[0.04, 0.2, 0.74, 10]} />
            <meshStandardMaterial color="#2a140e" metalness={0.5} />
          </mesh>
          {/* a candle in a red glass */}
          <mesh position-y={0.82}>
            <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
            <meshBasicMaterial color={hdr(RED, 1.6)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <Suspense fallback={null}>
        <PropSet
          model="cafe-chair"
          width={0.48}
          depth={0.48}
          height={0.9}
          at={chairs}
        />
      </Suspense>
    </>
  );
}

function Lights() {
  const calm = useReducedMotion();
  const stage = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (stage.current)
      stage.current.intensity =
        5 + (calm ? 0 : Math.sin(clock.elapsedTime * 3.17) * 1.2);
  });
  return (
    <>
      <hemisphereLight args={["#ffb07a", "#3a0a14", 0.55]} />
      <pointLight
        ref={stage}
        position={[0, 3.4, STAGE.z1 + 0.8]}
        color={ORANGE}
        intensity={5}
        distance={9}
      />
      <pointLight
        position={[DANCE[0], 3, DANCE[1] + 2]}
        color="#ff5a8a"
        intensity={3}
        distance={8}
      />
    </>
  );
}

/**
 * La Noche, the Latin club beside the Velvet Room: deep red plaster and a
 * gold rail, swags of warm festoon lights, a band on a red stage under the
 * club's name in orange script, a tiled dance floor glowing sunset colours,
 * a gold-topped bar of rum and mezcal, candlelit tables and palms in the
 * corners. Salsa all night.
 */
export function LaNoche({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#14040a"]} />
      <fog attach="fog" args={["#2a0810", 10, 26]} />
      <Lights />
      <Floor
        width={WALL_X * 2}
        depth={FRONT_Z - BACK_Z}
        center={[0, 0]}
        color="#6a4a3a"
        texture={{ id: "herringbone_parquet", scale: 0.45 }}
        mirror={0.3}
        low={{ metalness: 0, roughness: 0.7 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["la-noche"]} color={ORANGE} />
      <Shell />
      <Stage />
      <LedFloor
        center={DANCE}
        cols={6}
        rows={5}
        colors={[ORANGE, RED, GOLD, "#ff5a8a"]}
      />
      <Bar />
      <Tables />
      <Bulbs
        points={SWAGS}
        colors={[GOLD, "#ffb45a", "#ffe8c0"]}
        radius={0.05}
      />
      <Palm position={[-5.4, 0, -5.2]} />
      <Palm position={[5.4, 0, 5.2]} scale={0.9} />
      <LaNocheNpcs onDrink={orderMojito} />
    </>
  );
}

const orderMojito = () => drink("cocktail");
