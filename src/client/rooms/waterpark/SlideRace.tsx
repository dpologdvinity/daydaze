// The speed slide race, ridden: you shoot down one flume on the race clock
// (slideProgress in speedSlide.ts, so each bend arrives exactly when the
// engine says), ring markers at the bends flash as you reach them and take
// your tuck's grade, your doll tucks on the press, a rival rides the twin
// flume at a pace set against your time, and the run-out ends in a splash.
// A high camera over the pool shows the whole race. The session (slideSession.ts) keeps the
// race; the panel only times it.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import {
  playGlide,
  playSplash,
  playWhoosh,
} from "../../../audio/worldSounds.ts";
import type { GameClipId } from "../../../game/dance/moves.ts";
import type { Look, SwimLook } from "../../../game/look.ts";
import type { Vec3 } from "../../../game/motion/ball.ts";
import {
  BENDS,
  bendAt,
  bendFraction,
  finishTenths,
  RIDE_SECONDS,
  rivalRideSeconds,
  slideProgress,
} from "../../../game/speedSlide.ts";
import { POOL, SLIDES, samplePath } from "../../../game/waterPark.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";
import { placePlayer, type Player } from "../../world/PlayerController.tsx";
import type { BurstHandle } from "../shared/game3d/Burst.tsx";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { Splash } from "../shared/game3d/Splash.tsx";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { rivalNow, slide } from "./slideSession.ts";

/** The path is the rider's hips; the doll's origin is at her feet. */
const SEAT = 0.42;
/** Treading water after the splash, then out onto the deck, s. */
const SWIM = 1.6;
/** How long a tuck holds, s. */
const TUCK = 0.6;
/** Samples along each flume, for allocation-free lookups each frame. */
const SAMPLES = 320;

const MINE = SLIDES[0];
const THEIRS = SLIDES[1];

type Point = readonly [number, number, number];

/** A flume sampled evenly by distance: points and the yaw a rider faces. */
type Table = { points: Point[]; yaws: number[] };

function table(path: readonly Point[]): Table {
  const points: Point[] = [];
  const yaws: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const { point, yaw } = samplePath(path, i / SAMPLES);
    points.push(point);
    yaws.push(yaw);
  }
  return { points, yaws };
}

const MY_TABLE = MINE ? table(MINE.path) : null;
const THEIR_TABLE = THEIRS ? table(THEIRS.path) : null;

/** The point `u` (0..1) down a sampled flume, into `out`; returns its yaw. */
function along(t: Table, u: number, out: Vec3): number {
  const f = Math.min(1, Math.max(0, u)) * SAMPLES;
  const i = Math.min(SAMPLES - 1, Math.floor(f));
  const k = f - i;
  const a = t.points[i] ?? t.points[0];
  const b = t.points[i + 1] ?? a;
  if (!a || !b) return 0;
  out[0] = a[0] + (b[0] - a[0]) * k;
  out[1] = a[1] + (b[1] - a[1]) * k;
  out[2] = a[2] + (b[2] - a[2]) * k;
  return t.yaws[i] ?? 0;
}

