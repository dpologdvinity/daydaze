// Stream the city's ground, life and authored architecture around the player.
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ALL_CELLS, neighborhoodAt } from "../../game/city/cells.ts";
import {
  LIGHT_DISTANCE,
  LIGHT_INTENSITY,
  POINT_LIGHTS,
  RELOAD_DISTANCE,
} from "../../game/city/tuning.ts";
import { KINDS, planCity, type Kind } from "../../game/city/plan.ts";
import { baysWanted, planView } from "../../game/city/budget.ts";
import { nearPlaneFor, NEAR_MIN } from "../../game/city/nearPlane.ts";
import { CITY_FLEET } from "../../game/ships.ts";
import type { Vec2 } from "../../game/walk.ts";
import type { PickHandler } from "../rooms/shared/Floor.tsx";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useDetail, useGraphics } from "../world/quality.ts";
import { DRAW_FAR } from "../../game/graphics.ts";
import { StreetFood } from "./StreetFood.tsx";
import { StreetDealer } from "./StreetDealer.tsx";
import { CitySky } from "./CitySky.tsx";
import { Fleet } from "./Fleet.tsx";
import { Ocean } from "./Ocean.tsx";
import { Fishing } from "../rooms/shared/Fishing.tsx";
import { CITY_LAND, Outskirts } from "./Outskirts.tsx";
import { Fireworks } from "./Fireworks.tsx";
import { Parade } from "./Parade.tsx";
import { Heist } from "./Heist.tsx";
import { PlayerPursuit } from "./PlayerPursuit.tsx";
import { Chase } from "./Chase.tsx";
import { BeachLife } from "./BeachLife.tsx";
import { BEACH_COURT, VolleyCourt } from "./VolleyCourt.tsx";
import { SquareLife } from "./SquareLife.tsx";
import { Parols } from "./Parols.tsx";
import { Pedestrians } from "./Pedestrians.tsx";
import { ChatGroups } from "./ChatGroups.tsx";
import { SidewalkTrips } from "./SidewalkTrips.tsx";
import { CarHits } from "./CarHits.tsx";
import { NightMarket } from "./NightMarket.tsx";
import { setInPark, setNeighborhood } from "./here.ts";
import { inPark } from "../../game/city/park.ts";
import { createLabelAtlas } from "./labelAtlas.ts";
import {
  createKindMeshes,
  dimForDay,
  disposeKindMeshes,
  writeKind,
} from "./meshes.ts";
import { useDaylight } from "./daylight.ts";
import { groundMaps, worldMapped } from "./worldTexture.ts";
import { useDressings } from "./season.ts";
import { QueueCrowd } from "./QueueCrowd.tsx";
import { SeasonalDressing } from "./SeasonalDressing.tsx";
import { CityFurniture, cityFurniture } from "./CityFurniture.tsx";
import { BoardwalkFerris } from "./BoardwalkFerris.tsx";
import { CityPark } from "./CityPark.tsx";
import { ParkWildlife } from "./ParkWildlife.tsx";
import { ParkButterflies } from "./ParkButterflies.tsx";
import { DogPark } from "./DogPark.tsx";
import { FarmersMarket } from "./FarmersMarket.tsx";
import { BandShell } from "./BandShell.tsx";
import { CityTrees, cityTrees } from "./CityTrees.tsx";
import { DreamBuildings, cityDream } from "./DreamBuildings.tsx";
import { StreetPieces, cityStreet } from "./StreetPieces.tsx";
import { ElLine, ElLineBoundary } from "./ElLine.tsx";
import { ElRide } from "./ElRide.tsx";
import { TaxiRide } from "./TaxiRide.tsx";
import { CITY_CLOCK } from "./shaders.ts";
import { CityTransit } from "./CityTransit.tsx";
import { ParkedCars } from "./ParkedCars.tsx";
import { Traffic } from "./Traffic.tsx";
import { PlayerCar } from "./PlayerCar.tsx";
import { AvenueWear } from "./AvenueWear.tsx";
import { GasStations } from "./GasStations.tsx";
import type { ParkedCar } from "../../game/city/drive.ts";

const CityHdri = lazy(() => import("./CityHdri.tsx"));
const CityMaterialDetail = lazy(() => import("./CityMaterialDetail.tsx"));

/** `?bays=0` selects the skyline level of architectural detail. */
const NO_BAYS = new URLSearchParams(location.search).get("bays") === "0";

