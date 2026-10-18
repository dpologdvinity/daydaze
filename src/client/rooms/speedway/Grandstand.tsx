import { useMemo } from "react";
import * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { useCanvasTexture } from "./canvasTextures.ts";
import { Floodlights } from "./Floodlights.tsx";
import { NEON } from "./neon.ts";
import { bannerPaint, scoreboardPaint } from "./speedwayArt.ts";
import type { Box } from "./strips.ts";

/** The stand faces the pit apron from behind it, between the pit and the track. */
export const GRANDSTAND_ORIGIN: Vec2 = [0, -23];

const SHADOW = new THREE.Color("#241d40");
const STEEL = new THREE.Color("#3b3560");
const DARK = new THREE.Color("#15122b");
const DEEP = new THREE.Color("#0d0a1c");
const SKIN = new THREE.Color("#e6b48e");
const ROWS = 6;
const SEATS = 12;
const SEAT_GAP = 3.8;
const FANS = [
  new THREE.Color("#ff4fb3"),
  new THREE.Color("#4fe3ff"),
  new THREE.Color("#ffd84f"),
  new THREE.Color("#b06bff"),
];
// hung from the canopy edge, in front of the top rows
const BANNERS: readonly { label: string; color: string; x: number }[] = [
  { label: "NEON OVAL", color: "#ff4fb3", x: -14 },
  { label: "PIT LANE", color: "#4fe3ff", x: 0 },
  { label: "FAST LANE", color: "#ffd84f", x: 14 },
];

/** Gives each box without its own color the given one. */
function tint(boxes: readonly Box[], color: THREE.Color): Box[] {
  return boxes.map((b) => ({ ...b, color: b.color ?? color }));
}

/** One banner, hung from the canopy edge on its own texture. */
function Banner({ x, label, color }: (typeof BANNERS)[number]) {
  const texture = useCanvasTexture(
    `banner:${label}:${color}`,
    256,
    80,
    bannerPaint(label, color),
  );
  return (
    <mesh position={[x, 4.95, 1.28]}>
      <planeGeometry args={[4.2, 1.3]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** A tiered grandstand with a packed crowd, steel rails, neon, banners and a scoreboard. */
export function Grandstand() {
  const scoreboard = useCanvasTexture("scoreboard", 512, 128, scoreboardPaint);
  const parts = useMemo(() => {
    const seats: Box[] = [];
    const bodies: Box[] = [];
    const heads: Box[] = [];
    const rails: Box[] = [];
    for (let row = 0; row < ROWS; row++) {
      const y = row * 0.9;
      const z = -row * 1.1;
      for (let k = 0; k < SEATS; k++) {
        const x = -21 + k * SEAT_GAP;
        seats.push({
          x,
          y,
          z,
          yaw: 0,
          length: 3.4,
          height: 0.9,
          depth: 1,
          color: SHADOW,
        });
        // most seats hold a fan in color; a few are empty and stay in shadow
        if ((row * 5 + k) % 6 === 5) continue;
        const color = FANS[(row * 3 + k) % FANS.length];
        const seat: Box = { x, y, z, yaw: 0, length: 1, height: 1, depth: 1 };
        bodies.push({
          ...seat,
          y: y + 0.9,
          z: z + 0.1,
          length: 1.1,
          height: 0.75,
          depth: 0.7,
          color: color,
        });
        // every fourth fan has an arm up
        if ((row + k) % 4 === 0) {
          bodies.push({
            ...seat,
            x: x + 0.7,
            y: y + 1.3,
            z: z + 0.1,
            length: 0.22,
            height: 0.8,
            depth: 0.22,
            color: color,
          });
        }
        heads.push({
          ...seat,
          y: y + 1.7,
          z: z + 0.1,
          length: 0.42,
          height: 0.42,
          depth: 0.42,
          color: SKIN,
        });
      }
      // a steel rail at the front of every tier, with posts every meter
      rails.push({
        x: 0,
        y: y + 0.9,
        z: z + 0.55,
        yaw: 0,
        length: 46,
        height: 0.05,
        depth: 0.08,
        color: STEEL,
      });
      for (let x = -23; x <= 23; x += 2) {
        rails.push({
          x,
          y: y + 0.9,
          z: z + 0.55,
          yaw: 0,
          length: 0.06,
          height: 0.5,
          depth: 0.06,
          color: STEEL,
        });
      }
    }
    const neonRails: Box[] = [];
    for (let row = 0; row < ROWS; row++) {
      neonRails.push({
        x: 0,
        y: row * 0.9 + 0.9,
        z: -row * 1.1 + 0.55,
        yaw: 0,
        length: 46,
        height: 0.08,
        depth: 0.12,
        color: row % 2 ? NEON.gold : NEON.pink,
      });
    }
    const roof: Box[] = [
      {
        x: 0,
        y: 5.6,
        z: -2.2,
        yaw: 0,
        length: 46,
        height: 0.5,
        depth: 7,
        color: undefined,
      },
    ];
    // the fascia under the canopy edge, lit cyan
    const canopyEdge: Box[] = [
      {
        x: 0,
        y: 6.15,
        z: 1.1,
        yaw: 0,
        length: 46,
        height: 0.14,
        depth: 0.2,
        color: NEON.cyan,
      },
    ];
    // a dark soffit under the roof, so the underside is not blank
    const soffit: Box[] = [
      {
        x: 0,
        y: 5.5,
        z: -2.2,
        yaw: 0,
        length: 46,
        height: 0.05,
        depth: 6.6,
        color: undefined,
      },
    ];
    const posts: Box[] = [-23, 23].map((x) => ({
      x,
      y: 0,
      z: -2,
      yaw: 0,
      length: 0.5,
      height: 5.6,
      depth: 0.5,
    }));
    // the scoreboard hangs off the canopy, facing the pit
    const board: Box[] = [
      {
        x: 0,
        y: 6.3,
        z: 1.0,
        yaw: 0,
        length: 7.6,
        height: 2.2,
        depth: 0.3,
        color: undefined,
      },
    ];
    const bannerHangers: Box[] = BANNERS.map((b) => ({
      x: b.x,
      y: 5.5,
      z: 1.2,
      yaw: 0,
      length: 0.06,
      height: 0.15,
      depth: 0.06,
      color: NEON.white,
    }));
    // solid boxes share one draw call, so each one carries its color
    const solid = [
      ...seats,
      ...bodies,
      ...rails,
      ...tint(roof, DARK),
      ...tint(soffit, DEEP),
      ...tint(posts, DARK),
      ...tint(board, DARK),
    ];
    const glow = [...neonRails, ...canopyEdge, ...bannerHangers];
    return { solid, heads, glow };
  }, []);
  return (
    <>
      <group position={[GRANDSTAND_ORIGIN[0], 0, GRANDSTAND_ORIGIN[1]]}>
        <Boxes boxes={parts.solid} />
        <Boxes boxes={parts.heads} ball />
        <Boxes boxes={parts.glow} glow />
        <mesh position={[0, 7.4, 1.16]}>
          <planeGeometry args={[7.2, 1.9]} />
          <meshBasicMaterial map={scoreboard} toneMapped={false} />
        </mesh>
        {BANNERS.map((b) => (
          <Banner key={b.label} {...b} />
        ))}
      </group>
      <Floodlights />
    </>
  );
}
