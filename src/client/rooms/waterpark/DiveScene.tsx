// The cliff dive, in the Water Park: the player's doll climbs the tower and
// walks out on a board over the pool; while the entry meter runs she sways at
// the edge and a gauge by the board shows where it stands; on the press she
// launches, turning through her trick (diveTurn in cliffDive.ts) with its
// clip, hits the water with a splash sized by the entry, and a judge on the
// deck holds up her score. The session (divingSession.ts) keeps the game.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { playSplash, playWhoosh } from "../../../audio/worldSounds.ts";
import { diveTurn, splashSize, type TrickId } from "../../../game/cliffDive.ts";
import type { GameClipId } from "../../../game/dance/moves.ts";
import type { Look, SwimLook } from "../../../game/look.ts";
import { ballAt, lobIn, type Vec3 } from "../../../game/motion/ball.ts";
import { POOL, TOWER } from "../../../game/waterPark.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";
import type { Player } from "../../world/PlayerController.tsx";
import type { BurstHandle } from "../shared/game3d/Burst.tsx";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { ScoreCard } from "../shared/game3d/ScoreCard.tsx";
import { Splash } from "../shared/game3d/Splash.tsx";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { canvasTex } from "../shared/materials.ts";
import { diving, entryNow, onBoard } from "./divingSession.ts";

/** The diving board: out from the deck toward the pool, its tip, and the
 * foot of the ladder up the tower. */
const BOARD = { x0: TOWER.x - 1.3, x1: TOWER.x - 2.7, y: TOWER.top + 0.05 };
const EDGE: Vec3 = [BOARD.x1 + 0.25, BOARD.y + 0.03, TOWER.z];
const LADDER: Vec3 = [TOWER.x - 1.8, 0, TOWER.z + 0.7];
const LADDER_TOP: Vec3 = [LADDER[0], EDGE[1], LADDER[2]];
/** Where she enters the water (open water, west of the slides' run-outs),
 * and how long she's in the air, s. */
const LAND: Vec3 = [-1.2, POOL.water - 1.0, -5.4];
export const FLY = 1.35;
/** Treading water after: head and shoulders out. */
const SURFACE_Y = POOL.water - 1.12;
const WALK = 1.6;
const CLIMB = 2.6;
/** Facing where she'll land. */
const TO_POOL = Math.atan2(LAND[0] - EDGE[0], LAND[2] - EDGE[2]);

const CLIP: Record<TrickId, GameClipId> = {
  pencil: "dive-pencil",
  swan: "dive-swan",
  backflip: "dive-backflip",
  twist: "dive-twist",
};

const FLIGHT = lobIn(EDGE, LAND, FLY);

const JUDGE: { look: Look; swim: SwimLook } = {
  look: {
    skin: "#e6b48e",
    hairStyle: "bob",
    hairColor: "#c0c0c8",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "mini",
    outfitColor: "#e8e2ff",
    shadow: "#2e7dff",
  },
  swim: { style: "one-piece", color: "#3fe0d0" },
};
const JUDGE_AT: Vec3 = [4.1, 0, -2.6];

// the entry gauge: a half-dial of bands, flop red at the ends to a green
// rip at the top, drawn once
const GAUGE_TEX = canvasTex(256, 140, (ctx) => {
  const bands: [number, string][] = [
    [0.5, "#ff4f6a"],
    [0.3, "#ffb02e"],
    [0.15, "#ffe066"],
    [0.06, "#4fff9a"],
  ];
  ctx.lineWidth = 26;
  for (const [half, color] of bands) {
    // the dial runs from left (0) through the top (0.5) to right (1)
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(
      128,
      128,
      100,
      Math.PI + (0.5 - half) * Math.PI,
      Math.PI + (0.5 + half) * Math.PI,
    );
    ctx.stroke();
  }
});

/** The board out over the pool, one plank. */
function Board() {
  const len = BOARD.x0 - BOARD.x1;
  return (
    <mesh position={[(BOARD.x0 + BOARD.x1) / 2, BOARD.y, TOWER.z]}>
      <boxGeometry args={[len, 0.06, 0.5]} />
      <meshStandardMaterial color="#3fc2ff" roughness={0.5} />
    </mesh>
  );
}

