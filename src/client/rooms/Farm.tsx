// Sunny Acres Farm: an idyllic rural retreat at the city's edge.
// Six crop plots with growth stages (carrot, tomato, corn, wheat),
// red timber barn, grain silo, tractor, scarecrow, farm market stand,
// pasture pens with wandering animated farm animals (cow, horse, alpaca, donkey),
// and perimeter trees and split-rail fencing.

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  BARN_POS,
  BOUNDS,
  FARM_ANIMALS,
  PASTURE_FENCE_SPOTS,
  PLOTS,
  SILO_POS,
  STAND_POS,
  TRACTOR_POS,
  plotGrowth,
  type CropId,
  type PlotState,
} from "../../game/farm.ts";
import { ROOMS } from "../../game/rooms.ts";
import { WanderingCreature } from "../creatures/Wanderer.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useFarmState } from "./farm/farmSession.ts";
import { Scatter } from "./zoo/Scatter.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;

/** One cloned static GLTF model with transform. */
function ModelInstance({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: {
  path: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}) {
  const gltf = useGLTF(path);
  const cloned = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }, [gltf]);

  const s: [number, number, number] =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={rotation}
      scale={s}
    />
  );
}

/** The 3D crop growing on a plot based on its growth stage. */
function CropModel({
  crop,
  stage,
  position,
}: {
  crop: CropId | null;
  stage: number;
  position: [number, number, number];
}) {
  if (!crop || stage <= 0) return null;
  // stage 1..4 map to glb files
  const stageNum = Math.min(4, Math.max(1, stage));
  const modelPath = `/models/farm/${crop}-${stageNum}.glb`;

  // Scale crops to read clearly on the ground
  const scale =
    crop === "corn"
      ? 1.1
      : crop === "wheat"
        ? 1.0
        : crop === "tomato"
          ? 0.9
          : 0.8;

  return (
    <group position={position}>
      <ModelInstance path={modelPath} scale={scale} />
    </group>
  );
}

