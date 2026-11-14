// Riding the El as fast travel. Near a station's stairs the dock offers a
// trip to another station; she is taken up to the platform, waits for the
// train, sits in it, rides along (the camera follows her) and steps off at
// the other station's stairs. The doll rides on `player.seat`, like a ride
// seat; the city streams around wherever the train is.

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EL_DECK_Y,
  EL_STATIONS,
  elTrainAt,
  hasArrived,
  hasBoarded,
  nearestStation,
  planTrip,
  type ElStation,
  type ElTrain,
  type ElTrip,
} from "../../game/city/el.ts";
import { elClock, STAIRS_FOOT } from "./elLayout.ts";
import { elRide, resetElRide } from "./elStore.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { driving } from "../world/driving.ts";
import { Vector3 } from "three";

/** She is "at the stairs" this close to their foot (meters). */
const NEAR = 14;
/** The two poses she holds, allocated once: standing on the platform and
 * sitting in the train. Their identity tells whether something else took the
 * seat from her. */
const PLATFORM_SEAT = { position: new Vector3(), yaw: Math.PI };
const TRAIN_SEAT = { position: new Vector3(), yaw: 0, sit: true };

export function ElRide({ player }: { player: Player }) {
  // leaving the city (or a StrictMode remount) must not leave a trip behind
  useEffect(
    () => () => {
      const { status } = elRide.get();
      if (player.seat === PLATFORM_SEAT || player.seat === TRAIN_SEAT)
        player.seat = null;
      if (status.kind === "riding")
        getOff(player, nearestStation(player.pos.x));
      resetElRide();
    },
    [player],
  );
  useFrame(() => {
    const now = elClock();
    const { status, request } = elRide.get();
    // the El is not for someone driving, riding a slide or seat, or mid-portal
    const busy =
      !!driving.session ||
      !!driving.passenger ||
      !!player.ride ||
      player.walk.leaving;
    // the station whose stairs she is near (not while riding)
    let near: ElStation | null = null;
    if (status.kind === "idle" && !busy && !player.seat) {
      for (const station of EL_STATIONS) {
        const [fx, fz] = STAIRS_FOOT(station);
        if (Math.hypot(player.pos.x - fx, player.pos.z - fz) < NEAR)
          near = station;
      }
    }
    if (near?.id !== elRide.get().near?.id) elRide.set({ near });

    if (request === "cancel") {
      elRide.set({ request: null });
      if (status.kind === "waiting") getOff(player, status.trip.from);
      else if (status.kind === "riding")
        getOff(player, nearestStation(player.pos.x));
      elRide.set({ status: { kind: "idle" } });
      return;
    }
    if (request) {
      elRide.set({ request: null });
      const to = EL_STATIONS.find((s) => s.id === request.to);
      if (status.kind === "idle" && near && to && to.id !== near.id) {
        const trip = tryPlan(near, to, now);
        if (!trip) return;
        elRide.set({ status: { kind: "waiting", trip } });
        player.walk.target = null;
        player.sitting = false;
        stand(player, near);
      }
      return;
    }

    if (status.kind === "idle") return;
    // something else took her seat (a car, a bus, a click): the trip is off
    const mine = status.kind === "waiting" ? PLATFORM_SEAT : TRAIN_SEAT;
    if (player.seat !== mine) {
      elRide.set({ status: { kind: "idle" } });
      return;
    }
    const train = elTrainAt(now);
    if (status.kind === "waiting") {
      const { trip } = status;
      if (hasBoarded(trip, now)) {
        player.seat = TRAIN_SEAT;
        seatInTrain(player, train);
        elRide.set({ status: { kind: "riding", trip } });
      }
    } else {
      const { trip } = status;
      if (hasArrived(trip, train, now)) {
        getOff(player, trip.to);
        elRide.set({ status: { kind: "idle" } });
        return;
      }
      seatInTrain(player, train);
    }
  });
  return null;
}

/** planTrip, or null if the timetable has no train for it (never expected,
 * but a thrown error in the frame loop would take the whole scene down). */
function tryPlan(from: ElStation, to: ElStation, now: number): ElTrip | null {
  try {
    return planTrip(from, to, now);
  } catch {
    return null;
  }
}

/** Sitting in the middle car, facing the way the train goes. */
function seatInTrain(player: Player, train: ElTrain) {
  TRAIN_SEAT.position.set(train.x - 2, EL_DECK_Y + 0.45, 0.4);
  TRAIN_SEAT.yaw = train.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  placePlayer(player, train.x, 0);
}

/** Standing on the platform at `station`, facing the track. */
function stand(player: Player, station: ElStation) {
  PLATFORM_SEAT.position.set(station.x + 3, EL_DECK_Y + 0.2, 3.0);
  player.seat = PLATFORM_SEAT;
  placePlayer(player, station.x, 0);
}

/** Back on the street at the foot of `station`'s stairs. */
function getOff(player: Player, station: ElStation) {
  player.seat = null;
  const [x, z] = STAIRS_FOOT(station);
  placePlayer(player, x, z);
}
