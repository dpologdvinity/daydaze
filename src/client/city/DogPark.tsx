// The dog yard in Uptown's park (src/game/city/dogPark.ts): a timber fence
// with a gate, an agility tunnel, ramp and seesaw, a water bowl and a tennis
// ball, with four off-leash dogs (the animated labrador, husky and Shiba
// Inu) romping on the shared simulation (`parkWorld`). Everything is mounted
// only while the player is within range, so the rest of the city never pays
// for it; the low tier draws one dog fewer. Props are instanced downloads
// (Quaternius, Kay Lousberg and Poly Pizza; see docs/assets.md). The canvas
// carries `data-dogs` (dogs drawn) and `data-dog-fetches` for the browser
// tests.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import * as THREE from "three";
import {
  DOG_Y,
  GEAR,
  fenceSpots,
  stepWorld,
  type Dog,
  type GearKind,
} from "../../game/city/dogPark.ts";
import { DOG_PARK } from "../../game/city/park.ts";
import { Creature, type CreaturePose } from "../creatures/Creature.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { dimMeshes } from "./CityFurniture.tsx";
import { useDaylight } from "./daylight.ts";
import { disposeInstanced } from "./dispose.ts";
import { propParts, type PropSpot } from "./instancedProps.ts";
import { parkWorld } from "./parkDesk.ts";

/** The yard exists within this many meters of its fence. */
export const DOG_PARK_RANGE = 70;

const URLS = {
  fence: "/models/farm/fence.glb",
  "agility-tunnel": "/models/park/agility-tunnel.glb",
  "agility-ramp": "/models/park/agility-ramp.glb",
  "agility-seesaw": "/models/park/agility-seesaw.glb",
  "dog-bowl": "/models/park/dog-bowl.glb",
  ball: "/models/park/tennis-ball.glb",
} as const;
const KEYS = Object.keys(URLS) as (keyof typeof URLS)[];
const PATHS = KEYS.map((k) => URLS[k]);

/** Whether (x, z) is close enough to the yard to draw it. */
export const dogParkNear = (x: number, z: number): boolean =>
  Math.hypot(
    Math.max(DOG_PARK.x0 - x, 0, x - DOG_PARK.x1),
    Math.max(DOG_PARK.z0 - z, 0, z - DOG_PARK.z1),
  ) < DOG_PARK_RANGE;

export function DogPark({ player }: { player: Player }): JSX.Element | null {
  const [near, setNear] = useState(false);
  useFrame(() => {
    const now = dogParkNear(player.pos.x, player.pos.z);
    if (now !== near) setNear(now);
  });
  return near ? <Yard /> : null;
}

function Yard(): JSX.Element {
  const low = useQuality() === "low";
  const canvas = useThree((s) => s.gl.domElement);
  const gltfs = useGLTF(PATHS);
  const { neon } = useDaylight();
  const parts = useMemo(() => {
    const by = new Map<keyof typeof URLS, THREE.InstancedMesh[]>();
    const spotOf = (x: number, z: number, yaw: number): PropSpot => ({
      x,
      y: DOG_Y,
      z,
      yaw,
      scale: 1,
    });
    KEYS.forEach((key, i) => {
      const scene = gltfs[i]?.scene;
      if (!scene) return;
      if (key === "fence")
        by.set(
          key,
          propParts(
            scene,
            fenceSpots().map((f) => ({
              x: f.x,
              y: DOG_Y,
              z: f.z,
              yaw: f.yaw,
              scale: [f.scale, 1, 1],
            })),
          ),
        );
      else if (key === "ball") by.set(key, propParts(scene, [spotOf(0, 0, 0)]));
      else
        by.set(
          key,
          propParts(
            scene,
            GEAR.filter((g) => g.kind === (key as GearKind)).map((g) =>
              spotOf(g.x, g.z, g.yaw),
            ),
          ),
        );
    });
    return by;
  }, [gltfs]);
  const all = useMemo(() => [...parts.values()].flat(), [parts]);
  useEffect(() => () => disposeInstanced(all, true), [all]);
  useEffect(() => dimMeshes(all, 1 - 0.55 * neon), [all, neon]);

  // the ball is one instance: its matrix follows the simulation
  const ball = parts.get("ball");
  const frame = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const dogs = low ? parkWorld.dogs.slice(0, 3) : parkWorld.dogs;
  useEffect(() => {
    canvas.dataset.dogs = String(dogs.length);
    return () => {
      delete canvas.dataset.dogs;
      delete canvas.dataset.dogFetches;
    };
  }, [canvas, dogs.length]);
  useFrame((_, dt) => {
    stepWorld(parkWorld, Math.min(dt, 0.1), Math.random);
    const b = parkWorld.ball;
    m.makeTranslation(b.x, DOG_Y + b.y, b.z);
    for (const mesh of ball ?? []) {
      mesh.setMatrixAt(0, m);
      mesh.instanceMatrix.needsUpdate = true;
    }
    frame.current += 1;
    if (frame.current % 20 === 0)
      canvas.dataset.dogFetches = String(parkWorld.fetches);
  });
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {dogs.map((dog, i) => (
        <ParkDog key={i} dog={dog} />
      ))}
    </>
  );
}

/** One resident, posed from its simulation record each frame. */
function ParkDog({ dog }: { dog: Dog }): JSX.Element {
  const drive = (_dt: number, pose: CreaturePose) => {
    pose.x = dog.x;
    pose.y = DOG_Y;
    pose.z = dog.z;
    pose.yaw = dog.yaw;
    pose.clip = dog.clip;
  };
  return <Creature kind={dog.kind} drive={drive} />;
}

useGLTF.preload(PATHS);