const RIVAL: { look: Look; swim: SwimLook } = {
  look: {
    skin: "#94603f",
    hairStyle: "long-curly",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "mini",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
  swim: { style: "bikini", color: "#ff2f9a" },
};

/** Marker colors: waiting, on the beat, and each grade. */
const IDLE = new THREE.Color("#5fd8ff").multiplyScalar(1.2);
const NOW = new THREE.Color("#ffffff").multiplyScalar(2.6);
const GRADE = {
  perfect: new THREE.Color("#4fff9a").multiplyScalar(2),
  good: new THREE.Color("#ffe066").multiplyScalar(1.8),
  early: new THREE.Color("#ff4f6a").multiplyScalar(1.6),
  late: new THREE.Color("#ff4f6a").multiplyScalar(1.6),
} as const;

const tmp: Vec3 = [0, 0, 0];
const next: Vec3 = [0, 0, 0];
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const look = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const lookM = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

/** Glowing rings over my flume at each bend. */
function BendMarkers() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  useEffect(() => {
    const im = mesh.current;
    if (!im || !MY_TABLE) return;
    for (let i = 0; i < BENDS; i++) {
      const u = bendFraction(i);
      along(MY_TABLE, u, tmp);
      along(MY_TABLE, u + 0.01, next);
      pos.set(tmp[0], tmp[1] + 0.15, tmp[2]);
      look.set(next[0], next[1] + 0.15, next[2]);
      // each ring faces down the flume, so you ride through it
      lookM.lookAt(pos, look, UP);
      q.setFromRotationMatrix(lookM);
      m.compose(pos, q, one);
      im.setMatrixAt(i, m);
      im.setColorAt(i, IDLE);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, []);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const s = slide.get();
    im.visible = s.phase !== "off";
    if (!im.visible) return;
    const t = (performance.now() - s.since) / 1000;
    for (let i = 0; i < BENDS; i++) {
      const graded = s.run[i];
      const near = Math.abs(t - bendAt(i)) < 0.25 && s.phase === "sliding";
      im.setColorAt(i, graded ? GRADE[graded] : near && !calm ? NOW : IDLE);
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, BENDS]}
      frustumCulled={false}
      visible={false}
    >
      <torusGeometry args={[0.75, 0.05, 6, 24]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * Rides the player down my flume on the race clock, tucking on each press,
 * then splashes, treads water and climbs out at the flume's exit.
 */
function useRider(
  player: Player,
  splash: RefObject<BurstHandle | null>,
): { clip: GameClipId | null; riding: boolean } {
  const took = useRef<GameSeat | null>(null);
  const splashed = useRef(-1);
  const glide = useRef(0);
  const [clip, setClip] = useState<GameClipId | null>(null);
  // on the flume (or treading water after): the chase camera's on
  const [riding, setRiding] = useState(false);
  const s = slide.use();
  // a tuck on each press: the clip holds briefly
  useEffect(() => {
    if (!s.last) return;
    playWhoosh();
    setClip("tuck");
    const id = window.setTimeout(() => setClip(null), TUCK * 1000);
    return () => window.clearTimeout(id);
  }, [s.last, s.run.length]);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  const tucked = useRef(false);
  const onFlume = useRef(false);
  tucked.current = clip !== null;
  useFrame(() => {
    const st = slide.get();
    if (st.phase === "off" || !MY_TABLE || !MINE) {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      if (onFlume.current) setRiding((onFlume.current = false));
      return;
    }
    if (!took.current && st.phase === "sliding") {
      const mine: GameSeat = {
        position: new THREE.Vector3(),
        yaw: 0,
        sit: true,
      };
      if (!claimSeat(player, mine)) return;
      took.current = mine;
      if (!onFlume.current) setRiding((onFlume.current = true));
    }
    const seat = took.current;
    if (!seat || player.seat !== seat) return;
    const t = (performance.now() - st.pushedOff) / 1000;
    const u = slideProgress(t);
    if (u < 1) {
      const yaw = along(MY_TABLE, u, tmp);
      seat.position.set(tmp[0], tmp[1] - SEAT, tmp[2]);
      seat.yaw = yaw;
      // sitting on the flume, unless the tuck clip holds the ball
      seat.sit = !tucked.current;
      // the rush: a hiss of water every few frames' worth of slide
      if (performance.now() - glide.current > 320) {
        glide.current = performance.now();
        playGlide();
      }
      return;
    }
    const end = MINE.path[MINE.path.length - 1];
    if (splashed.current !== st.pushedOff && end) {
      splashed.current = st.pushedOff;
      splash.current?.fire(end[0], POOL.water, end[2], 1.2);
      playSplash(0.8);
    }
    if (end && t < RIDE_SECONDS + SWIM) {
      // treading water at the bottom
      seat.sit = false;
      seat.position.set(end[0], POOL.water - 1.12, end[2]);
      return;
    }
    // out onto the deck by the flume's exit; the race result stays up
    if (took.current) {
      releaseSeat(player, took.current);
      took.current = null;
      placePlayer(player, MINE.exit[0], MINE.exit[1]);
      setRiding((onFlume.current = false));
    }
  });
  return { clip, riding };
}

/** The rival on the twin flume, at a pace set against your time. */
function Rival({ splash }: { splash: RefObject<BurstHandle | null> }) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const splashed = useRef(-1);
  useFrame((_, dt) => {
    const g = group.current;
    const st = slide.get();
    if (!g || !THEIR_TABLE || !THEIRS) return;
    g.visible = st.phase !== "off";
    if (!g.visible) {
      progress.current = 0;
      return;
    }
    const start = st.pushedOff;
    if (progress.current < 1) {
      const pace = rivalRideSeconds(rivalNow(), finishTenths(st.run));
      progress.current = Math.min(1, progress.current + dt / pace);
      const yaw = along(THEIR_TABLE, progress.current, tmp);
      g.position.set(tmp[0], tmp[1] - SEAT, tmp[2]);
      g.rotation.set(0, yaw, 0);
      return;
    }
    const end = THEIRS.path[THEIRS.path.length - 1];
    if (end && splashed.current !== start) {
      splashed.current = start;
      splash.current?.fire(end[0], POOL.water, end[2], 0.9);
      playSplash(0.6);
      g.position.set(end[0], POOL.water - 1.12, end[2]);
    }
  });
  return (
    <group ref={group} visible={false}>
      <Doll look={RIVAL.look} swim={RIVAL.swim} mood="sit" seed={520} />
    </group>
  );
}

/** The speed slide race in the world. */
export function SlideRace({ player }: { player: Player }) {
  const s = slide.use();
  const splash = useRef<BurstHandle>(null);
  // high over the pool, looking at the tower: both flumes, both riders and
  // the bend rings in one frame (a follow camera loses them in the posts)
  const eye = useMemo<Vec3>(() => [-1.5, 8.5, -1], []);
  const target = useMemo<Vec3>(() => [6.2, 3.2, -6.6], []);
  const { clip, riding } = useRider(player, splash);
  useGameClip("speed-slide", clip);
  useGameShot("speed-slide", riding, eye, target);
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    canvas.dataset.slideBends = String(s.run.length);
    canvas.dataset.slidePhase = s.phase;
  }, [canvas, s.run.length, s.phase]);
  return (
    <>
      <BendMarkers />
      <Rival splash={splash} />
      <Splash ref={splash} />
    </>
  );
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
