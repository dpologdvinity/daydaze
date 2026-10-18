import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  APRON,
  GAS_STATIONS,
  islandsOf,
  MART,
  outX,
  SIDEWALK,
  type GasStation,
} from "../../game/city/gasStations.ts";
import { Batch } from "../rooms/shared/batch.ts";
import { canvasTex, hdr } from "../rooms/shared/materials.ts";
import type { Player } from "../world/PlayerController.tsx";
import { surface } from "./worldTexture.ts";

/** Stations past this distance aren't drawn. */
const DRAW_DISTANCE = 180;

const CONCRETE = surface("garage_floor", { scale: 0.25, color: "#b8b4c8" });
const MART_WALL = surface("brushed_concrete", { scale: 0.5, color: "#e8e4f0" });
const STEEL = surface("metal_plate", {
  scale: 1,
  color: "#d8dce8",
  metalness: 0.8,
  roughness: 0.5,
});
const CURB = new THREE.MeshStandardMaterial({
  color: "#f2e94e",
  roughness: 0.7,
});
const PUMP = new THREE.MeshStandardMaterial({
  color: "#f4f4f8",
  roughness: 0.35,
});
const HOSE = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.6,
});
const SCREEN = new THREE.MeshBasicMaterial({
  color: hdr("#7dffb0", 1.6),
  toneMapped: false,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe9b0",
  emissive: "#ffd27a",
  emissiveIntensity: 1.2,
  roughness: 0.1,
});
const UNDERLIGHT = new THREE.MeshBasicMaterial({
  color: hdr("#ffffff", 2.2),
  toneMapped: false,
});
const ICE = new THREE.MeshStandardMaterial({
  color: "#5ab0ff",
  roughness: 0.4,
});

/** The station's name and today's price, painted for its pylon and canopy. */
function signTex(s: GasStation) {
  return canvasTex(512, 128, (ctx) => {
    ctx.fillStyle = "#120a1e";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(s.name, 256, 72);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("REGULAR 3.49  •  PREMIUM 3.99", 256, 108);
  });
}

function martTex() {
  return canvasTex(256, 64, (ctx) => {
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("MINI MART", 128, 46);
  });
}

