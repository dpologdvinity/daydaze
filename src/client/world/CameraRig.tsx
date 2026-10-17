import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { RoomId } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "./cameraHold.ts";
import { driving } from "./driving.ts";
import type { Player } from "./PlayerController.tsx";

/** `detail` is only reachable with `?view=detail`, for close-up screenshots. */
export type View = "room" | "full" | "face" | "detail";

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
    pulse: {
      eye: new THREE.Vector3(6.4, 5.6, 12),
      look: new THREE.Vector3(0, 1.2, -2),
    },
    "violet-hour": {
      eye: new THREE.Vector3(3.6, 4.8, 10.2),
      look: new THREE.Vector3(1.1, 1.2, -1.6),
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
    apartment: {
      eye: new THREE.Vector3(5.2, 5.2, 8.4),
      look: new THREE.Vector3(-0.4, 0.8, -1.2),
    },
    jail: {
      eye: new THREE.Vector3(6.4, 6.2, 11),
      look: new THREE.Vector3(0, 1.0, -2.2),
    },
    "haunted-house": {
      eye: new THREE.Vector3(3, 9, 10),
      look: new THREE.Vector3(0, 0.5, -0.5),
    },
    "ice-rink": {
      eye: new THREE.Vector3(0, 8.5, 15),
      look: new THREE.Vector3(0, 0.8, -1),
    },
    // from the sideline, down the field to the end zone and posts
    gridiron: {
      eye: new THREE.Vector3(6, 7, 14),
      look: new THREE.Vector3(0, 2, -6),
    },
    // from behind the bays, out over the range to the skyline
    "driving-range": {
      eye: new THREE.Vector3(2, 4.5, 9),
      look: new THREE.Vector3(0, 0.5, -30),
    },
    // from by the door, over the spring floor to the judges
    gym: {
      eye: new THREE.Vector3(4, 6.5, 13),
      look: new THREE.Vector3(0, 1, -2),
    },
    // from the bleachers, over the bowl and funbox to the half-pipe
    skatepark: {
      eye: new THREE.Vector3(2, 7.5, 14),
      look: new THREE.Vector3(0, 1, -3),
    },
    // from over the benches, across the rink to the DJ and the neon
    "roller-rink": {
      eye: new THREE.Vector3(3, 6.5, 13.5),
      look: new THREE.Vector3(0, 1, -2),
    },
    // from over the doors, up the hall to the stores, balcony and neon
    galleria: {
      eye: new THREE.Vector3(4, 7, 14),
      look: new THREE.Vector3(-1, 2.5, -4),
    },
    // from over the door, along the boodle table to the capiz windows
    "kamayan-hall": {
      eye: new THREE.Vector3(4.5, 4.6, 9.5),
      look: new THREE.Vector3(-0.8, 0.8, -2),
    },
    // from the tunnel end, down the court to the hoop and the stands
    dome: {
      eye: new THREE.Vector3(3, 5.5, 13),
      look: new THREE.Vector3(0, 2, -3),
    },
    // from behind the spot, over the box to the goal and the end stand
    stadium: {
      eye: new THREE.Vector3(4, 6.5, 14),
      look: new THREE.Vector3(0, 1.5, -5),
    },
    // from behind the concourse, over the three greens to the sea
    "mini-golf": {
      eye: new THREE.Vector3(-1, 7.5, 14),
      look: new THREE.Vector3(-0.5, 0, -1),
    },
    // from over the door, across the dance floor to the band
    "la-noche": {
      eye: new THREE.Vector3(2.8, 5, 10.5),
      look: new THREE.Vector3(-0.4, 1.4, -2.6),
    },
    // from over the door, across the carpet to the cabinets
    "arcade-bar": {
      eye: new THREE.Vector3(2.4, 4.6, 10.5),
      look: new THREE.Vector3(-0.4, 1.2, -2.6),
    },
    // from over the concourse, down the lanes to the pins and the hood
    bowling: {
      eye: new THREE.Vector3(-2.5, 4.8, 11.5),
      look: new THREE.Vector3(0.4, 0.6, -3),
    },
    // from over the door, across the booths to the stage and its screen
    karaoke: {
      eye: new THREE.Vector3(2.6, 4.6, 10),
      look: new THREE.Vector3(-0.3, 1.5, -2.6),
    },
    // from over the alley door, down the floor to the container
    warehouse: {
      eye: new THREE.Vector3(3.2, 4.4, 11.5),
      look: new THREE.Vector3(-0.4, 2, -3),
    },
    // from over the door, down the room to the DJ and the neon
    "sugar-rush": {
      eye: new THREE.Vector3(3.2, 5.4, 10.5),
      look: new THREE.Vector3(-0.4, 1.2, -1.8),
    },
    // from past the south-east corner, across the deck to the bar and skyline
    "rooftop-bar": {
      eye: new THREE.Vector3(4, 8, 13.5),
      look: new THREE.Vector3(-2, 0.6, 0.5),
    },
    aquarium: {
      eye: new THREE.Vector3(5.5, 5.4, 12.5),
      look: new THREE.Vector3(0, 1.6, -2.5),
    },
    "filipino-joint": {
      eye: new THREE.Vector3(0, 4.4, 10.4),
      look: new THREE.Vector3(0, 1.3, -1.2),
    },
    "boba-matcha": {
      eye: new THREE.Vector3(0, 4.4, 10.4),
      look: new THREE.Vector3(0, 1.3, -1.2),
    },
    "ube-bakery": {
      eye: new THREE.Vector3(0, 4.4, 10.4),
      look: new THREE.Vector3(0, 1.3, -1.2),
    },
    // high over the first slice of the city; the orbit allows this far out
    city: {
      eye: new THREE.Vector3(-120, 150, 170),
      look: new THREE.Vector3(0, 0, 0),
    },
  };

