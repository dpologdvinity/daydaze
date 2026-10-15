import { useMemo } from "react";
import * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { NEON } from "./neon.ts";
import type { Box } from "./strips.ts";

/** The stand faces the pit apron from behind it, between the pit and the track. */
export const GRANDSTAND_ORIGIN: Vec2 = [0, -23];

const SHADOW = new THREE.Color("#241d40");
const SKIN = new THREE.Color("#e6b48e");
const ROWS = 5;
const SEATS = 11;
const FANS = [
  new THREE.Color("#ff4fb3"),
  new THREE.Color("#4fe3ff"),
  new THREE.Color("#ffd84f"),
  new THREE.Color("#b06bff"),
];

/** A tiered grandstand with neon rails and a lit canopy. */
export function Grandstand() {
  const parts = useMemo(() => {
    const seats: Box[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let k = 0; k < SEATS; k++) {
        // one seat in three is a fan in colour; the rest sit in shadow
        const fan = (row * 3 + k) % 3 === 0;
        seats.push({
          x: -20 + k * 4,
          y: row * 0.9,
          z: -row * 1.1,
          yaw: 0,
          length: 3.4,
          height: 0.9,
          depth: 1,
          color: fan ? FANS[(row + k) % FANS.length] : SHADOW,
        });
      }
    }
    // fans on every third seat: a torso on the seat, a head on top
    const torsos: Box[] = [];
    const heads: Box[] = [];
    seats.forEach((seat, n) => {
      if (n % 3 !== 0) return;
      torsos.push({
        ...seat,
        length: 1.1,
        height: 0.7,
        depth: 0.7,
        color: seat.color,
      });
      heads.push({
        ...seat,
        y: seat.y + 0.7,
        length: 0.4,
        height: 0.4,
        depth: 0.4,
        color: SKIN,
      });
    });
    const rails: Box[] = [];
    for (let row = 0; row < ROWS; row++) {
      rails.push({
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
    const posts: Box[] = [-23, 23].map((x) => ({
      x,
      y: 0,
      z: -2,
      yaw: 0,
      length: 0.5,
      height: 5.6,
      depth: 0.5,
    }));
    return { seats, torsos, heads, rails, roof, canopyEdge, posts };
  }, []);
  return (
    <group position={[GRANDSTAND_ORIGIN[0], 0, GRANDSTAND_ORIGIN[1]]}>
      <Boxes boxes={parts.seats} />
      <Boxes boxes={parts.torsos} />
      <Boxes boxes={parts.heads} />
      <Boxes boxes={parts.rails} glow />
      <Boxes boxes={parts.roof} color="#15122b" />
      <Boxes boxes={parts.canopyEdge} glow />
      <Boxes boxes={parts.posts} color="#15122b" />
    </group>
  );
}
