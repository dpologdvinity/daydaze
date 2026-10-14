import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Look, Mood } from "../../game/look.ts";
import { portalAt } from "../../game/portals.ts";
import type { Portal, RoomDefinition, Spawn } from "../../game/rooms.ts";
import {
  clampToWalkable,
  stepTowards,
  WALK_SPEED,
  yawTowards,
  type Vec2,
} from "../../game/walk.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import { hdr } from "../rooms/shared/materials.ts";

/** Mutable per-frame player state, shared with the camera rig. */
export type Player = {
  pos: THREE.Vector3;
  yaw: number;
  target: Vec2 | null;
  /** Set once a portal fires, so it fires once per visit. */
  leaving: boolean;
  /** Set while a ride carries the doll; movement pauses and the seat wins. */
  seat: { position: THREE.Vector3; yaw: number } | null;
};

export function createPlayer(spawn: Spawn): Player {
  const [x, z] = spawn.position;
  return {
    pos: new THREE.Vector3(x, 0, z),
    yaw: spawn.yaw,
    target: null,
    leaving: false,
    seat: null,
  };
}

/** Sends a click on the floor to the player as a walk target. */
export function walkTo(player: Player, room: RoomDefinition, point: Vec2) {
  player.target = clampToWalkable(room.walkable, point);
}

// The prototype's walk cycle was tuned for 1.35 m/s; scale the stride rate so
// feet keep up with the spec's faster walking speed.
const STRIDE = WALK_SPEED / 1.35;

const KEYS: Record<string, Vec2> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function ignoresKeys(target: EventTarget | null, code: string) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("input, textarea, select")) return true;
  // arrow keys inside the closet move between options, not the doll
  return (
    code.startsWith("Arrow") && target.closest("[role=radiogroup]") !== null
  );
}

function useHeldKeys() {
  const held = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!(e.code in KEYS) || e.altKey || e.ctrlKey || e.metaKey) return;
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

/** The camera-relative direction the held keys ask for, or null. */
function keyDirection(held: Set<string>, camera: THREE.Camera): Vec2 | null {
  let fx = 0;
  let fz = 0;
  for (const code of held) {
    const k = KEYS[code];
    if (k) {
      fx += k[0];
      fz += k[1];
    }
  }
  if (fx === 0 && fz === 0) return null;
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, UP);
  const x = forward.x * fz + right.x * fx;
  const z = forward.z * fz + right.z * fx;
  const len = Math.hypot(x, z);
  return len > 0 ? [x / len, z / len] : null;
}

export function PlayerController({
  player,
  room,
  look,
  mood,
  tag,
  onPortal,
}: {
  player: Player;
  room: RoomDefinition;
  look: Look;
  mood: Mood;
  /** DOM name tag and chat bubble, pinned above the doll's head each frame. */
  tag: RefObject<HTMLDivElement | null>;
  onPortal: (portal: Portal) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const walk = useRef<WalkState>({ speed: 0 });
  const marker = useRef<THREE.Mesh>(null);
  const held = useHeldKeys();

  useFrame((state, dt) => {
    const from: Vec2 = [player.pos.x, player.pos.z];
    const dir = keyDirection(held.current, state.camera);
    let goal: Vec2 | null = player.target;
    if (dir) {
      player.target = null;
      goal = [from[0] + dir[0], from[1] + dir[1]];
    }
    let moving = false;
    if (goal && !player.leaving && !player.seat) {
      const want = yawTowards(from, goal);
      const diff = Math.atan2(
        Math.sin(want - player.yaw),
        Math.cos(want - player.yaw),
      );
      player.yaw += diff * Math.min(1, dt * 9);
      // pivot first on sharp turns, then stride
      const step = WALK_SPEED * dt * (Math.abs(diff) < 1.2 ? 1 : 0.3);
      const next = clampToWalkable(
        room.walkable,
        stepTowards(from, goal, step),
      );
      const progress = Math.hypot(next[0] - from[0], next[1] - from[1]);
      moving = progress > 1e-4;
      player.pos.set(next[0], 0, next[1]);
      const arrived = next[0] === goal[0] && next[1] === goal[1];
      // stop at the target, or when pinned against an edge
      if (!moving || arrived) player.target = null;
      const portal = portalAt(room, next);
      if (portal) {
        player.leaving = true;
        player.target = null;
        onPortal(portal);
      }
    }
    walk.current.speed = THREE.MathUtils.damp(
      walk.current.speed,
      moving ? STRIDE : 0,
      10,
      dt,
    );
    if (g.current) {
      g.current.position.copy(player.seat?.position ?? player.pos);
      g.current.rotation.y = player.seat?.yaw ?? player.yaw;
    }
    const el = tag.current;
    if (el) {
      // above the doll's feet, which sit on the seat while riding
      head.copy(player.seat?.position ?? player.pos);
      head.y += 1.95;
      head.project(state.camera);
      const x = ((head.x + 1) / 2) * state.size.width;
      const y = ((1 - head.y) / 2) * state.size.height;
      el.style.visibility = head.z < 1 ? "visible" : "hidden";
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    if (marker.current) {
      const t = player.target;
      marker.current.visible = t !== null;
      if (t) marker.current.position.set(t[0], 0.02, t[1]);
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
      marker.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      <group ref={g}>
        <Doll look={look} mood={mood} walk={walk} />
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
