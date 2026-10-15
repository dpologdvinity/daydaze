import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { RoomId } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { driving } from "./driving.ts";
import type { Player } from "./PlayerController.tsx";

export type View = "room" | "full" | "face";

export const VIEWS: readonly { id: View; label: string }[] = [
  { id: "room", label: "Room" },
  { id: "full", label: "Full look" },
  { id: "face", label: "Face" },
];

// The wide shot of each room: where the camera sits and what it looks at.
const ROOM_SHOTS: Record<RoomId, { eye: THREE.Vector3; look: THREE.Vector3 }> =
  {
    "velvet-room": {
      eye: new THREE.Vector3(6.4, 5.4, 10),
      look: new THREE.Vector3(0.6, 1.0, -1.0),
    },
    plaza: {
      eye: new THREE.Vector3(5.5, 5.4, 14.5),
      look: new THREE.Vector3(1.2, 2.2, -3.5),
    },
    "amusement-park": {
      eye: new THREE.Vector3(0, 10, 19),
      look: new THREE.Vector3(0, 4.5, -10),
    },
    "water-park": {
      eye: new THREE.Vector3(9.5, 9.5, 19),
      look: new THREE.Vector3(1.5, 2.2, -4),
    },
    speedway: {
      eye: new THREE.Vector3(0, 12, 26),
      look: new THREE.Vector3(0, 1.5, -18),
    },
    // high over the first slice of the city; the orbit allows this far out
    city: {
      eye: new THREE.Vector3(-120, 150, 170),
      look: new THREE.Vector3(0, 0, 0),
    },
  };

// The city's wide shot is high above it, so it needs far more orbit range.
const MAX_DISTANCE: Record<RoomId, number> = {
  "velvet-room": 18,
  plaza: 18,
  "amusement-park": 18,
  "water-park": 18,
  // the track sits far back, so the Speedway's wide shot needs more orbit range
  speedway: 60,
  city: 300,
};

// Close-ups orbit with the player: offsets are in the player's frame.
const CLOSE: Record<"full" | "face", { off: THREE.Vector3; look: number }> = {
  full: { off: new THREE.Vector3(0.55, 1.15, 3.1), look: 0.95 },
  face: { off: new THREE.Vector3(0.2, 1.55, 1.3), look: 1.45 },
};

const Y = new THREE.Vector3(0, 1, 0);
const moved = new THREE.Vector3();
const goalPos = new THREE.Vector3();
const goalTarget = new THREE.Vector3();

/**
 * Orbit camera that follows the player without fighting the user's orbit,
 * and flies between the room, full-look and face shots.
 */
export function CameraRig({
  player,
  view,
  room,
}: {
  player: Player;
  view: View;
  room: RoomId;
}) {
  const controls = useRef<OrbitImpl>(null);
  const camera = useThree((s) => s.camera);
  const calm = useReducedMotion();
  const last = useRef(player.pos.clone());
  const fly = useRef<{ t: number; snap: boolean } | null>(null);
  const shown = useRef<{ view: View; player: Player } | null>(null);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    // the Speedway's chase camera owns the view while a car is driven
    c.enabled = driving.session === null;
    if (!c.enabled) return;
    if (shown.current?.player !== player) {
      // new room or first frame: cut straight to the shot
      shown.current = { view, player };
      last.current.copy(player.pos);
      fly.current = { t: 0, snap: true };
    } else if (shown.current.view !== view) {
      shown.current = { view, player };
      fly.current = { t: 0, snap: calm };
    }
    moved.subVectors(player.pos, last.current);
    last.current.copy(player.pos);
    camera.position.add(moved);
    c.target.add(moved);
    const f = fly.current;
    if (f) {
      if (view === "room") {
        goalPos.copy(ROOM_SHOTS[room].eye);
        goalTarget.copy(ROOM_SHOTS[room].look);
      } else {
        const v = CLOSE[view];
        goalPos.copy(v.off).applyAxisAngle(Y, player.yaw).add(player.pos);
        goalTarget.copy(player.pos).setY(v.look);
      }
      const k = f.snap ? 1 : 1 - Math.exp(-dt * 5);
      camera.position.lerp(goalPos, k);
      c.target.lerp(goalTarget, k);
      f.t += dt;
      if (f.snap || f.t > 1.4) fly.current = null;
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!calm}
      minDistance={0.6}
      maxDistance={MAX_DISTANCE[room]}
      maxPolarAngle={Math.PI / 2 - 0.06}
      minPolarAngle={0.15}
    />
  );
}
