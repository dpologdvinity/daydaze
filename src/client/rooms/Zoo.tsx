// The Daydaze Zoo: six fenced habitats of animated animals (src/client/
// creatures/): the zebra, alpacas, donkey and cow have skeletons and clips; the
// giraffes, elephants, lions, penguins and flamingos are downloaded static
// models the Creature component sways and bobs (docs/assets.md). Every animal
// registers where it stands with the safari photo hunt (zoo/session.ts);
// SafariTracker feeds the player's view to it each frame.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { ROOMS } from "../../game/rooms.ts";
import {
  BOUNDS,
  FARM_ANIMALS,
  FENCE_SPOTS,
  FLAMINGOS,
  ROCK_SPOTS,
  TREE_SPOTS,
  flamingoAt,
  HABITATS,
  farmVoicesAt,
  PENGUINS,
  WALKERS,
  type Habitat,
  type Species,
  type Rect,
} from "../../game/zoo.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { tick, zooAnimals, zooView } from "./zoo/session.ts";
import type { Vec2 } from "../../game/walk.ts";
import type { LandKind } from "../../game/creatures.ts";
import { playSoundFile } from "../../audio/soundFiles.ts";
import { nextDelay, pickCall } from "../../game/zooSounds.ts";
import { Creature } from "../creatures/Creature.tsx";
import { Scatter } from "./zoo/Scatter.tsx";
import { WanderingCreature } from "../creatures/Wanderer.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;

/** The petting farm's animated animals, each wandering its own loop. */
function Farm({ player }: { player: Player }) {
  const pens = useMemo(
    () =>
      FARM_ANIMALS.map((a) => {
        const h = HABITATS.farm;
        return {
          x0: h.x0 + a.inset,
          z0: h.z0 + a.inset,
          x1: h.x1 - a.inset,
          z1: h.z1 - a.inset,
        };
      }),
    [],
  );
  return (
    <>
      {FARM_ANIMALS.map((a, i) => (
        <WanderingCreature
          key={i}
          kind={a.kind}
          pen={pens[i] ?? HABITATS.farm}
          speed={a.speed}
          phase={a.phase}
          dir={a.dir}
          player={player}
        />
      ))}
    </>
  );
}

/** Registers an animal with the photo hunt and keeps its spot current. */
function useTracked(kind: Species, at: Vec2 = [0, 0]) {
  const entry = useMemo(() => ({ kind, at }), [kind, at]);
  useEffect(() => {
    zooAnimals.add(entry);
    return () => void zooAnimals.delete(entry);
  }, [entry]);
  return entry;
}

/** One zoo animal wandering its habitat's loop. */
function Walker({
  kind,
  home,
  speed,
  phase,
  player,
}: {
  kind: Species & LandKind;
  home: Habitat;
  speed: number;
  phase: number;
  player: Player;
}) {
  const track = useTracked(kind);
  return (
    <WanderingCreature
      kind={kind}
      pen={HABITATS[home]}
      speed={speed}
      phase={phase}
      player={player}
      track={track}
    />
  );
}

/** A flamingo standing in its spot in the pond, now and then dipping to feed. */
function Flamingo({ i }: { i: number }) {
  const spot = useMemo(() => flamingoAt(i), [i]);
  useTracked("flamingo", spot);
  const t = useRef(i * 1.7);
  return (
    <Creature
      kind="flamingo"
      drive={(dt, pose) => {
        t.current += dt;
        pose.x = spot[0];
        pose.z = spot[1];
        pose.yaw = i * 1.1;
        pose.clip = Math.sin(t.current * 0.6) > 0.6 ? "graze" : "idle";
      }}
    />
  );
}

/** Every animal of the big habitats: giraffes and zebras, elephants, lions,
 * penguins round their pool and flamingos in the pond. */
function Animals({ player }: { player: Player }) {
  return (
    <>
      {WALKERS.map((w, i) => (
        <Walker key={i} {...w} player={player} />
      ))}
      {Array.from({ length: PENGUINS }, (_, i) => (
        <Walker
          key={`p${i}`}
          kind="penguin"
          home="penguins"
          speed={0.5}
          phase={(i / PENGUINS) * Math.PI * 2}
          player={player}
        />
      ))}
      {Array.from({ length: FLAMINGOS }, (_, i) => (
        <Flamingo key={`f${i}`} i={i} />
      ))}
    </>
  );
}

const SAND = surface("park_sand", { scale: 0.4, color: "#e8c890" });
const ROCK = surface("rock_face", { scale: 0.5, color: "#a09080" });
const WATER = new THREE.MeshStandardMaterial({
  color: "#3a9ac8",
  emissive: "#0a4a6a",
  emissiveIntensity: 0.4,
  roughness: 0.1,
  metalness: 0.2,
});
const GRASS = new THREE.MeshStandardMaterial({
  color: "#6aa84f",
  roughness: 0.95,
});

const SIGN_NAMES: Record<Habitat, string> = {
  savanna: "SAVANNA",
  elephants: "ELEPHANTS",
  lions: "PRIDE ROCK",
  penguins: "PENGUIN POOL",
  flamingos: "FLAMINGO POND",
  farm: "PETTING FARM",
};