// Enough for the busiest view of the whole city, so meshes never reallocate.
const WHOLE_CITY = planCity(ALL_CELLS, 0, [0, 0]);
const capacity = (kind: Kind): number =>
  Math.max(1, WHOLE_CITY.instances[kind].length);

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
  const activeDressings = useDressings();
  const canvas = useThree((state) => state.gl.domElement);
  const camera = useThree((state) => state.camera);
  // the other rooms keep the world camera's close near plane
  useEffect(
    () => () => {
      camera.near = NEAR_MIN;
      camera.updateProjectionMatrix();
    },
    [camera],
  );
  const dressingNames = activeDressings.join(",");
  useEffect(() => {
    canvas.dataset.dressings = dressingNames;
    return () => {
      delete canvas.dataset.dressings;
    };
  }, [canvas, dressingNames]);
  const tier = useDetail();
  const { distance, reflections, shadows } = useGraphics();
  const far = DRAW_FAR[distance];
  const reduced = useReducedMotion();
  // the key light is the World's; these are the city's real lights
  const lightCount = tier !== "low" ? POINT_LIGHTS.high : POINT_LIGHTS.low;
  const atlas = useMemo(() => createLabelAtlas(), []);
  const meshes = useMemo(() => createKindMeshes(capacity, atlas), [atlas]);
  // the ground between the surfaces: worn concrete, patchy at long range
  const groundMaterial = useMemo(
    () =>
      worldMapped(
        new THREE.MeshStandardMaterial({
          ...groundMaps("concrete_pavement"),
          color: "#8c8782",
          roughness: 0.95,
        }),
        0.3,
        false,
        0.5,
      ),
    [],
  );
  useEffect(() => () => groundMaterial.dispose(), [groundMaterial]);
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
  const wearsBays = useRef(false);

  // day and night (daylight.ts): sky, fog, sun and hemisphere follow the
  // hour; neon, signs, lit windows and the walls' night glow dim by day
  const day = useDaylight();
  const background = useMemo(() => new THREE.Color(), []);
  const fog = useRef<THREE.Fog>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const night = useRef(day.neon);
  useEffect(() => {
    night.current = day.neon;
    background.setRGB(...day.horizon);
    if (fog.current) {
      fog.current.color.setRGB(...day.fog);
      // clear days see far; night closes in
      fog.current.near = 120 + 120 * day.sun;
      // the fog is thick by the camera's far plane (600 at the Medium render
      // distance, see World.tsx), so the city's edge dissolves into the
      // horizon instead of ending in a cut
      fog.current.far = Math.min(420 + 320 * day.sun, 590) * (far / 600);
    }
    if (sun.current) {
      // celestial directional light: sun by day, reused as cool moonlight at
      // night (#16) to avoid shader recompile hitches while keeping the light slot useful
      const wSun = 2.6 * day.sun;
      const wMoon = 0.38 * day.moon;
      const total = wSun + wMoon;
      if (total > 0) {
        const dx =
          (day.sunDirection[0] * wSun + day.moonDirection[0] * wMoon) / total;
        const dy =
          (day.sunDirection[1] * wSun + day.moonDirection[1] * wMoon) / total;
        const dz =
          (day.sunDirection[2] * wSun + day.moonDirection[2] * wMoon) / total;
        const dLen = Math.hypot(dx, dy, dz) || 1;
        sun.current.position.set(
          (dx / dLen) * 120,
          (dy / dLen) * 120,
          (dz / dLen) * 120,
        );

        const sunR = 1;
        const sunG = 0.95 - 0.25 * day.golden;
        const sunB = 0.86 - 0.45 * day.golden;
        // cool pale silver-blue moonlight
        const moonR = 0.66;
        const moonG = 0.76;
        const moonB = 1.0;

        const sW = wSun / total;
        const mW = wMoon / total;
        sun.current.color.setRGB(
          sunR * sW + moonR * mW,
          sunG * sW + moonG * mW,
          sunB * sW + moonB * mW,
        );
        sun.current.intensity = total;
      }
    }
    if (hemi.current) {
      hemi.current.color.setRGB(...day.hemiSky);
      hemi.current.groundColor.setRGB(...day.hemiGround);
      hemi.current.intensity = day.hemi;
    }
    dimForDay(meshes, day.neon);
  }, [day, background, meshes, far]);

  useFrame(({ gl, clock, camera }) => {
    CITY_CLOCK.uTime.value = clock.elapsedTime;
    const x = player.pos.x;
    const z = player.pos.z;
    const last = loadedAt.current;
    // pulled out to the overview, the plan drops the bays (budget.ts)
    const away = Math.hypot(
      camera.position.x - x,
      camera.position.y - player.pos.y,
      camera.position.z - z,
    );
    const bays = !NO_BAYS && baysWanted(away, wearsBays.current);
    // pulled out, the near plane follows, so the depth buffer can tell the
    // asphalt from the ground under it (nearPlane.ts)
    const near = nearPlaneFor(away);
    if (near !== camera.near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    if (
      !last ||
      bays !== wearsBays.current ||
      Math.hypot(x - last[0], z - last[1]) > RELOAD_DISTANCE
    ) {
      wearsBays.current = bays;
      const at: Vec2 = [x, z];
      loadedAt.current = at;
      // shortcut: planCity allocates a fresh plan on each 16 m reload, not per frame; stream into pooled buffers if reloads show up in a profile
      // the same plan the low-tier budget test prices (budget.ts)
      const plan = planView(at, tier, bays);
      for (const kind of KINDS)
        writeKind(meshes[kind], kind, plan.instances[kind]);
      cityTrees.set({ spots: plan.trees, at });
      cityFurniture.set({ spots: plan.furniture, at, overview: !bays });
      cityDream.set({ spots: plan.dream });
      cityStreet.set({ pieces: plan.street });
      lights.current.forEach((light, i) => {
        if (!light) return;
        const sign = plan.lights[i];
        // the signs' real lights fade out by day with the neon
        light.intensity = sign ? LIGHT_INTENSITY * night.current : 0;
        if (sign) {
          light.position.set(sign.x, sign.y, sign.z);
          light.color.set(sign.color);
        }
      });
    }
    // read by tests; World records the draw counts for every room
    const dom = gl.domElement.dataset;
    // an attribute write marks the canvas dirty for style work: skip it when
    // she stands still
    const px = x.toFixed(2);
    const pz = z.toFixed(2);
    if (dom.playerX !== px) dom.playerX = px;
    if (dom.playerZ !== pz) dom.playerZ = pz;
    setNeighborhood(neighborhoodAt([x, z]));
    setInPark(inPark(x, z));
  });

  // a drag orbits the camera; only a click walks the player
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };

  return (
    <>
      <primitive attach="background" object={background} />
      <fog ref={fog} attach="fog" args={["#1a0d30", 120, 420]} />
      {/* the celestial light: sun by day, moonlight by night */}
      <directionalLight
        ref={sun}
        position={[60, 80, -20]}
        color="#fff2dc"
        intensity={0}
      />
      {/* high tier at night: a real night street lights skin, cars and glass */}
      {((tier !== "low" && day.neon > 0.5) ||
        (tier === "ultra" && reflections)) && (
        <Suspense fallback={null}>
          <CityHdri night={day.neon > 0.5} />
        </Suspense>
      )}
      {tier === "ultra" && (
        <Suspense fallback={null}>
          <CityMaterialDetail
            meshes={meshes}
            ground={groundMaterial}
            reflections={reflections}
            night={day.neon > 0.5}
          />
        </Suspense>
      )}
      <CitySky night={day.neon} />
      <hemisphereLight ref={hemi} args={["#8fa6ff", "#2a1038", 1.6]} />
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
        position={[
          (CITY_LAND.x0 + CITY_LAND.x1) / 2,
          -0.01,
          (CITY_LAND.z0 + CITY_LAND.z1) / 2,
        ]}
        onClick={click}
        name="city-ground"
        receiveShadow={shadows}
      >
        {/* the city's land up to the waterline; the Ocean takes over past it
            and the Outskirts' grass around it (a dark plane that ran on to
            the horizon showed as a wall across the Uptown park's skyline) */}
        <planeGeometry
          args={[CITY_LAND.x1 - CITY_LAND.x0, CITY_LAND.z1 - CITY_LAND.z0]}
        />
        <primitive object={groundMaterial} attach="material" />
      </mesh>
      <Outskirts />
      <Ocean />
      <Fishing player={player} spot="boardwalk" />
      {/* the horizon's ships, far twins, riding the swell past the surf */}
      <Suspense fallback={null}>
        <Fleet fleet={CITY_FLEET} waterY={-0.05} night={day.neon} far />
      </Suspense>
      <BeachLife />
      <VolleyCourt spot={BEACH_COURT} prize="volleyball" player={player} />
      <Fireworks />
      <Parade />
      <Heist />
      <Chase />
      <PlayerPursuit player={player} />
      <SquareLife />
      <Parols />
      {KINDS.map((kind) => (
        <primitive key={kind} object={meshes[kind]} onClick={click} />
      ))}
      <Suspense fallback={null}>
        <CityTransit player={player} />
        <StreetFood player={player} />
        <StreetDealer player={player} />
        <TaxiRide player={player} />
        <Traffic player={player} />
        <ParkedCars player={player} />
      </Suspense>
      <PlayerCar player={player} parked={car} onPark={onPark} />
      <GasStations player={player} />
      <Pedestrians player={player} />
      <ChatGroups player={player} />
      <SidewalkTrips player={player} />
      <CarHits player={player} />
      <Suspense fallback={null}>
        <CityTrees autumn={activeDressings.includes("autumn")} />
        <CityFurniture summer={activeDressings.includes("summer")} />
        <CityPark />
        <QueueCrowd />
        <SeasonalDressing active={activeDressings} />
        <BoardwalkFerris />
        <ParkWildlife player={player} />
        <ParkButterflies player={player} />
        <DogPark player={player} />
        <FarmersMarket player={player} />
        <BandShell player={player} />
        <StreetPieces />
        <ElLineBoundary>
          <ElLine />
        </ElLineBoundary>
      </Suspense>
      <Suspense fallback={null}>
        <DreamBuildings />
      </Suspense>
      <AvenueWear />
      <ElRide player={player} />
      <NightMarket player={player} />
    </>
  );
}
