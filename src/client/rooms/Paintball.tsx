import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { BUNKERS, PAINT_ARENA } from "../../game/paintball.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import type { Player } from "../world/PlayerController.tsx";
import { Beams, Rivals } from "./LaserTag.tsx";
import { paintball } from "./lasertag/session.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const { x0, x1, z0, z1 } = PAINT_ARENA;
const W = x1 - x0;
const D = z1 - z0;
const H = 6;

const WALL = surface("corrugated_iron", { scale: 0.5, color: "#7a8a9a" });
const NET = new THREE.MeshStandardMaterial({
  color: "#141018",
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide,
});
const BUNKERS_MATS = ["#e63946", "#2e7dff", "#ffd84f", "#2fbf71"].map(
  (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }),
);

/** Old splats all over: paint on the walls, the floor and the bunkers. */
function splatTex(base: string) {
  return canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);
      const colors = ["#e63946", "#2e7dff", "#ffd84f", "#ff4fb3", "#2fbf71"];
      for (let i = 0; i < 26; i++) {
        const x = (i * 83) % 256;
        const y = (i * 47) % 256;
        const r = 6 + ((i * 13) % 14);
        ctx.fillStyle = colors[i % colors.length] ?? "#e63946";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + i;
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(a) * r * 1.5,
            y + Math.sin(a) * r * 1.5,
            r * 0.25,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    },
    [2, 2],
  );
}

function useShell(splats: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const PAINTED = new THREE.MeshStandardMaterial({
      map: splats,
      roughness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // splats over the back wall, and the safety net across the near end
    b.add(new THREE.PlaneGeometry(W, 3), PAINTED, {
      position: [0, 1.6, z0 + 0.01],
    });
    b.add(new THREE.PlaneGeometry(W, 3), NET, {
      position: [0, 1.5, z1 - 0.6],
    });
    // inflatable bunkers: snakes are long rounded tubes, cans are drums,
    // temples are squat pyramids
    BUNKERS.forEach((c, i) => {
      const w = c.x1 - c.x0;
      const d = c.z1 - c.z0;
      const cx = (c.x0 + c.x1) / 2;
      const cz = (c.z0 + c.z1) / 2;
      const mat = BUNKERS_MATS[i % BUNKERS_MATS.length];
      if (!mat) return;
      if (c.shape === "snake") {
        b.add(new THREE.CapsuleGeometry(0.42, w - 0.84, 6, 12), mat, {
          position: [cx, 0.42, cz],
          rotation: [0, 0, Math.PI / 2],
          scale: [1, 1, d / 0.84],
        });
      } else if (c.shape === "can") {
        b.add(new THREE.CylinderGeometry(w / 2, w / 2, 1.6, 20), mat, {
          position: [cx, 0.8, cz],
        });
      } else {
        b.add(new THREE.ConeGeometry(w * 0.7, 1.7, 4), mat, {
          position: [cx, 0.85, cz],
          rotation: [0, Math.PI / 4, 0],
        });
      }
    });
    // flood lights along the top of the side walls
    const lamp = new THREE.MeshBasicMaterial({
      color: hdr("#fff4e0", 2),
      toneMapped: false,
    });
    for (let z = z0 + 2; z < z1; z += 4)
      for (const x of [x0 + 0.4, x1 - 0.4])
        b.add(new THREE.BoxGeometry(0.3, 0.2, 0.6), lamp, {
          position: [x, H - 0.6, z],
        });
    return b.build();
  }, [splats]);
}

/**
 * Splat City, indoor speedball in the old pawn shop on the avenue: a field
 * of inflatable snakes, cans and temples under flood lights, corrugated walls
 * and old paint everywhere. Gear up from the panel; five rivals lean out of
 * their bunkers to shoot.
 */
export function Paintball({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const splats = useMemo(() => splatTex("#9a9488"), []);
  useEffect(() => () => splats.dispose(), [splats]);
  const shell = useShell(splats);
  useEffect(() => () => paintball.leave(), []);
  useFrame((_, dt) => {
    paintball.you.at = [player.pos.x, player.pos.z];
    paintball.tick(Math.min(dt, 0.5));
  });
  return (
    <>
      <color attach="background" args={["#1a1820"]} />
      <hemisphereLight args={["#fff4e0", "#3a3a4a", 1.5]} />
      <pointLight
        position={[0, 5, 0]}
        color="#fff4e0"
        intensity={9}
        distance={24}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#5aa86a"
        texture={{ id: "sparse_grass", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.95 }}
        mirror={0}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.paintball} color="#ff8a3d" />
      <primitive object={shell} />
      <Rivals game={paintball} seed={431} />
      <Beams game={paintball} player={player} />
      <NeonText
        text="SPLAT CITY"
        color="#ff8a3d"
        font={MARQUEE}
        width={5}
        k={3}
        position={[0, 4.4, z0 + 0.05]}
      />
    </>
  );
}
