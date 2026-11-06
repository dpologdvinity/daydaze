// Hailing a taxi. Hail on foot and a cab rolls in along the road to the curb
// beside her; she gets in, the city map opens for a destination (the Overlay
// charges the fare), and the cab drives the real streets there with the camera
// behind it. She can skip the ride. The doll rides on `player.seat`, like the
// bus; the city streams around wherever the cab is. Nothing is allocated per
// frame: the poses and the seat are made once.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onRoad } from "../../game/city/drive.ts";
import {
  approachRoute,
  planRoute,
  routeLength,
  routePose,
  TAXI_SPEED,
} from "../../game/city/taxi.ts";
import type { Vec2 } from "../../game/walk.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { driving } from "../world/driving.ts";
import { isSceneReady } from "../world/ready.ts";
import { useQuality } from "../world/quality.ts";
import { driverSays, resetTaxiRide, taxiRide } from "./taxiStore.ts";
import {
  placeTransit,
  resetTransit,
  updateTransit,
  useTransitModels,
} from "./transitModels.ts";

/** She must be this close to the curb for the cab to take her (meters). */
const BOARD_RANGE = 24;
const KINDS = ["taxi"] as const;

export function TaxiRide({ player }: { player: Player }) {
  const low = useQuality() === "low";
  const { models, all } = useTransitModels(KINDS, 1);
  const seat = useMemo(
    () => ({ position: new THREE.Vector3(), yaw: 0, sit: true }),
    [],
  );
  const eye = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const carried = useMemo<[number, number]>(() => [0, 0], []);
  const route = useRef<Vec2[]>([]);
  const length = useRef(0);
  const along = useRef(0);
  const chatter = useRef(0);
  const destination = useRef<Vec2>([0, 0]);
  /** Where she stood when she got in, for backing out. */
  const boarded = useRef<Vec2>([0, 0]);

  // leaving the city (or a StrictMode remount) must not leave a ride behind
  useEffect(
    () => () => {
      if (player.seat === seat) player.seat = null;
      if (cameraHold.by === "city-taxi") cameraHold.by = null;
      resetTaxiRide();
    },
    [player, seat],
  );

  useFrame(({ camera, gl }, delta) => {
    if (!isSceneReady()) return;
    const { phase, request } = taxiRide.get();
    if (request) taxiRide.set({ request: null });
    const busy =
      !!driving.session ||
      !!driving.passenger ||
      !!player.ride ||
      player.walk.leaving;

    if (phase === "idle") {
      const canHail =
        !busy && !player.seat && !onRoad([player.pos.x, player.pos.z], 1);
      if (canHail !== taxiRide.get().canHail) taxiRide.set({ canHail });
      if (request === "hail" && canHail) {
        const here: Vec2 = [player.pos.x, player.pos.z];
        route.current = approachRoute(here);
        length.current = routeLength(route.current);
        along.current = 0;
        taxiRide.set({
          phase: "arriving",
          canHail: false,
          from: route.current[route.current.length - 1],
          fare: 0,
        });
        driverSays("greeting-first");
      }
    } else if (phase === "arriving") {
      const curb = taxiRide.get().from;
      if (
        request === "cancel" ||
        busy ||
        Math.hypot(player.pos.x - curb[0], player.pos.z - curb[1]) >
          BOARD_RANGE + length.current
      ) {
        taxiRide.set({ phase: "idle" });
      } else {
        along.current = Math.min(
          length.current,
          along.current + TAXI_SPEED * Math.min(delta, 1),
        );
        if (along.current >= length.current) {
          if (
            Math.hypot(player.pos.x - curb[0], player.pos.z - curb[1]) >
            BOARD_RANGE
          ) {
            // she wandered off: the cab moves on
            taxiRide.set({ phase: "idle" });
          } else {
            boarded.current = [player.pos.x, player.pos.z];
            player.walk.target = null;
            player.sitting = false;
            player.seat = seat;
            cameraHold.by = "city-taxi";
            taxiRide.set({ phase: "choosing" });
            driverSays("tapped");
          }
        }
      }
    } else if (phase === "choosing") {
      if (request === "cancel" || player.seat !== seat) {
        leave(player, seat, boarded.current);
        taxiRide.set({ phase: "idle" });
      } else if (request && typeof request === "object") {
        const to = request.go.position;
        destination.current = to;
        route.current = planRoute(taxiRide.get().from, to);
        length.current = routeLength(route.current);
        along.current = 0;
        chatter.current = 4;
        taxiRide.set({ phase: "riding" });
      }
    } else {
      // riding
      if (request === "skip") along.current = length.current;
      along.current = Math.min(
        length.current,
        along.current + TAXI_SPEED * Math.min(delta, 1),
      );
      chatter.current -= delta;
      if (chatter.current <= 0) {
        chatter.current = 9;
        driverSays("idle");
      }
      if (along.current >= length.current || player.seat !== seat) {
        leave(player, seat, destination.current);
        taxiRide.set({ phase: "idle" });
        driverSays("goodbye");
      }
    }

    // draw the cab and carry her in it
    const now = taxiRide.get().phase;
    resetTransit(all);
    if (now !== "idle") {
      const pose = routePose(route.current, along.current);
      if (now !== "arriving" && player.seat === seat) {
        carried[0] = pose.x;
        carried[1] = pose.z;
        player.walk.pos = carried;
        player.before.pos = carried;
        player.pos.set(pose.x, 0, pose.z);
        player.acc = 0;
        seat.position.set(pose.x, 0.6, pose.z);
        seat.yaw = pose.yaw + Math.PI / 2;
        const dx = Math.cos(pose.yaw),
          dz = -Math.sin(pose.yaw);
        eye.set(pose.x - dx * 11 - dz * 4, 5.5, pose.z - dz * 11 + dx * 4);
        aim.set(pose.x + dx * 3, 1.4, pose.z + dz * 3);
        camera.position.copy(eye);
        camera.lookAt(aim);
      }
      placeTransit(
        models,
        0,
        pose.x,
        pose.z,
        pose.yaw,
        Math.hypot(pose.x - player.pos.x, pose.z - player.pos.z),
        low,
      );
    }
    updateTransit(all);
    gl.domElement.dataset.taxi = now;
  });
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

/** Out of the cab and back on the sidewalk at `to`. */
function leave(player: Player, seat: object, to: Vec2) {
  if (player.seat === seat) player.seat = null;
  player.walk.target = null;
  placePlayer(player, to[0], to[1]);
  if (cameraHold.by === "city-taxi") cameraHold.by = null;
}
