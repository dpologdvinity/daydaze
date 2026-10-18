import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import {
  ALL_CELLS,
  cellsWithin,
  neighborhoodAt,
} from "../../game/city/cells.ts";
import {
  LIGHT_DISTANCE,
  LIGHT_INTENSITY,
  POINT_LIGHTS,
  RELOAD_DISTANCE,
  VIEW_RADIUS,
} from "../../game/city/tuning.ts";
import { KINDS, planCity, type Kind } from "../../game/city/plan.ts";
import type { Vec2 } from "../../game/walk.ts";
import type { PickHandler } from "../rooms/shared/Floor.tsx";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { CitySky } from "./CitySky.tsx";
import { Ocean } from "./Ocean.tsx";
import { Fireworks } from "./Fireworks.tsx";
import { Parade } from "./Parade.tsx";
import { BeachLife } from "./BeachLife.tsx";
import { SquareLife } from "./SquareLife.tsx";
import { Parols } from "./Parols.tsx";
import { Pedestrians } from "./Pedestrians.tsx";
import { NightMarket } from "./NightMarket.tsx";
import { WATER_Z } from "../../game/city/layout.ts";
import { setNeighborhood } from "./here.ts";
import { createLabelAtlas } from "./labelAtlas.ts";
import { createKindMeshes, disposeKindMeshes, writeKind } from "./meshes.ts";
import { CITY_CLOCK } from "./shaders.ts";
import { Traffic } from "./Traffic.tsx";
import { PlayerCar } from "./PlayerCar.tsx";
import type { ParkedCar } from "../../game/city/drive.ts";

// Enough for the busiest view of the whole city, so meshes never reallocate.
const WHOLE_CITY = planCity(ALL_CELLS, 0, [0, 0]);
const CAPACITY = Object.fromEntries(
  KINDS.map((k) => [k, Math.max(1, WHOLE_CITY.instances[k].length)]),
) as Record<Kind, number>;

/**
 * The downtown slice. Cells within VIEW_RADIUS of the player are written into
 * one InstancedMesh per kind. The loaded set is rebuilt only after the player
 * has moved RELOAD_DISTANCE, so most frames do no work at all. Between
 * rebuilds the only motion is the shared clock in the shaders.
 */
export function CityScene({
  player,
  onPick,
  car,
  onPark,
}: {
  player: Player;
  onPick: PickHandler;
  car: ParkedCar;
  onPark: (car: ParkedCar) => void;
}) {
  const tier = useQuality();
  const reduced = useReducedMotion();
  // the key light is the World's; these are the city's real lights
  const lightCount = tier === "high" ? POINT_LIGHTS.high : POINT_LIGHTS.low;
  const atlas = useMemo(() => createLabelAtlas(), []);
  const meshes = useMemo(() => createKindMeshes(CAPACITY, atlas), [atlas]);
  useEffect(() => {
    return () => {
      disposeKindMeshes(meshes);
      atlas.dispose();
    };
  }, [atlas, meshes]);
  useEffect(() => {
    CITY_CLOCK.uMotion.value = reduced ? 0 : 1;
  }, [reduced]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const loadedAt = useRef<Vec2 | null>(null);

  useFrame(({ gl, clock }) => {
    CITY_CLOCK.uTime.value = clock.elapsedTime;
    const x = player.pos.x;
    const z = player.pos.z;
    const last = loadedAt.current;
    if (!last || Math.hypot(x - last[0], z - last[1]) > RELOAD_DISTANCE) {
      const at: Vec2 = [x, z];
      loadedAt.current = at;
      // shortcut: planCity allocates a fresh plan on each 16 m reload, not per frame; stream into pooled buffers if reloads show up in a profile
      const plan = planCity(cellsWithin(at, VIEW_RADIUS), lightCount, at);
      for (const kind of KINDS)
        writeKind(meshes[kind], kind, plan.instances[kind]);
      lights.current.forEach((light, i) => {
        if (!light) return;
        const sign = plan.lights[i];
        light.intensity = sign ? LIGHT_INTENSITY : 0;
        if (sign) {
          light.position.set(sign.x, sign.y, sign.z);
          light.color.set(sign.color);
        }
      });
    }
    // read by tests; World records the draw counts for every room
    const dom = gl.domElement.dataset;
    dom.playerX = x.toFixed(2);
    dom.playerZ = z.toFixed(2);
    setNeighborhood(neighborhoodAt([x, z]));
  });

  // a drag orbits the camera; only a click walks the player
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };

  return (
    <>
      <color attach="background" args={["#0a0618"]} />
      <fog attach="fog" args={["#1a0d30", 120, 420]} />
      {/* high tier: a real night street lights skin, cars and glass */}
      {tier === "high" && (
        <Suspense fallback={null}>
          <Environment
            files="/hdri/cobblestone_street_night.hdr"
            environmentIntensity={0.5}
          />
        </Suspense>
      )}
      <CitySky />
      <hemisphereLight args={["#8fa6ff", "#2a1038", 1.6]} />
      {Array.from({ length: lightCount }, (_, i) => (
        <pointLight
          key={i}
          ref={(light) => {
            lights.current[i] = light;
          }}
          distance={LIGHT_DISTANCE}
          decay={2}
          intensity={0}
        />
      ))}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, WATER_Z - 450]}
        onClick={click}
        name="city-ground"
      >
        {/* land up to the waterline; the Ocean takes over past it */}
        <planeGeometry args={[1000, 900]} />
        <meshStandardMaterial color="#120d26" roughness={0.9} />
      </mesh>
      <Ocean />
      <BeachLife />
      <Fireworks />
      <Parade />
      <SquareLife />
      <Parols />
      {KINDS.map((kind) => (
        <primitive key={kind} object={meshes[kind]} onClick={click} />
      ))}
      <Traffic player={player} />
      <PlayerCar player={player} parked={car} onPark={onPark} />
      <Pedestrians player={player} />
      <NightMarket player={player} />
    </>
  );
}