/** Six farm soil plots with crop models and soil bedding. */
function CropField({ plots }: { plots: PlotState[] }) {
  const now = Date.now();

  return (
    <group>
      {PLOTS.map((plotDef, i) => {
        const plotState = plots[i];
        const growth = plotGrowth(plotState, now);
        const [px, pz] = plotDef.position;

        return (
          <group key={i} position={[px, 0.02, pz]}>
            {/* Dirt row bed */}
            <ModelInstance
              path="/models/farm/dirt-row.glb"
              scale={[3.6, 1, 3.6]}
            />
            {/* Crop foliage */}
            <CropModel
              crop={plotState.crop}
              stage={growth.stage}
              position={[0, 0, 0]}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Tilled furrows across every plot: dark ridges in one instanced draw. */
const FURROWS_PER_PLOT = 5;
function Furrows() {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(3.1, 0.05, 0.13),
      new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 1 }),
      PLOTS.length * FURROWS_PER_PLOT,
    );
    const mat = new THREE.Matrix4();
    PLOTS.forEach((plot, i) => {
      for (let k = 0; k < FURROWS_PER_PLOT; k++) {
        const dz = (k - (FURROWS_PER_PLOT - 1) / 2) * 0.42;
        mat.makeTranslation(plot.position[0], 0.07, plot.position[1] + dz);
        m.setMatrixAt(i * FURROWS_PER_PLOT + k, mat);
      }
    });
    m.frustumCulled = false;
    return m;
  }, []);
  // free the furrows' own geometry and material when the room unloads
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      if (!Array.isArray(mesh.material)) mesh.material.dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/** Pasture fences along the animal pen borders, one instanced draw. */
function PastureFences() {
  return <Scatter url="/models/farm/fence.glb" spots={PASTURE_FENCE_SPOTS} />;
}

/** Perimeter trees and bushes surrounding the farm fields. */
function SurroundingNature() {
  const trees: [number, number, string, number][] = [
    [-22, -18, "commontree-1", 0.72],
    [-15, -18, "commontree-2", 0.64],
    [-8, -18, "commontree-1", 0.68],
    [0, -18, "commontree-2", 0.76],
    [6, -18, "commontree-1", 0.64],
    [22, -18, "commontree-2", 0.72],
    [22, -10, "commontree-1", 0.6],
    [22, 0, "commontree-2", 0.68],
    [22, 10, "commontree-1", 0.64],
    [-22, 0, "commontree-2", 0.64],
    [-22, 18, "commontree-1", 0.68],
    [-14, 18, "commontree-2", 0.6],
    [14, 18, "commontree-1", 0.64],
    [22, 18, "commontree-2", 0.72],
  ];

  return (
    <group>
      {trees.map(([x, z, model, s], i) => (
        <ModelInstance
          key={i}
          path={`/models/nature/${model}.glb`}
          position={[x, 0, z]}
          scale={s}
        />
      ))}
    </group>
  );
}

/**
 * The Sunny Acres Farm room scene: farm loop, animated wanderers,
 * rustic architecture, crop field, and country atmosphere.
 */
export function Farm({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const { farm } = useFarmState();

  return (
    <>
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#cde3f7", 35, 110]} />
      <hemisphereLight args={["#fffbe6", "#4d7c0f", 1.8]} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.8}
        color="#fff6d6"
      />

      {/* Main fertile grass floor */}
      <Floor
        width={W}
        depth={D}
        center={[0, 0]}
        color="#65a30d"
        texture={{ id: "leafy_grass", scale: 0.2 }}
        low={{ metalness: 0, roughness: 0.9 }}
        mirror={0}
        onPick={onPick}
      />

      {/* Exit portal back to the city */}
      <PortalPads room={ROOMS.farm} color="#ffd166" />

      {/* Farm Gate Marquee Sign */}
      <NeonText
        text="SUNNY ACRES"
        color="#ffd166"
        font={MARQUEE}
        width={4.8}
        k={1.2}
        position={[0, 3.4, z1 - 0.5]}
        rotation-y={Math.PI}
      />

      <Suspense fallback={null}>
        {/* Red country barn */}
        <ModelInstance
          path="/models/farm/barn.glb"
          position={[BARN_POS[0], 0, BARN_POS[1]]}
          rotation={[0, 0, 0]}
          scale={1.4}
        />

        {/* Tall grain silo */}
        <ModelInstance
          path="/models/farm/silo.glb"
          position={[SILO_POS[0], 0, SILO_POS[1]]}
          scale={1.0}
        />

        {/* Farm tractor */}
        <ModelInstance
          path="/models/farm/tractor.glb"
          position={[TRACTOR_POS[0], 0, TRACTOR_POS[1]]}
          rotation={[0, -0.4, 0]}
          scale={0.3}
        />

        {/* Scarecrow watching the crops */}
        <ModelInstance
          path="/models/farm/scarecrow.glb"
          position={[0, 0, -1.5]}
          rotation={[0, Math.PI, 0]}
          scale={0.6}
        />

        {/* Fresh produce market stand */}
        <ModelInstance
          path="/models/farm/market-stand.glb"
          position={[STAND_POS[0], 0, STAND_POS[1]]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={4.0}
        />

        {/* Hay bales stacked by the barn and pastures */}
        <ModelInstance
          path="/models/farm/hay-bale.glb"
          position={[-7, 0, -6]}
          rotation={[0, 0.3, 0]}
          scale={5}
        />
        <ModelInstance
          path="/models/farm/hay-bale.glb"
          position={[-6.2, 0, -7.2]}
          rotation={[0, 1.1, 0]}
          scale={5}
        />
        <ModelInstance
          path="/models/farm/hay-bale.glb"
          position={[-6.6, 0.8, -6.6]}
          rotation={[0, 0.7, 0]}
          scale={5}
        />

        {/* Crop plots with real-time growth models */}
        <Furrows />
        <CropField plots={farm.plots} />

        {/* Fences for pastures */}
        <PastureFences />

        {/* Nature trees surrounding the farm borders */}
        <SurroundingNature />

        {/* Wandering farm animals in their pasture pens */}
        {FARM_ANIMALS.map((animal, i) => (
          <WanderingCreature
            key={i}
            kind={animal.kind}
            pen={animal.pen}
            speed={animal.speed}
            phase={animal.phase}
            dir={animal.dir}
            player={player}
          />
        ))}
      </Suspense>
    </>
  );
}
