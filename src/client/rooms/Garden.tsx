// Suburbia Community Garden: a fenced lot with 8 raised wooden beds,
// crop models with 4 growth stages (tomatoes, strawberries, sunflowers, peppers, herbs),
// a tool shed, compost bins, water spigot basin, watering can animation,
// and neighbor gardener NPCs with handwritten lines.

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  BOUNDS,
  COMPOST_POS,
  RAISED_BEDS,
  SHED_POS,
  WATER_POS,
  plotGrowth,
  type GardenCropId,
  type GardenPlotState,
} from "../../game/garden.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useGardenState } from "./garden/gardenSession.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { useWorkClip } from "./shared/game3d/workClip.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { GardenDressing } from "./garden/Dressing.tsx";
import { Butterflies } from "../world/Butterflies.tsx";
import { GARDEN_FLOCKS } from "../../game/butterflies.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;

const CLARA_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "overalls",
  outfitColor: "#3fe0d0",
  shadow: "#d23cff",
};

const MATEO_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "textured",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "jeans",
  outfitColor: "#ff2f9a",
  shadow: "#d23cff",
};

/** Cloned static GLTF model with shadows. */
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

/** Crop 3D model for each growth stage (1..4) with subtle wilting droop when dry too long. */
function CropModel({
  crop,
  stage,
  wilted,
  position,
}: {
  crop: GardenCropId | null;
  stage: number;
  wilted: boolean;
  position: [number, number, number];
}) {
  if (!crop || stage <= 0) return null;
  const stageNum = Math.min(4, Math.max(1, stage));
  const modelPath = `/models/garden/${crop}-${stageNum}.glb`;

  const scale =
    crop === "sunflower"
      ? 0.95
      : crop === "tomato"
        ? 0.88
        : crop === "pepper"
          ? 0.82
          : crop === "strawberry"
            ? 0.76
            : 0.84;

  const rot: [number, number, number] = wilted ? [0.35, 0.25, 0.15] : [0, 0, 0];

  return (
    <group position={position} rotation={rot}>
      <ModelInstance path={modelPath} scale={scale} />
    </group>
  );
}