// Close-up on a prop worth a look; rooms without one fall back to the wide shot.
const DETAIL_SHOTS: Partial<
  Record<RoomId, { eye: THREE.Vector3; look: THREE.Vector3 }>
> = {
  "velvet-room": {
    eye: new THREE.Vector3(-3.6, 2.4, -2.4),
    look: new THREE.Vector3(-0.8, 1.9, -5.8),
  },
  pulse: {
    eye: new THREE.Vector3(2.5, 2.2, 1),
    look: new THREE.Vector3(0, 2.4, -6),
  },
  "violet-hour": {
    eye: new THREE.Vector3(0, 2, 2),
    look: new THREE.Vector3(0, 2, -6),
  },
  plaza: {
    eye: new THREE.Vector3(2.6, 1.8, -0.4),
    look: new THREE.Vector3(0.8, 2.2, -3.6),
  },
};

// The city's wide shot is high above it, so it needs far more orbit range.
const MAX_DISTANCE: Record<RoomId, number> = {
  "velvet-room": 18,
  pulse: 18,
  "violet-hour": 18,
  "filipino-joint": 18,
  "boba-matcha": 18,
  "ube-bakery": 18,
  plaza: 18,
  "amusement-park": 18,
  "water-park": 18,
  apartment: 18,
  jail: 18,
  aquarium: 18,
  "ice-rink": 22,
  "rooftop-bar": 20,
  "sugar-rush": 18,
  warehouse: 20,
  karaoke: 16,
  bowling: 22,
  "arcade-bar": 18,
  "la-noche": 18,
  "mini-golf": 24,
  dome: 24,
  "kamayan-hall": 16,
  galleria: 24,
  "roller-rink": 22,
  skatepark: 26,
  gridiron: 30,
  "driving-range": 60,
  gym: 22,
  stadium: 30,
  "haunted-house": 16,
  // the track sits far back, so the Speedway's wide shot needs more orbit range
  speedway: 60,
  city: 300,
};

// Close-ups orbit with the player: offsets are in the player's frame.
const CLOSE: Record<"full" | "face", { off: THREE.Vector3; look: number }> = {
  full: { off: new THREE.Vector3(0.6, 1.2, 4.1), look: 0.9 },
  face: { off: new THREE.Vector3(0.12, 1.6, 0.85), look: 1.53 },
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
  const seated = useRef(false);
  const held = useRef(false);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    // the Speedway's chase camera owns the view while a car is driven, and
    // a room may hold it (a bowling lane's shot)
    c.enabled = driving.session === null && cameraHold.by === null;
    if (!c.enabled) {
      held.current = true;
      return;
    }
    if (held.current) {
      // handed back: fly from wherever the room left it to the usual shot
      held.current = false;
      fly.current = { t: 0, snap: calm };
    }
    if (shown.current?.player !== player) {
      // new room or first frame: cut straight to the shot
      shown.current = { view, player };
      last.current.copy(player.pos);
      fly.current = { t: 0, snap: true };
    } else if (shown.current.view !== view) {
      shown.current = { view, player };
      fly.current = { t: 0, snap: calm };
    } else if (
      Boolean(player.seat) !== seated.current &&
      view !== "room" &&
      view !== "detail"
    ) {
      // boarding or leaving a ride turns her: frame the close view again
      fly.current = { t: 0, snap: calm };
    }
    seated.current = Boolean(player.seat);
    // a ride's seat carries the doll away from her walker: follow the seat
    // close views ride along with a seat; the room view stays an overview,
    // watching the ride from where she boarded
    const overview = view === "room" || view === "detail";
    const at = (!overview && player.seat?.position) || player.pos;
    moved.subVectors(at, last.current);
    last.current.copy(at);
    camera.position.add(moved);
    c.target.add(moved);
    const f = fly.current;
    if (f) {
      if (view === "room" || view === "detail") {
        const shot =
          (view === "detail" && DETAIL_SHOTS[room]) || ROOM_SHOTS[room];
        goalPos.copy(shot.eye);
        goalTarget.copy(shot.look);
      } else {
        const v = CLOSE[view];
        goalPos
          .copy(v.off)
          .applyAxisAngle(Y, player.seat?.yaw ?? player.yaw)
          .add(at);
        goalTarget.copy(at).setY(at.y + v.look);
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