/** The dial by the board's tip and its needle, while the meter runs. */
function Gauge() {
  const group = useRef<THREE.Group>(null);
  const needle = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = diving.get().phase === "entry";
    if (!g.visible || !needle.current) return;
    needle.current.rotation.z = (0.5 - entryNow(performance.now())) * Math.PI;
  });
  return (
    <group
      ref={group}
      position={[EDGE[0] + 0.1, EDGE[1] + 2.15, EDGE[2] + 0.7]}
      visible={false}
    >
      <mesh>
        <planeGeometry args={[1.1, 0.6]} />
        <meshBasicMaterial
          map={GAUGE_TEX}
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={needle} position={[0, -0.27, 0.01]}>
        <boxGeometry args={[0.03, 0.9, 0.01]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

const at: Vec3 = [0, 0, 0];

/** Moves `pos` toward `p` by `step`, turning `seat` to face the way it
 * walks; true once it's there. */
function stepToward(
  seat: NonNullable<Player["seat"]>,
  p: Vec3,
  step: number,
): boolean {
  const pos = seat.position;
  const dx = p[0] - pos.x;
  const dy = p[1] - pos.y;
  const dz = p[2] - pos.z;
  const d = Math.hypot(dx, dy, dz);
  if (d <= step) {
    pos.set(p[0], p[1], p[2]);
    return true;
  }
  pos.x += (dx / d) * step;
  pos.y += (dy / d) * step;
  pos.z += (dz / d) * step;
  if (Math.hypot(dx, dz) > 1e-3) seat.yaw = Math.atan2(dx, dz);
  return false;
}

/**
 * The diver: up the ladder and out on the board when a set starts; sways
 * with the meter at the edge; flies her trick on the press; treads water
 * after the splash until the next dive puts her back on the board.
 */
function useDiver(player: Player, splash: RefObject<BurstHandle | null>) {
  const calm = useReducedMotion();
  const took = useRef(false);
  // the climb: 0 walking to the ladder, 1 climbing, 2 out on the board, 3 up
  const leg = useRef(0);
  const flown = useRef(-1);
  const splashed = useRef(-1);
  useEffect(
    () => () => {
      if (took.current) player.seat = null;
    },
    [player],
  );
  useFrame((_, dt) => {
    const s = diving.get();
    if (s.phase === "off") {
      if (took.current) {
        player.seat = null;
        took.current = false;
        leg.current = 0;
      }
      return;
    }
    if (!took.current) {
      took.current = true;
      leg.current = 0;
      player.sitting = false;
      player.seat = {
        position: player.pos.clone(),
        yaw: player.yaw,
        stride: true,
      };
    }
    const seat = player.seat;
    if (!seat) return;
    const now = performance.now();
    seat.flip = 0;
    if (s.phase === "splash") {
      const t = (now - s.since) / 1000;
      const last = s.dives[s.dives.length - 1];
      if (flown.current !== s.since) {
        flown.current = s.since;
        playWhoosh();
      }
      if (t < FLY && last) {
        // in the air: along the arc, turning through the trick
        ballAt(FLIGHT, t, at);
        seat.position.set(at[0], at[1], at[2]);
        const turn = diveTurn(last.trick, last.entry, t / FLY);
        seat.flip = turn.pitch;
        seat.yaw = TO_POOL + turn.twist;
        seat.stride = false;
        return;
      }
      if (splashed.current !== s.since && last) {
        splashed.current = s.since;
        const size = splashSize(last.entry);
        splash.current?.fire(LAND[0], POOL.water, LAND[2], 0.6 + size);
        playSplash(size);
      }
    }
    if (s.phase === "splash" || s.phase === "over") {
      // surfaced: treading water where she went in
      seat.stride = false;
      seat.yaw = Math.PI / 2;
      seat.position.set(
        LAND[0],
        SURFACE_Y + (calm ? 0 : Math.sin(now / 550) * 0.04),
        LAND[2],
      );
      leg.current = 3;
      return;
    }
    // pick or entry: get up on the board (after a dive, she's back up there)
    if (leg.current === 3) {
      seat.position.set(EDGE[0], EDGE[1], EDGE[2]);
      leg.current = 2;
    }
    if (leg.current === 0) {
      seat.stride = true;
      if (stepToward(seat, LADDER, WALK * dt)) leg.current = 1;
      return;
    }
    if (leg.current === 1) {
      seat.stride = false;
      if (stepToward(seat, LADDER_TOP, CLIMB * dt)) leg.current = 2;
      return;
    }
    seat.stride = !stepToward(seat, EDGE, WALK * dt);
    if (seat.stride) return;
    seat.yaw = TO_POOL;
    onBoard();
    // at the edge: she rocks with the entry meter, upright at its middle
    if (s.phase === "entry") seat.flip = (entryNow(now) - 0.5) * 0.5;
  });
}

/** The cliff dive in the world: board, gauge, diver, splash, judge, camera. */
export function DiveScene({ player }: { player: Player }) {
  const s = diving.use();
  const splash = useRef<BurstHandle>(null);
  useDiver(player, splash);
  const last = s.dives[s.dives.length - 1];
  const flying = s.phase === "splash" && last ? CLIP[last.trick] : null;
  useGameClip("cliff-dive", flying);
  // across the pool from the southwest, clear of the slides and the bucket
  const eye = useMemo<Vec3>(() => [-6, 6, -16], []);
  const target = useMemo<Vec3>(() => [2.8, 2.6, TOWER.z], []);
  useGameShot("cliff-dive", s.phase !== "off", eye, target);
  // the judge's card: up once the diver is in, down for the next dive
  const canvas = useThree((st) => st.gl.domElement);
  const showCard = s.phase === "splash" && last ? String(last.points) : null;
  useEffect(() => {
    canvas.dataset.divePhase = s.phase;
    if (last) canvas.dataset.diveEntry = last.entry;
  }, [canvas, s.phase, last]);
  return (
    <>
      <Board />
      <Gauge />
      <Splash ref={splash} />
      <group position={JUDGE_AT} rotation-y={-Math.PI / 2 - 0.5}>
        <Doll
          look={JUDGE.look}
          swim={JUDGE.swim}
          mood={showCard ? "dance" : "idle"}
          dance={showCard ? "wave" : undefined}
          seed={410}
        />
        <ScoreCard score={showCard} position={[0.35, 1.75, 0.15]} />
      </group>
    </>
  );
}