/** A painted board for each habitat. */
function signTex() {
  const names = Object.values(SIGN_NAMES);
  return canvasTex(512, 64 * names.length, (ctx) => {
    names.forEach((n, i) => {
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(0, i * 64, 512, 64);
      ctx.fillStyle = "#fff4d6";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n, 256, i * 64 + 46);
    });
  });
}

/** Habitat grounds, water, rocks, fences, trees and signs. */
function useGrounds(signs: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const names = Object.keys(SIGN_NAMES);
    const board = new THREE.MeshBasicMaterial({ map: signs });
    const rect = (h: Rect, y: number, mat: THREE.Material) =>
      b.add(new THREE.BoxGeometry(h.x1 - h.x0, 0.04, h.z1 - h.z0), mat, {
        position: [(h.x0 + h.x1) / 2, y, (h.z0 + h.z1) / 2],
      });
    rect(HABITATS.savanna, 0.02, SAND);
    rect(HABITATS.lions, 0.02, SAND);
    rect(HABITATS.elephants, 0.02, SAND);
    rect(HABITATS.penguins, 0.02, ROCK);
    rect(HABITATS.flamingos, 0.03, WATER);
    rect(HABITATS.farm, 0.02, GRASS);
    // the penguins' pool, inset in its rocks
    const pp = HABITATS.penguins;
    rect(
      { x0: pp.x0 + 3, z0: pp.z0 + 3, x1: pp.x1 - 3, z1: pp.z1 - 3 },
      0.05,
      WATER,
    );
    // each habitat's sign (the fences are downloaded panels, see Props)
    for (const [id, h] of Object.entries(HABITATS)) {
      // the habitat's sign, on the path side
      const i = names.indexOf(id);
      const g = new THREE.PlaneGeometry(2.4, 0.3);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++)
        uv.setY(k, 1 - (i + 1 - uv.getY(k)) / names.length);
      const front = h.z1 < 0 ? h.z1 + 0.08 : h.z0 - 0.08;
      b.add(g, board, {
        position: [(h.x0 + h.x1) / 2, 1.35, front],
        rotation: [0, h.z1 < 0 ? 0 : Math.PI, 0],
      });
    }
    return b.build();
  }, [signs]);
}

/**
 * The Daydaze Zoo on Park Avenue: paved paths past six fenced habitats:
 * giraffes and zebras on the savanna, elephants, lions on their rocks,
 * penguins round a pool, flamingos in a pond (all procedurally built) and a
 * petting farm of animated alpacas, a donkey and a cow.
 */
/** Now and then one of the animals calls, as loud as it is near. */
function AnimalCalls({ player }: { player: Player }) {
  const wait = useRef(nextDelay(0.3));
  useFrame((_, dt) => {
    wait.current -= Math.min(dt, 0.1);
    if (wait.current > 0) return;
    wait.current = nextDelay(Math.random());
    const call = pickCall(
      [player.pos.x, player.pos.z],
      [...zooAnimals, ...farmVoicesAt(performance.now() / 1000)],
      Math.random(),
    );
    if (call) void playSoundFile(call.id, call.gain);
  });
  return null;
}

/** Tells the photo hunt the animals' clock and where the player faces. */
function SafariTracker({ player }: { player: Player }) {
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    zooView.t = calm ? 0 : clock.elapsedTime;
    zooView.from[0] = player.pos.x;
    zooView.from[1] = player.pos.z;
    zooView.yaw = player.yaw;
    tick(performance.now());
  });
  return null;
}

/**
 * The Zoo scene. `player` is read every frame so the safari photo hunt knows
 * where the player stands and faces.
 */
export function Zoo({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const signs = useMemo(signTex, []);
  const grounds = useGrounds(signs);
  return (
    <>
      <color attach="background" args={["#8ec8ff"]} />
      <fog attach="fog" args={["#bfe0ff", 30, 90]} />
      <hemisphereLight args={["#fff8e8", "#5a7a4a", 1.8]} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.6}
        color="#fff4e0"
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#e8e0d0"
        texture={{ id: "patterned_paving", scale: 0.3 }}
        low={{ metalness: 0, roughness: 0.9 }}
        mirror={0}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.zoo} color="#7dff6b" />
      <primitive object={grounds} />
      <Scatter
        url="/models/zoo/fence_planks.glb"
        spots={FENCE_SPOTS}
        color="#7a5232"
      />
      <Scatter
        url="/models/zoo/rock_tallA.glb"
        spots={ROCK_SPOTS.tall}
        color="#9a9288"
      />
      <Scatter
        url="/models/zoo/rock_largeB.glb"
        spots={ROCK_SPOTS.large}
        color="#8c867e"
      />
      <Scatter url="/models/nature/commontree-2.glb" spots={TREE_SPOTS} />
      <Animals player={player} />
      <Farm player={player} />
      <SafariTracker player={player} />
      <AnimalCalls player={player} />
      <NeonText
        text="DAYDAZE ZOO"
        color="#2d6a4f"
        font={MARQUEE}
        width={4.4}
        k={1.2}
        position={[0, 3.2, z1 - 0.2]}
        rotation-y={Math.PI}
      />
    </>
  );
}
