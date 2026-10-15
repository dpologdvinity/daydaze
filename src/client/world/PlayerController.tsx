import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { clampToArea, type WalkArea } from "../../game/area.ts";
import type { Look, Mood, SwimLook } from "../../game/look.ts";
import { moveAction, MOVE_CODES } from "../../game/input.ts";
import type { Portal, Spawn } from "../../game/rooms.ts";
import {
  pathLength,
  POOL,
  samplePath,
  type Slide,
} from "../../game/waterPark.ts";
import {
  createWalker,
  SIM_STEP,
  setTarget,
  stepWalker,
  turnBetween,
  type Walker,
} from "../../game/walker.ts";
import { WALK_SPEED, type Vec2 } from "../../game/walk.ts";
import { useReducedMotion } from "../motion.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import { hdr } from "../rooms/shared/materials.ts";
import { driving } from "./driving.ts";
import { ignoresKeys } from "./keyTargets.ts";
import { stick } from "./joystick.ts";

/** Frame time the simulation may catch up on; longer gaps (a hidden tab) are dropped. */
const MAX_CATCH_UP = 0.25;

/**
 * The walker is simulated at a fixed step and the drawn pose is interpolated.
 * A seat or a slide takes over the drawn pose and pauses the walker.
 */
export type Player = {
  /** Drawn position, between the last two simulation steps. */
  pos: THREE.Vector3;
  yaw: number;
  walk: Walker;
  /** The walker at the start of the last step, for interpolation. */
  before: { pos: Vec2; yaw: number };
  /** Frame time not yet simulated, in seconds. */
  acc: number;
  /** Set while a ride carries the doll; walking pauses and the seat wins. */
  seat: { position: THREE.Vector3; yaw: number } | null;
  /** A slide ride: `t` runs 0..1 down the slide, then `swim` counts seconds. */
  ride: { slide: Slide; length: number; t: number; swim: number } | null;
};

export function createPlayer(spawn: Spawn): Player {
  const walk = createWalker(spawn);
  const [x, z] = walk.pos;
  return {
    pos: new THREE.Vector3(x, 0, z),
    yaw: walk.yaw,
    walk,
    before: { pos: walk.pos, yaw: walk.yaw },
    acc: 0,
    seat: null,
    ride: null,
  };
}

/** Puts the player on a point at once, without walking there. */
export function placePlayer(player: Player, x: number, z: number) {
  player.walk.pos = [x, z];
  player.before.pos = player.walk.pos;
  player.before.yaw = player.walk.yaw;
  player.pos.set(x, 0, z);
  player.acc = 0;
}

/** Puts the player at the top of a slide. Ignored mid-ride or mid-portal. */
export function startRide(player: Player, slide: Slide, t = 0) {
  if (player.ride || player.walk.leaving) return;
  player.walk.target = null;
  player.ride = { slide, length: pathLength(slide.path), t, swim: 0 };
}

/** Sends a click on the floor to the player as a walk target. */
export function walkTo(player: Player, area: WalkArea, point: Vec2) {
  setTarget(player.walk, area, point);
}

const SLIDE_SPEED = 6.5;
const SWIM_SECONDS = 1.6;
const SEAT = 0.42;

/** Moves a riding player; returns how the doll should hold itself. */
function ride(
  player: Player,
  area: WalkArea,
  dt: number,
  calm: boolean,
): "sit" | "idle" | null {
  const r = player.ride;
  if (!r) return null;
  if (r.t < 1) {
    // reduced motion skips the slide and goes straight to the splash
    r.t = calm ? 1 : Math.min(1, r.t + (dt * SLIDE_SPEED) / r.length);
    const { point, yaw } = samplePath(r.slide.path, r.t);
    // the path is the rider's hips; the doll's origin is at its feet
    player.pos.set(point[0], point[1] - SEAT, point[2]);
    player.yaw = yaw;
    return "sit";
  }
  r.swim += dt;
  if (r.swim < SWIM_SECONDS) {
    // treading water: shoulders above the surface, a little bob
    const bob = calm ? 0 : Math.sin(r.swim * 5) * 0.04;
    player.pos.y = POOL.water - 1.12 + bob;
    return "idle";
  }
  const [x, z] = clampToArea(area, r.slide.exit);
  placePlayer(player, x, z);
  player.yaw = 0;
  player.walk.yaw = 0;
  player.before.yaw = 0;
  player.ride = null;
  return null;
}

