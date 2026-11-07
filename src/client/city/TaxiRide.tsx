// Hailing a taxi. Hail on foot and a cab (one of the street's traffic cars, in
// the right-hand lane, stopping for lights and the car ahead) rolls in and
// stops at the curb beside her; she gets in, the city map opens for a
// destination (the Overlay charges the fare), and the cab drives the real
// streets there with the camera behind it. She can skip the ride. The doll
// rides on `player.seat`, like the bus; the city streams around wherever the
// cab is. Nothing is allocated per frame: the pose and the seat are made once.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onRoad } from "../../game/city/drive.ts";
import { curbPoint } from "../../game/city/taxi.ts";
import { cabAtCurb, cabToward, carPose } from "../../game/city/traffic.ts";
import type { Vec2 } from "../../game/walk.ts";
import { playDoorThunk, startEngineHum } from "../../audio/worldSounds.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { driving } from "../world/driving.ts";
import { isSceneReady } from "../world/ready.ts";
import { driverSays, resetTaxiRide, taxiCab, taxiRide } from "./taxiStore.ts";

/** She must be this close to the curb for the cab to take her (meters). */
const BOARD_RANGE = 24;
/** The cab's traffic id: 1 mod 4 draws the taxi model (Traffic.tsx). */
const CAB_ID = 401;
/** Where in the cab she sits: meters behind its center. She sits low, so the
 * roof hides all but her head and shoulders. */
const BACK_SEAT = 0.9;

export function TaxiRide({ player }: { player: Player }) {
  const seat = useMemo(
    () => ({ position: new THREE.Vector3(), yaw: 0, sit: true }),
    [],
  );
  const eye = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const carried = useMemo<[number, number]>(() => [0, 0], []);
  const pose = useMemo(() => ({ x: 0, z: 0, yaw: 0 }), []);
  const chatter = useRef(0);
  const destination = useRef<Vec2>([0, 0]);
  /** Where she stood when she got in, for backing out. */
  const boarded = useRef<Vec2>([0, 0]);
  const hum = useRef<(() => void) | null>(null);

  const stopHum = () => {
    hum.current?.();
    hum.current = null;
  };
  /** The cab leaves the street. */
  const sendOff = () => {
    taxiCab.car = null;
    stopHum();
  };

  // leaving the city (or a StrictMode remount) must not leave a ride behind
  useEffect(
    () => () => {
      if (player.seat === seat) player.seat = null;
      if (cameraHold.by === "city-taxi") cameraHold.by = null;
      taxiCab.car = null;
      hum.current?.();
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
    const cab = taxiCab.car;

    if (phase === "idle") {
      const canHail =
        !busy && !player.seat && !onRoad([player.pos.x, player.pos.z], 1);
      if (canHail !== taxiRide.get().canHail) taxiRide.set({ canHail });
      if (request === "hail" && canHail) {
        const here: Vec2 = [player.pos.x, player.pos.z];
        const curb = curbPoint(here);
        taxiCab.car = cabAtCurb(CAB_ID, curb, here);
        taxiRide.set({
          phase: "arriving",
          canHail: false,
          from: curb,
          fare: 0,
        });
        driverSays("greeting-first");
      }
    } else if (!cab) {
      // the scene lost the cab: the trip is off
      if (player.seat === seat) leave(player, seat, boarded.current);
      stopHum();
      taxiRide.set({ phase: "idle" });
    } else if (phase === "arriving") {
      carPose(cab, pose);
      const near =
        Math.hypot(player.pos.x - pose.x, player.pos.z - pose.z) < BOARD_RANGE;
      if (request === "cancel" || busy || (cab.trip?.arrived && !near)) {
        sendOff();
        taxiRide.set({ phase: "idle" });
      } else if (cab.trip?.arrived) {
        boarded.current = [player.pos.x, player.pos.z];
        player.walk.target = null;
        player.sitting = false;
        player.seat = seat;
        cameraHold.by = "city-taxi";
        taxiRide.set({ phase: "choosing" });
        void playDoorThunk();
        driverSays("tapped");
      }
    } else if (phase === "choosing") {
      if (request === "cancel" || player.seat !== seat) {
        if (player.seat === seat) void playDoorThunk();
        leave(player, seat, boarded.current);
        sendOff();
        taxiRide.set({ phase: "idle" });
      } else if (request && typeof request === "object") {
        destination.current = request.go.position;
        cabToward(cab, request.go.position);
        chatter.current = 4;
        stopHum();
        hum.current = startEngineHum();
        taxiRide.set({ phase: "riding" });
      }
    } else {
      // riding
      chatter.current -= delta;
      if (chatter.current <= 0) {
        chatter.current = 9;
        driverSays("idle");
      }
      if (request === "skip" || cab.trip?.arrived || player.seat !== seat) {
        leave(player, seat, destination.current);
        void playDoorThunk();
        sendOff();
        taxiRide.set({ phase: "idle" });
        driverSays("goodbye");
      }
    }

    // carry her in the cab and put the camera behind it
    const now = taxiRide.get().phase;
    const riding = taxiCab.car;
    if (riding && (now === "choosing" || now === "riding")) {
      if (player.seat === seat) {
        carPose(riding, pose);
        const dx = Math.cos(pose.yaw),
          dz = -Math.sin(pose.yaw);
        const x = pose.x - dx * BACK_SEAT,
          z = pose.z - dz * BACK_SEAT;
        carried[0] = x;
        carried[1] = z;
        player.walk.pos = carried;
        player.before.pos = carried;
        player.pos.set(x, 0, z);
        player.acc = 0;
        seat.position.set(x, 0.2, z);
        seat.yaw = pose.yaw + Math.PI / 2;
        eye.set(pose.x - dx * 11 - dz * 4, 5.5, pose.z - dz * 11 + dx * 4);
        aim.set(pose.x + dx * 3, 1.4, pose.z + dz * 3);
        camera.position.copy(eye);
        camera.lookAt(aim);
      }
    }
    gl.domElement.dataset.taxi = now;
  });
  return null;
}

/** Out of the cab and back on the sidewalk at `to`. */
function leave(player: Player, seat: object, to: Vec2) {
  if (player.seat === seat) player.seat = null;
  player.walk.target = null;
  placePlayer(player, to[0], to[1]);
  if (cameraHold.by === "city-taxi") cameraHold.by = null;
}
