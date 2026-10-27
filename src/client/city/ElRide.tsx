// Riding the El as fast travel. Near a station's stairs the dock offers a
// trip to another station; she is taken up to the platform, waits for the
// train, sits in it, rides along (the camera follows her) and steps off at
// the other station's stairs. The doll rides on `player.seat`, like a ride
// seat; the city streams around wherever the train is.

import { useFrame } from "@react-three/fiber";
import {
  EL_DECK_Y,
  EL_STATIONS,
  elTrainAt,
  planTrip,
  type ElStation,
} from "../../game/city/el.ts";
import { elClock, STAIRS_FOOT } from "./elLayout.ts";
import { elRide } from "./elStore.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { Vector3 } from "three";

/** She is "at the stairs" this close to their foot (meters). */
const NEAR = 14;
const seatPos = new Vector3();

export function ElRide({ player }: { player: Player }) {
  useFrame(() => {
    const now = elClock();
    const { status, request } = elRide.get();
    // the station whose stairs she is near (not while riding)
    let near: ElStation | null = null;
    if (status.kind === "idle") {
      for (const station of EL_STATIONS) {
        const [fx, fz] = STAIRS_FOOT(station);
        if (Math.hypot(player.pos.x - fx, player.pos.z - fz) < NEAR)
          near = station;
      }
    }
    if (near?.id !== elRide.get().near?.id) elRide.set({ near });

    if (request === "cancel") {
      elRide.set({ request: null });
      if (status.kind !== "idle")
        getOff(player, status.trip.from, status.trip.from.x);
      elRide.set({ status: { kind: "idle" } });
      return;
    }
    if (request) {
      elRide.set({ request: null });
      const from = near;
      const to = EL_STATIONS.find((s) => s.id === request.to);
      if (status.kind === "idle" && from && to && to.id !== from.id) {
        elRide.set({
          status: { kind: "waiting", trip: planTrip(from, to, now) },
        });
        player.walk.target = null;
        player.sitting = false;
        stand(player, from);
      }
      return;
    }

    if (status.kind === "waiting") {
      const { trip } = status;
      const train = elTrainAt(now);
      if (
        now >= trip.board &&
        now < trip.leave &&
        train.at?.id === trip.from.id
      ) {
        elRide.set({ status: { kind: "riding", trip } });
      } else if (now >= trip.leave) {
        // she missed it: the next one
        elRide.set({
          status: { kind: "waiting", trip: planTrip(trip.from, trip.to, now) },
        });
      }
    } else if (status.kind === "riding") {
      const { trip } = status;
      const train = elTrainAt(now);
      if (now >= trip.arrive && train.at?.id === trip.to.id) {
        getOff(player, trip.to, train.x);
        elRide.set({ status: { kind: "idle" } });
        return;
      }
      // sit in the middle car, facing the way the train goes
      seatPos.set(train.x - 2, EL_DECK_Y + 0.45, 0.4);
      player.seat = {
        position: seatPos,
        yaw: train.dir > 0 ? Math.PI / 2 : -Math.PI / 2,
        sit: true,
      };
      placePlayer(player, train.x, 0);
    }
  });
  return null;
}

/** Standing on the platform at `station`, facing the track. */
function stand(player: Player, station: ElStation) {
  seatPos.set(station.x + 3, EL_DECK_Y + 0.2, 3.0);
  player.seat = { position: seatPos, yaw: Math.PI };
  placePlayer(player, station.x, 0);
}

/** Back on the street at the foot of `station`'s stairs. */
function getOff(player: Player, station: ElStation, _trainX: number) {
  player.seat = null;
  const [x, z] = STAIRS_FOOT(station);
  placePlayer(player, x, z);
}
