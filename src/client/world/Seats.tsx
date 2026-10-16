import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { RoomId } from "../../game/rooms.ts";
import { seatsIn, type Seat } from "../../game/seats.ts";
import type { WalkArea } from "../../game/area.ts";
import { walkTo, type Player } from "./PlayerController.tsx";

// the sit pose puts the underside of the thighs this far above the feet
const THIGH_HEIGHT = 0.48;

/** Set by the dock's "Take a seat" button: sit on the nearest seat. */
export const seatRequest = { nearest: false };

/**
 * Tap targets on a room's chairs and stools. A tap walks the player to the
 * front of the seat; on arrival the doll sits, facing the table or bar. Any
 * new walk or key press stands her up again (see PlayerController).
 */
export function Seats({
  room,
  player,
  area,
}: {
  room: RoomId;
  player: Player;
  area: WalkArea;
}) {
  const seats = seatsIn(room);
  const pending = useRef<Seat | null>(null);

  useFrame(({ gl }) => {
    if (!player.sitting) delete gl.domElement.dataset.seated;
    if (seatRequest.nearest) {
      seatRequest.nearest = false;
      const [px, pz] = player.walk.pos;
      const nearest = [...seats].sort(
        (a, b) =>
          Math.hypot(a.approach[0] - px, a.approach[1] - pz) -
          Math.hypot(b.approach[0] - px, b.approach[1] - pz),
      )[0];
      if (nearest) {
        player.seat = null;
        player.sitting = false;
        pending.current = nearest;
        walkTo(player, area, nearest.approach);
      }
    }
    const seat = pending.current;
    if (!seat) return;
    // a different tap or a key took the player elsewhere: give up on the seat
    const t = player.walk.target;
    if (
      t &&
      (t[0] !== seat.approach[0] || t[1] !== seat.approach[1]) &&
      Math.hypot(t[0] - seat.approach[0], t[1] - seat.approach[1]) > 0.05
    ) {
      pending.current = null;
      return;
    }
    const [x, z] = player.walk.pos;
    if (Math.hypot(x - seat.approach[0], z - seat.approach[1]) > 0.25) return;
    pending.current = null;
    player.walk.target = null;
    player.seat = {
      position: new THREE.Vector3(
        seat.at[0],
        seat.height - THIGH_HEIGHT,
        seat.at[1],
      ),
      yaw: seat.yaw,
    };
    player.sitting = true;
    player.walk.yaw = seat.yaw;
    // read by tests
    gl.domElement.dataset.seated = seat.id;
  });

  const sit = (seat: Seat) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    player.seat = null;
    player.sitting = false;
    pending.current = seat;
    walkTo(player, area, seat.approach);
  };

  return (
    <>
      {seats.map((seat) => (
        <mesh
          key={seat.id}
          position={[seat.at[0], seat.height / 2, seat.at[1]]}
          onClick={sit(seat)}
          name={`seat-${seat.id}`}
        >
          <boxGeometry args={[0.5, seat.height, 0.5]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </>
  );
}
