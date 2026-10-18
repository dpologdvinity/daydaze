import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { BOUNDS, STATIONS, stationNear } from "../../game/studio.ts";
import { surface } from "../city/worldTexture.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { pick, studio } from "./studio/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.4;
/** Seconds a played key, bar, pad or drum stays lit. */
const GLOW = 0.35;

const BRICK = surface("brick_wall_02", { scale: 0.6, color: "#c87a6a" });
const LACQUER = new THREE.MeshStandardMaterial({
  color: "#0c0a10",
  roughness: 0.15,
  metalness: 0.3,
});
const ROSEWOOD = surface("wood_veneer", {
  scale: 2,
  color: "#a0503a",
  roughness: 0.5,
});
const CHROME = new THREE.MeshStandardMaterial({
  color: "#e4e4ee",
  metalness: 0.95,
  roughness: 0.15,
});
const DRUM_SHELL = new THREE.MeshStandardMaterial({
  color: "#c8102e",
  metalness: 0.4,
  roughness: 0.25,
});
const RUG = surface("carpet_red", { scale: 0.7, color: "#d08a7a" });

const BANDMATE: Look = {
  skin: "#94603f",
  hairStyle: "braids",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#ffb02e",
};

/** Acoustic foam: wedge rows, shaded. */
function foamTex() {
  return canvasTex(
    128,
    128,
    (ctx) => {
      for (let y = 0; y < 128; y += 16) {
        const g = ctx.createLinearGradient(0, y, 0, y + 16);
        g.addColorStop(0, "#4a3a5a");
        g.addColorStop(1, "#1a1020");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, 128, 16);
      }
    },
    [4, 4],
  );
}

/** The room and the instruments' still parts, merged per material. */
function useShell(foam: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const FOAM = new THREE.MeshStandardMaterial({ map: foam, roughness: 1 });
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), BRICK, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), BRICK, {
        position: [x, H / 2, 0],
      });
    // foam panels on the side walls
    for (const [x, ry] of [
      [x0 + 0.02, Math.PI / 2],
      [x1 - 0.02, -Math.PI / 2],
    ] as const)
      for (const z of [-3, 0, 3])
        b.add(new THREE.PlaneGeometry(2, 1.6), FOAM, {
          position: [x, 2.2, z],
          rotation: [0, ry, 0],
        });
    // the grand piano: body, raised lid on its prop, three legs, bench
    const p = STATIONS.piano;
    const [px, pz] = p.at;
    b.add(new THREE.BoxGeometry(1.5, 0.3, 2.2), LACQUER, {
      position: [px, 0.9, pz],
    });
    b.add(new THREE.BoxGeometry(1.5, 0.03, 2), LACQUER, {
      position: [px + 0.3, 1.45, pz - 0.1],
      rotation: [0, 0, 0.6],
    });
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), GOLD, {
      position: [px - 0.3, 1.25, pz - 0.1],
    });
    for (const [lx, lz] of [
      [-0.6, 0.9],
      [0.6, 0.9],
      [0, -0.9],
    ] as const)
      b.add(new THREE.CylinderGeometry(0.06, 0.05, 0.75, 8), LACQUER, {
        position: [px + lx, 0.375, pz + lz],
      });
    b.add(new THREE.BoxGeometry(1, 0.08, 0.4), LACQUER, {
      position: [px, 0.5, pz + 1.55],
    });
    // the drum kit: kick, snare and toms on chrome, two cymbals
    const d = STATIONS.drums;
    const [dx, dz] = d.at;
    b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20), DRUM_SHELL, {
      position: [dx, 0.4, dz - 0.3],
      rotation: [Math.PI / 2, 0, 0],
    });
    for (const [tx, ty, tz, r] of [
      [-0.5, 0.65, 0.2, 0.22],
      [0.3, 0.85, -0.25, 0.17],
      [-0.2, 0.85, -0.3, 0.17],
      [0.6, 0.55, 0.2, 0.25],
    ] as const) {
      b.add(new THREE.CylinderGeometry(r, r, 0.2, 18), DRUM_SHELL, {
        position: [dx + tx, ty, dz + tz],
      });
      b.add(new THREE.CylinderGeometry(0.012, 0.012, ty, 6), CHROME, {
        position: [dx + tx, ty / 2, dz + tz],
      });
    }
    for (const [cx, cy, cz] of [
      [-0.85, 1.2, -0.3],
      [0.9, 1.3, -0.4],
    ] as const) {
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.01, 20), GOLD, {
        position: [dx + cx, cy, dz + cz],
        rotation: [0.2, 0, 0],
      });
      b.add(new THREE.CylinderGeometry(0.012, 0.012, cy, 6), CHROME, {
        position: [dx + cx, cy / 2, dz + cz],
      });
    }
    // the marimba's frame and resonator tubes (its bars light up apart)
    const m = STATIONS.marimba;
    const [mx, mz] = m.at;
    b.add(new THREE.BoxGeometry(2.4, 0.08, 0.7), ROSEWOOD, {
      position: [mx, 0.78, mz],
    });
    for (let i = 0; i < 8; i++)
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.5 - i * 0.04, 8), CHROME, {
        position: [mx - 1.05 + i * 0.3, 0.5 + i * 0.02, mz],
      });
    for (const lx of [-1.1, 1.1])
      b.add(new THREE.BoxGeometry(0.06, 0.78, 0.6), ROSEWOOD, {
        position: [mx + lx, 0.39, mz],
      });
    // a rug under the drums, amps by the wall
    b.add(new THREE.BoxGeometry(3, 0.02, 2.4), RUG, {
      position: [dx, 0.01, dz],
    });
    for (const ax of [6.6, 7.4])
      b.add(new THREE.BoxGeometry(0.7, 1.1, 0.4), LACQUER, {
        position: [ax, 0.55, z0 + 0.5],
      });
    return b.build();
  }, [foam]);
}

