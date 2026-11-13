import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { RoomId } from "../../game/rooms.ts";
import { homeSeats, seatsIn, type Seat } from "../../game/seats.ts";
import type { HomeSave } from "../../game/home/home.ts";
import type { WalkArea } from "../../game/area.ts";
import { walkTo, type Player } from "./PlayerController.tsx";
import { startSit, seatPose, type RootPose } from "../../game/seatMove.ts";
import { pickTransition } from "../../game/dance/transitions.ts";

const rootPose: RootPose = { x: 0, y: 0, z: 0, yaw: 0 };
// a sit-down's length when its clip isn't known
const FALLBACK_SECONDS = 1;

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
  home,
}: {
  room: RoomId;
  player: Player;
  area: WalkArea;
  home: HomeSave;
}) {
  // the apartment's seats follow wherever the sofas were placed
  const seats = useMemo(
    () => (room === "apartment" ? homeSeats(home.furniture) : seatsIn(room)),
    [room, home.furniture],
  );
  const pending = useRef<Seat | null>(null);

  useFrame(({ gl }) => {
    if (!player.sitting) delete gl.domElement.dataset.seated;
    if (player.seat && !player.sitting) {
      seatRequest.nearest = false;
      return;
    }
    if (seatRequest.nearest) {
      seatRequest.nearest = false;
      const [px, pz] = player.walk.pos;
      const nearest = [...seats].sort(
        (a, b) =>
          Math.hypot(a.approach[0] - px, a.approach[1] - pz) -
          Math.hypot(b.approach[0] - px, b.approach[1] - pz),
      )[0];
      if (nearest) {
        // from another chair, PlayerController stands her up on the way
        pending.current = nearest;
        walkTo(player, area, nearest.approach);
      }
    }
    const seat = pending.current;
    // still on the last chair: she stands first (PlayerController), then walks
    if (!seat || player.sitting) return;
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
    // she turns her back to the seat and lowers onto it as the sit-down clip
    // plays (PlayerController steps the move); she'd pop there otherwise
    const down = pickTransition("stand", "sit", 0);
    const move = startSit({
      // where she actually stopped, within a step of the approach point
      approach: [x, z],
      at: seat.at,
      // lying, she rests on the mattress; sitting, on her thighs
      rootY: seat.height - (seat.lie ? 0 : THIGH_HEIGHT),
      yaw: seat.yaw,
      fromYaw: player.walk.yaw,
      reach: seat.lie ? 0 : (down?.reach ?? 0),
      seconds: down?.seconds ?? FALLBACK_SECONDS,
    });
    const start = seatPose(move, rootPose);
    player.seat = {
      position: new THREE.Vector3(start.x, start.y, start.z),
      yaw: start.yaw,
      lie: seat.lie,
      hold: seat.hold,
    };
    player.seatMove = { move, seat: player.seat };
    player.sitting = true;
    // read by tests
    gl.domElement.dataset.seated = seat.id;
  });

  const sit = (seat: Seat) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // a game's seat holds her; a chair she is standing up from does not
    if (player.seat && !player.sitting && !player.seatMove) return;
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