/** One station's static pieces, merged per material. */
function build(s: GasStation, sign: THREE.Texture, mart: THREE.Material) {
  const batch = new Batch();
  const z0 = s.z0;
  const z1 = s.z1;
  const midZ = (z0 + z1) / 2;
  const lotX = outX(s, SIDEWALK + APRON / 2);
  // the forecourt slab, a hair above the street
  const apronX = outX(s, (SIDEWALK + APRON + MART) / 2);
  batch.add(
    new THREE.BoxGeometry(SIDEWALK + APRON + MART, 0.06, z1 - z0),
    CONCRETE,
    { position: [apronX, 0.02, midZ] },
  );
  // pump islands, two pumps each with a screen and a hose
  for (const island of islandsOf(s)) {
    const zs = island.map((p) => p[1]);
    const iz = (Math.min(...zs) + Math.max(...zs)) / 2;
    batch.add(new THREE.BoxGeometry(1, 0.2, 5), CURB, {
      position: [lotX, 0.12, iz],
    });
    for (const dz of [-1.2, 1.2]) {
      batch.add(new THREE.BoxGeometry(0.7, 1.7, 0.9), PUMP, {
        position: [lotX, 1.07, iz + dz],
      });
      for (const side of [-1, 1]) {
        batch.add(new THREE.PlaneGeometry(0.4, 0.3), SCREEN, {
          position: [lotX + side * 0.36, 1.4, iz + dz],
          rotation: [0, (side * Math.PI) / 2, 0],
        });
        batch.add(new THREE.TorusGeometry(0.22, 0.025, 6, 12, Math.PI), HOSE, {
          position: [lotX + side * 0.38, 0.9, iz + dz],
          rotation: [0, (side * Math.PI) / 2, Math.PI],
        });
      }
    }
  }
  // the canopy: four posts, a slab, a glowing band in the station's color
  // and light panels underneath
  const neon = new THREE.MeshBasicMaterial({
    color: hdr(s.color, 2),
    toneMapped: false,
  });
  for (const dz of [-8, 8])
    for (const dx of [-3, 3])
      batch.add(new THREE.BoxGeometry(0.35, 5, 0.35), STEEL, {
        position: [lotX + dx, 2.5, midZ + dz],
      });
  batch.add(new THREE.BoxGeometry(10, 0.6, 22), STEEL, {
    position: [lotX, 5.3, midZ],
  });
  for (const side of [-1, 1]) {
    batch.add(new THREE.BoxGeometry(10.1, 0.25, 0.05), neon, {
      position: [lotX, 5.3, midZ + side * 11.03],
    });
    batch.add(new THREE.BoxGeometry(0.05, 0.25, 22.1), neon, {
      position: [lotX + side * 5.03, 5.3, midZ],
    });
  }
  for (const dz of [-7, -2.5, 2.5, 7])
    batch.add(new THREE.PlaneGeometry(2.4, 1.2), UNDERLIGHT, {
      position: [lotX, 4.99, midZ + dz],
      rotation: [Math.PI / 2, 0, 0],
    });
  // the mini-mart: walls, a lit shopfront facing the pumps, a sign band
  const martX = outX(s, SIDEWALK + APRON + MART / 2);
  const front = outX(s, SIDEWALK + APRON);
  batch.add(new THREE.BoxGeometry(MART, 3.6, z1 - z0 - 4), MART_WALL, {
    position: [martX, 1.8, midZ],
  });
  batch.add(new THREE.PlaneGeometry(z1 - z0 - 8, 2.2), GLASS, {
    position: [front + s.side * -0.02, 1.4, midZ],
    rotation: [0, (s.side * -Math.PI) / 2, 0],
  });
  batch.add(new THREE.PlaneGeometry(6, 1.2), mart, {
    position: [front + s.side * -0.03, 3.1, midZ],
    rotation: [0, (s.side * -Math.PI) / 2, 0],
  });
  // an ice chest by the door
  batch.add(new THREE.BoxGeometry(0.9, 1, 1.6), ICE, {
    position: [front + s.side * -0.8, 0.55, z0 + 4],
  });
  // the price pylon at the curb, its sign on both faces
  const pylonX = outX(s, SIDEWALK - 1);
  const pylonZ = z1 - 1.5;
  batch.add(new THREE.BoxGeometry(0.4, 6, 0.4), STEEL, {
    position: [pylonX, 3, pylonZ],
  });
  const face = new THREE.MeshBasicMaterial({ map: sign, toneMapped: false });
  for (const side of [-1, 1])
    batch.add(new THREE.PlaneGeometry(4, 1), face, {
      position: [pylonX + side * 0.21, 6.2, pylonZ],
      rotation: [0, (side * Math.PI) / 2, 0],
    });
  batch.add(new THREE.PlaneGeometry(8, 0.55), face, {
    position: [outX(s, SIDEWALK + APRON / 2 - 5.04), 5.3, midZ],
    rotation: [0, (s.side * -Math.PI) / 2, 0],
  });
  return { group: batch.build(), materials: [neon, face] };
}

/** The city's gas stations, each drawn only when you're near it. */
export function GasStations({ player }: { player: Player }) {
  const built = useMemo(() => {
    const martSign = martTex();
    const mart = new THREE.MeshBasicMaterial({
      map: martSign,
      toneMapped: false,
    });
    return {
      martSign,
      mart,
      stations: GAS_STATIONS.map((s) => {
        const sign = signTex(s);
        return { s, sign, ...build(s, sign, mart) };
      }),
    };
  }, []);
  useEffect(
    () => () => {
      built.martSign.dispose();
      built.mart.dispose();
      for (const b of built.stations) {
        b.sign.dispose();
        for (const m of b.materials) m.dispose();
        b.group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
      }
    },
    [built],
  );
  const shown = useRef<boolean[]>([]);
  useFrame(() => {
    built.stations.forEach((b, i) => {
      const near =
        Math.hypot(
          player.pos.x - outX(b.s, 10),
          player.pos.z - (b.s.z0 + b.s.z1) / 2,
        ) < DRAW_DISTANCE;
      if (shown.current[i] !== near) {
        shown.current[i] = near;
        b.group.visible = near;
      }
    });
  });
  return (
    <>
      {built.stations.map((b) => (
        <primitive key={b.s.id} object={b.group} />
      ))}
    </>
  );
}