const scratch = new THREE.Color();
const KEY_LIT = hdr("#ffd84f", 2);
const BAR_LIT = hdr("#ffb02e", 2);
const HEAD_LIT = hdr("#ffffff", 2);
const keyColor = (i: number, on: boolean) =>
  on ? scratch.copy(KEY_LIT) : scratch.set(i % 3 === 1 ? "#1a1a1a" : "#f8f4ea");
const barColor = (_: number, on: boolean) =>
  on ? scratch.copy(BAR_LIT) : scratch.set("#8a4a2a");
const padColor = (i: number, on: boolean) =>
  scratch.setHSL(i / 8, 0.9, on ? 0.7 : 0.25).multiplyScalar(on ? 2.5 : 1);
const headColor = (_: number, on: boolean) =>
  on ? scratch.copy(HEAD_LIT) : scratch.set("#e8e4dc");

/** Colors one instrument's eight parts, lighting the note just played. */
function tint(
  mesh: THREE.InstancedMesh | null,
  station: string,
  last: { station: string; note: number; at: number } | null,
  now: number,
  color: (i: number, on: boolean) => THREE.Color,
) {
  if (!mesh) return;
  for (let i = 0; i < 8; i++) {
    const on =
      last !== null &&
      last.station === station &&
      last.note === i &&
      now - last.at < GLOW * 1000;
    mesh.setColorAt(i, color(i, on));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** The parts that light when played: piano keys, marimba bars, floor pads
 * and drum heads, one instanced mesh each, eight notes per instrument. */
function Playable() {
  const keys = useRef<THREE.InstancedMesh>(null);
  const bars = useRef<THREE.InstancedMesh>(null);
  const pads = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({
      key: new THREE.BoxGeometry(0.16, 0.05, 0.45),
      bar: new THREE.BoxGeometry(0.24, 0.05, 1),
      pad: new THREE.BoxGeometry(0.56, 0.04, 1.3),
      head: new THREE.CylinderGeometry(1, 1, 0.02, 18),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      key: new THREE.MeshBasicMaterial({ toneMapped: false }),
      bar: new THREE.MeshStandardMaterial({ roughness: 0.4 }),
      pad: new THREE.MeshBasicMaterial({ toneMapped: false }),
      head: new THREE.MeshBasicMaterial({ toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [geo, mats],
  );
  // where each note's part sits
  const parts = useMemo(() => {
    const m = new THREE.Matrix4();
    const [px, pz] = STATIONS.piano.at;
    const [mx, mz] = STATIONS.marimba.at;
    const [fx, fz] = STATIONS.floor_piano.at;
    const [dx, dz] = STATIONS.drums.at;
    const drumHeads: [number, number, number, number][] = [
      [0, 0.4, -0.04, 0.38],
      [-0.5, 0.76, 0.2, 0.21],
      [0.3, 0.96, -0.25, 0.16],
      [-0.2, 0.96, -0.3, 0.16],
      [0.6, 0.66, 0.2, 0.24],
      [-0.85, 1.21, -0.3, 0.3],
      [0.9, 1.31, -0.4, 0.3],
      [0.6, 0.67, 0.2, 0.1],
    ];
    return {
      keys: Array.from({ length: 8 }, (_, i) =>
        m.makeTranslation(px - 0.6 + i * 0.17, 1.07, pz + 1.0).clone(),
      ),
      bars: Array.from({ length: 8 }, (_, i) =>
        m
          .makeTranslation(mx - 1.05 + i * 0.3, 0.85, mz)
          .scale(new THREE.Vector3(1, 1, 1 - i * 0.06))
          .clone(),
      ),
      pads: Array.from({ length: 8 }, (_, i) =>
        m.makeTranslation(fx - 2.1 + i * 0.6, 0.02, fz).clone(),
      ),
      heads: drumHeads.map(([hx, hy, hz, r]) =>
        m
          .makeTranslation(dx + hx, hy, dz + hz)
          .scale(new THREE.Vector3(r, 1, r))
          .clone(),
      ),
    };
  }, []);
  useFrame(() => {
    const { last } = studio.get();
    const now = performance.now();
    tint(keys.current, "piano", last, now, keyColor);
    tint(bars.current, "marimba", last, now, barColor);
    tint(pads.current, "floor_piano", last, now, padColor);
    tint(heads.current, "drums", last, now, headColor);
  });
  useEffect(() => {
    for (const [mesh, list] of [
      [keys.current, parts.keys],
      [bars.current, parts.bars],
      [pads.current, parts.pads],
      [heads.current, parts.heads],
    ] as const) {
      if (!mesh) continue;
      list.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [parts]);
  return (
    <>
      <instancedMesh ref={keys} args={[geo.key, mats.key, 8]} />
      <instancedMesh ref={bars} args={[geo.bar, mats.bar, 8]} />
      <instancedMesh ref={pads} args={[geo.pad, mats.pad, 8]} />
      <instancedMesh ref={heads} args={[geo.head, mats.head, 8]} />
    </>
  );
}

/**
 * Loft Studios on Gallery Row: exposed brick and foam panels, a grand
 * piano with its lid up, a red drum kit on a rug, a marimba and a light-up
 * floor piano. Walk up to one and play it from the panel or keys 1 to 8.
 */
export function Studio({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const calm = useReducedMotion();
  const foam = useMemo(foamTex, []);
  useEffect(() => () => foam.dispose(), [foam]);
  const shell = useShell(foam);
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    // walk up to an instrument and it's the one you play
    const near = stationNear([player.pos.x, player.pos.z]);
    if (near) pick(near);
    if (lamp.current && !calm)
      lamp.current.intensity = 6 + Math.sin(clock.elapsedTime * 0.7) * 0.8;
  });
  return (
    <>
      <color attach="background" args={["#140a14"]} />
      <hemisphereLight args={["#ffe8d0", "#3a1a2a", 1.3]} />
      <pointLight
        ref={lamp}
        position={[0, 3.8, -1]}
        color="#ffd8a0"
        intensity={6}
        distance={16}
      />
      <Floor
        width={W}
        depth={D}
        color="#c89a7a"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["music-studio"]} color="#ffe066" />
      <primitive object={shell} />
      <Playable />
      <NeonText
        text="LOFT STUDIOS"
        color="#ffe066"
        font={MARQUEE}
        width={4.6}
        k={3}
        position={[0, 3.5, z0 + 0.05]}
      />
      <NeonText
        text="on air"
        color="#ff2f4a"
        font={SCRIPT}
        width={1.4}
        k={3}
        position={[5.2, 2.6, z0 + 0.05]}
        flicker
      />
      <group
        position={[STATIONS.drums.at[0] + 1.7, 0, STATIONS.drums.at[1] + 0.6]}
        rotation-y={-0.8}
      >
        <CrowdFigure look={BANDMATE} move="clap" seed={441} />
      </group>
    </>
  );
}
