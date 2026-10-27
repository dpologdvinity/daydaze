// Downloaded Line 1 bus and stops. The pure timetable owns motion; this scene
// validates requests, carries the existing ride seat, and follows with a camera.
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BUS_STOPS,
  busAt,
  canBoard,
  canGetOff,
  nextBusIn,
} from "../../game/city/transit.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { driving } from "../world/driving.ts";
import { isSceneReady } from "../world/ready.ts";
import { useQuality } from "../world/quality.ts";
import { busMotion, busRide } from "./busRide.ts";
import {
  useTransitModels,
  resetTransit,
  placeTransit,
  updateTransit,
  type TransitModel,
} from "./transitModels.ts";

const KINDS: readonly TransitModel[] = ["bus", "stop"];
export function CityTransit({ player }: { player: Player }) {
  const low = useQuality() === "low";
  const { models, all } = useTransitModels(KINDS, 4);
  const origin = useRef<number | null>(null);
  const riding = useRef(false);
  const lastStop = useRef(0);
  const seat = useMemo(
    () => ({ position: new THREE.Vector3(), yaw: 0, sit: true }),
    [],
  );
  const eye = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const at = useMemo<[number, number]>(() => [0, 0], []);
  const carried = useMemo<[number, number]>(() => [0, 0], []);
  const shown = busRide.use();
  useEffect(
    () => () => {
      riding.current = false;
      if (player.seat === seat) player.seat = null;
      if (cameraHold.by === "city-bus") cameraHold.by = null;
      busMotion.active = false;
      busMotion.request = null;
      busRide.set({ riding: false, near: -1, stop: -1 });
    },
    [player, seat],
  );
  useFrame(({ camera, gl }) => {
    if (!isSceneReady()) return;
    const now = performance.now() / 1000;
    if (origin.current === null) origin.current = now;
    const t = now - origin.current;
    busMotion.active = true;
    busMotion.seconds = t;
    const pose = busMotion.pose;
    at[0] = player.pos.x;
    at[1] = player.pos.z;
    let near = -1,
      distance = 10;
    for (let i = 0; i < BUS_STOPS.length; i++) {
      const s = BUS_STOPS[i];
      const d = Math.hypot(at[0] - s.at[0], at[1] - s.at[1]);
      if (d < distance) {
        near = i;
        distance = d;
      }
    }
    const request = busMotion.request;
    busMotion.request = null;
    if (
      request === "board" &&
      near >= 0 &&
      canBoard(
        pose,
        near,
        at,
        !!driving.session ||
          !!driving.passenger ||
          !!player.seat ||
          player.walk.leaving,
      )
    ) {
      riding.current = true;
      player.walk.target = null;
      player.sitting = false;
      player.seat = seat;
      cameraHold.by = "city-bus";
    }
    if (riding.current && pose.stop >= 0) lastStop.current = pose.stop;
    if (request === "leave" && riding.current && canGetOff(pose)) {
      riding.current = false;
      player.seat = null;
      player.walk.target = null;
      const s = BUS_STOPS[pose.stop];
      placePlayer(player, s.at[0], s.at[1]);
      cameraHold.by = null;
      near = pose.stop;
    }
    // Honor the stop the player saw when clicking, before advancing its clock.
    busAt(t, pose);
    if (riding.current) {
      // A fresh arrival or another interaction releasing the seat ends the ride.
      if (player.seat !== seat) {
        riding.current = false;
        cameraHold.by = null;
        const s = BUS_STOPS[lastStop.current];
        placePlayer(player, s.at[0], s.at[1]);
      } else {
        carried[0] = pose.x;
        carried[1] = pose.z;
        player.walk.pos = carried;
        player.before.pos = carried;
        player.pos.set(pose.x, 0, pose.z);
        player.acc = 0;
        seat.position.set(pose.x, 1.1, pose.z);
        seat.yaw = pose.yaw + Math.PI / 2;
        const dx = Math.cos(pose.yaw),
          dz = -Math.sin(pose.yaw);
        eye.set(pose.x - dx * 13 - dz * 6, 7, pose.z - dz * 13 + dx * 6);
        aim.set(pose.x + dx * 3, 1.7, pose.z + dz * 3);
        camera.position.copy(eye);
        camera.lookAt(aim);
      }
    }
    if (driving.session || driving.passenger) near = -1;
    // A readable sign within reach; boarding itself is restricted to four meters.
    if (near >= 0 && distance > 4 && !riding.current) near = -1;
    const eta = near < 0 ? 0 : Math.ceil(nextBusIn(t, near));
    const state = busRide.get();
    if (
      state.riding !== riding.current ||
      state.near !== near ||
      state.stop !== pose.stop ||
      state.next !== pose.next ||
      state.eta !== eta
    )
      busRide.set({
        riding: riding.current,
        near,
        stop: pose.stop,
        next: pose.next,
        eta,
      });
    resetTransit(all);
    placeTransit(
      models,
      0,
      pose.x,
      pose.z,
      pose.yaw,
      Math.hypot(pose.x - player.pos.x, pose.z - player.pos.z),
      low,
    );
    for (const s of BUS_STOPS)
      placeTransit(
        models,
        1,
        s.at[0],
        s.at[1],
        s.yaw,
        Math.hypot(s.at[0] - player.pos.x, s.at[1] - player.pos.z),
        low,
      );
    updateTransit(all);
    gl.domElement.dataset.busRide = riding.current ? "riding" : "on-foot";
    gl.domElement.dataset.busStop = String(pose.stop);
    gl.domElement.dataset.busX = pose.x.toFixed(2);
    gl.domElement.dataset.busZ = pose.z.toFixed(2);
  });
  const stop = BUS_STOPS[shown.near];
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {stop && !shown.riding && (
        <Html
          position={[stop.at[0], 3.6, stop.at[1]]}
          center
          distanceFactor={18}
          zIndexRange={[10, 0]}
        >
          <div className="bus-stop-sign">
            1 · {stop.name}
            <br />
            {shown.stop === shown.near
              ? "Doors open"
              : `Next bus in ${shown.eta} s`}
          </div>
        </Html>
      )}
    </>
  );
}