// The prototype's walk cycle was tuned for 1.35 m/s; scale the stride rate so
// feet keep up with the spec's faster walking speed.
const STRIDE = WALK_SPEED / 1.35;

function useHeldKeys() {
  const held = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!MOVE_CODES.has(e.code) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (driving.session) return;
      if (ignoresKeys(e.target, e.code)) return;
      held.current.add(e.code);
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    const clear = () => held.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
  return held;
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const head = new THREE.Vector3();

/** A move action (right, forward) turned to the world, relative to the camera. */
function worldDirection(local: Vec2, camera: THREE.Camera): Vec2 | null {
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, UP);
  const x = forward.x * local[1] + right.x * local[0];
  const z = forward.z * local[1] + right.z * local[0];
  const len = Math.hypot(x, z);
  return len > 0 ? [x / len, z / len] : null;
}

export function PlayerController({
  player,
  area,
  look,
  swim,
  mood,
  tag,
  onPortal,
}: {
  player: Player;
  area: WalkArea;
  look: Look;
  swim: SwimLook | null;
  mood: Mood;
  /** DOM name tag and chat bubble, pinned above the doll's head each frame. */
  tag: RefObject<HTMLDivElement | null>;
  onPortal: (portal: Portal) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const gait = useRef<WalkState>({ speed: 0 });
  const marker = useRef<THREE.Mesh>(null);
  const held = useHeldKeys();
  const calm = useReducedMotion();
  const [riding, setRiding] = useState<Mood | null>(null);
  const shownRide = useRef<Mood | null>(null);

  useFrame((state, dt) => {
    // a driven car takes the keys; the doll stands at the pit wall
    if (driving.session) return;
    const local = moveAction(held.current, stick);
    const intent = local && worldDirection(local, state.camera);
    const rideMood = ride(player, area, dt, calm);
    if (rideMood !== shownRide.current) {
      shownRide.current = rideMood;
      setRiding(rideMood);
    }
    let moving = false;
    if (rideMood) {
      // the slide drew the pose; the walker waits for the splash to end
      player.acc = 0;
      player.walk.target = null;
    } else if (player.seat) {
      // seated: the pose is the seat's, and the walker holds still
      player.acc = 0;
    } else {
      // simulate in fixed steps, however fast frames arrive
      player.acc = Math.min(player.acc + dt, MAX_CATCH_UP);
      while (player.acc >= SIM_STEP) {
        player.acc -= SIM_STEP;
        player.before.pos = player.walk.pos;
        player.before.yaw = player.walk.yaw;
        const step = stepWalker(player.walk, area, intent, SIM_STEP);
        moving = moving || step.moved;
        if (step.portal) {
          // the walker is leaving; drop the rest of this frame's time
          player.acc = 0;
          onPortal(step.portal);
          break;
        }
      }
      // draw between the last two steps, so motion stays smooth at any frame rate
      const a = player.acc / SIM_STEP;
      const [bx, bz] = player.before.pos;
      const [x, z] = player.walk.pos;
      player.pos.set(bx + (x - bx) * a, 0, bz + (z - bz) * a);
      player.yaw =
        player.before.yaw + turnBetween(player.before.yaw, player.walk.yaw) * a;
    }

    gait.current.speed = THREE.MathUtils.damp(
      gait.current.speed,
      moving ? STRIDE : 0,
      10,
      dt,
    );
    // a seated or sliding doll is drawn on the seat or the slide, feet and all
    const drawn = player.seat ?? { position: player.pos, yaw: player.yaw };
    if (g.current) {
      g.current.position.copy(drawn.position);
      g.current.rotation.y = drawn.yaw;
    }
    const el = tag.current;
    if (el) {
      // above the doll's feet, which sit on the seat while riding
      head.copy(drawn.position);
      head.y += 1.95;
      head.project(state.camera);
      const px = ((head.x + 1) / 2) * state.size.width;
      const py = ((1 - head.y) / 2) * state.size.height;
      el.style.visibility = head.z < 1 ? "visible" : "hidden";
      el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -100%)`;
    }
    if (marker.current) {
      const t = player.walk.target;
      marker.current.visible = t !== null;
      if (t) marker.current.position.set(t[0], 0.02, t[1]);
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
      marker.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      <group ref={g}>
        <Doll look={look} swim={swim} mood={riding ?? mood} walk={gait} />
      </group>
      <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.16, 0.2, 40]} />
        <meshBasicMaterial
          color={hdr("#ff4fb3", 4)}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
    </>
  );
}