/** Raised wooden beds and soil bedding with planted crop instances. */
function RaisedBedGroup({ plots }: { plots: GardenPlotState[] }) {
  const now = Date.now();

  const bedMesh = useMemo(() => {
    const boxGeo = new THREE.BoxGeometry(3.2, 0.38, 2.2);
    const woodMat = new THREE.MeshStandardMaterial({
      color: "#8a5a36",
      roughness: 0.85,
    });
    const inst = new THREE.InstancedMesh(boxGeo, woodMat, RAISED_BEDS.length);
    const m = new THREE.Matrix4();
    RAISED_BEDS.forEach((b, i) => {
      m.makeTranslation(b.position[0], 0.19, b.position[1]);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    return inst;
  }, []);

  const soilMesh = useMemo(() => {
    const soilGeo = new THREE.BoxGeometry(3.0, 0.4, 2.0);
    const soilMat = new THREE.MeshStandardMaterial({
      color: "#3a2516",
      roughness: 0.95,
    });
    const inst = new THREE.InstancedMesh(soilGeo, soilMat, RAISED_BEDS.length);
    const m = new THREE.Matrix4();
    RAISED_BEDS.forEach((b, i) => {
      m.makeTranslation(b.position[0], 0.2, b.position[1]);
      inst.setMatrixAt(i, m);
    });
    inst.receiveShadow = true;
    return inst;
  }, []);

  useEffect(() => {
    return () => {
      bedMesh.geometry.dispose();
      if (!Array.isArray(bedMesh.material)) bedMesh.material.dispose();
      bedMesh.dispose();
      soilMesh.geometry.dispose();
      if (!Array.isArray(soilMesh.material)) soilMesh.material.dispose();
      soilMesh.dispose();
    };
  }, [bedMesh, soilMesh]);

  return (
    <group>
      <primitive object={bedMesh} />
      <primitive object={soilMesh} />
      {RAISED_BEDS.map((bedDef, i) => {
        const plot = plots[i];
        if (!plot || !plot.crop) return null;
        const growth = plotGrowth(plot, now);
        const [px, pz] = bedDef.position;

        // Spread 4 plant stems across each bed box for full lush look
        const offsets: [number, number][] = [
          [-0.7, -0.4],
          [0.7, -0.4],
          [-0.7, 0.4],
          [0.7, 0.4],
        ];

        return (
          <group key={i}>
            {offsets.map(([dx, dz], idx) => (
              <CropModel
                key={idx}
                crop={plot.crop}
                stage={growth.stage}
                wilted={growth.wilted}
                position={[px + dx, 0.4, pz + dz]}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Active watering can animation with pouring angle and droplets over the watered bed. */
function WateringAction({ plotIndex }: { plotIndex: number | null }) {
  if (plotIndex === null || plotIndex < 0 || plotIndex >= RAISED_BEDS.length) {
    return null;
  }
  const [px, pz] = RAISED_BEDS[plotIndex].position;

  return (
    <group position={[px, 1.1, pz]}>
      {/* Watering can tilted forward */}
      <ModelInstance
        path="/models/garden/watering-can.glb"
        rotation={[0.65, 0.2, 0.35]}
        scale={2}
      />
      {/* Falling water droplets */}
      {[-0.2, 0, 0.2].map((ox, k) => (
        <mesh key={k} position={[ox, -0.35 - k * 0.15, -0.1]}>
          <cylinderGeometry args={[0.015, 0.025, 0.22, 6]} />
          <meshBasicMaterial
            color="#a2d2ff"
            transparent={true}
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Water spigot stand and wooden basin. */
function WaterStation() {
  return (
    <group position={[WATER_POS[0], 0, WATER_POS[1]]}>
      {/* Wood post */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 1.4, 0.2]} />
        <meshStandardMaterial color="#6f4e37" roughness={0.9} />
      </mesh>
      {/* Brass tap */}
      <mesh position={[0, 1.1, 0.16]}>
        <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#ffd166" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Stone basin */}
      <mesh position={[0, 0.15, 0.4]} receiveShadow>
        <boxGeometry args={[0.9, 0.3, 0.7]} />
        <meshStandardMaterial color="#6c757d" roughness={0.8} />
      </mesh>
      {/* Static resting watering can */}
      <ModelInstance
        path="/models/garden/watering-can.glb"
        position={[0.65, 0, 0.2]}
        rotation={[0, -0.4, 0]}
        scale={1.6}
      />
    </group>
  );
}

/** Perimeter trees surrounding the community garden lot. */
function SurroundingTrees() {
  const trees: [number, number, string, number][] = [
    [-21, -12, "commontree-1", 0.7],
    [-21, 0, "commontree-2", 0.65],
    [-21, 12, "commontree-1", 0.75],
    [21, -12, "commontree-2", 0.7],
    [21, 0, "commontree-1", 0.65],
    [21, 12, "commontree-2", 0.72],
    [-10, -17, "commontree-1", 0.68],
    [10, -17, "commontree-2", 0.72],
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
 * The Suburbia Community Garden scene: 8 raised beds, crop growth stages,
 * tool shed, compost bins, watering can animation, and neighbor gardeners.
 */
export function Garden({ onPick }: { onPick: PickHandler }): JSX.Element {
  const { garden, wateringPlot } = useGardenState();

  // planting, watering and harvesting play the farm clips on her doll
  useWorkClip("garden-work");

  return (
    <>
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#cde3f7", 32, 100]} />
      <hemisphereLight args={["#fffbe6", "#3d6b1f", 1.8]} />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.75}
        color="#fff6d6"
      />

      {/* Main garden lawn floor */}
      <Floor
        width={W}
        depth={D}
        center={[0, 0]}
        color="#558b2f"
        texture={{ id: "leafy_grass", scale: 0.25 }}
        low={{ metalness: 0, roughness: 0.9 }}
        mirror={0}
        onPick={onPick}
      />

      {/* Exit portal back to Suburbia street */}
      <PortalPads room={ROOMS.garden} color="#52b788" />

      {/* Paths, picket fence and rose arch, neighbors' beds, borders, greenhouse, bench */}
      <Suspense fallback={null}>
        <GardenDressing plots={garden.plots} />
        <Butterflies flocks={GARDEN_FLOCKS} seed={2} />
      </Suspense>

      {/* 8 Raised vegetable and flower beds */}
      <Suspense fallback={null}>
        <RaisedBedGroup plots={garden.plots} />
      </Suspense>

      {/* Active watering can animation over plot */}
      <Suspense fallback={null}>
        <WateringAction plotIndex={wateringPlot} />
      </Suspense>

      {/* Tool shed */}
      <Suspense fallback={null}>
        <ModelInstance
          path="/models/garden/shed.glb"
          position={[SHED_POS[0], 0, SHED_POS[1]]}
          rotation={[0, Math.PI / 2, 0]}
          scale={2.3}
        />
      </Suspense>

      {/* Compost bins */}
      <Suspense fallback={null}>
        <ModelInstance
          path="/models/garden/compost-bin.glb"
          position={[COMPOST_POS[0] - 1.4, 0, COMPOST_POS[1]]}
          scale={6.5}
        />
        <ModelInstance
          path="/models/garden/compost-bin.glb"
          position={[COMPOST_POS[0] + 1.4, 0, COMPOST_POS[1]]}
          scale={6.5}
        />
      </Suspense>

      {/* Water spigot and trough */}
      <Suspense fallback={null}>
        <WaterStation />
      </Suspense>

      {/* Surrounding nature trees */}
      <Suspense fallback={null}>
        <SurroundingTrees />
      </Suspense>

      {/* Neighbor gardener NPCs with handwritten lines */}
      <TalkingNpc
        name="Clara"
        role="gardener"
        look={CLARA_LOOK}
        mood="pose"
        at={[-8.5, 0, -8]}
        rot={Math.PI / 4}
        seed={17}
        greet={true}
        context={{ venue: "garden" }}
      />
      <TalkingNpc
        name="Mateo"
        role="gardener"
        look={MATEO_LOOK}
        mood="idle"
        at={[8.5, 0, -8]}
        rot={-Math.PI / 4}
        seed={29}
        context={{ venue: "garden" }}
      />
    </>
  );
}
