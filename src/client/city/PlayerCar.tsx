import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { carExtras } from "./carExtras.ts";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { clampToArea } from "../../game/area.ts";
import {
  exitPoint,
  modsOf,
  REACH,
  type ParkedCar,
} from "../../game/city/drive.ts";
import { CITY_AREA } from "../../game/city/layout.ts";
import { advance } from "../../game/driving/fixedStep.ts";
import { carById, ROAD_CARS } from "../../game/driving/roster.ts";
import {
  startCity,
  stepSession,
  type CitySession,
} from "../../game/speedway/session.ts";
import { CarMesh } from "../rooms/speedway/CarMesh.tsx";
import { ChaseCamera } from "../rooms/speedway/ChaseCamera.tsx";
import { driving, releaseControls } from "../world/driving.ts";
import {
  placePlayer,
  walkTo,
  type Player,
} from "../world/PlayerController.tsx";

const FALLBACK = ROAD_CARS[0];

/**
 * Your own car on the city streets: parked where you left it until the
 * dock's Drive button (or a tap on it) walks you over and puts you behind
 * the wheel. The chase camera follows; Leave the car parks it where it
 * stands and you step out onto the sidewalk side.
 */
export function PlayerCar({
  player,
  parked,
  onPark,
}: {
  player: Player;
  parked: ParkedCar;
  onPark: (car: ParkedCar) => void;
}) {
  const { lights } = carExtras.use();
  const canvas = useThree((s) => s.gl.domElement);
  const group = useRef<Group>(null);
  const spec = carById(parked.id) ?? FALLBACK;
  // walking over to the car, to get in on arrival
  const heading = useRef(false);
  const session = useRef<CitySession | null>(null);
  const live = useRef(false);
  const onParkRef = useRef(onPark);
  onParkRef.current = onPark;

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      if (driving.session?.kind === "city") driving.session = null;
      session.current = null;
      releaseControls();
    };
  }, []);

  const getIn = () => {
    if (!spec) return;
    const s = startCity(
      spec,
      parked.color,
      parked.at,
      parked.yaw,
      parked.fuel,
      modsOf(parked),
    );
    session.current = s;
    driving.session = s;
    heading.current = false;
    releaseControls();
  };

  const getOut = (s: CitySession) => {
    driving.session = null;
    session.current = null;
    releaseControls();
    const [x, z] = clampToArea(CITY_AREA, exitPoint(s.car));
    placePlayer(player, x, z);
    onParkRef.current({
      ...s.mods,
      id: s.spec.id,
      color: s.color,
      at: s.car.position,
      yaw: s.car.yaw,
      fuel: s.fuel,
    });
  };

  useFrame((_, dt) => {
    if (!live.current) return;
    const g = group.current;
    const near =
      Math.hypot(
        player.walk.pos[0] - parked.at[0],
        player.walk.pos[1] - parked.at[1],
      ) <= REACH;
    const request = driving.request;
    if (request === "city-drive" || request === "leave") {
      driving.request = null;
      if (request === "leave") {
        if (session.current) getOut(session.current);
      } else if (!session.current) {
        if (near) getIn();
        else {
          heading.current = true;
          walkTo(
            player,
            CITY_AREA,
            exitPoint({ position: parked.at, yaw: parked.yaw, speed: 0 }),
          );
        }
      }
    }
    // a new tap or key took the player elsewhere: forget the car
    if (heading.current && !session.current) {
      if (near) getIn();
      else if (!player.walk.target) heading.current = false;
    }
    canvas.dataset.cityCar = session.current ? "driving" : "parked";
    const s = session.current;
    if (!g) return;
    if (!s) {
      g.visible = true;
      g.position.set(parked.at[0], 0, parked.at[1]);
      g.rotation.y = parked.yaw;
      return;
    }
    const alpha = advance(s.clock, dt, () => stepSession(s, driving.input));
    const a = s.prev;
    const b = s.car;
    const x = a.position[0] + (b.position[0] - a.position[0]) * alpha;
    const z = a.position[1] + (b.position[1] - a.position[1]) * alpha;
    const turn = b.yaw - a.yaw;
    g.visible = true;
    g.position.set(x, 0, z);
    g.rotation.y = a.yaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * alpha;
    // the city streams around (and traffic yields to) wherever the car is
    placePlayer(player, x, z);
    canvas.dataset.carX = x.toFixed(1);
    canvas.dataset.carZ = z.toFixed(1);
  });

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || session.current) return;
    e.stopPropagation();
    driving.request = "city-drive";
  };

  return (
    <group onClick={tap}>
      {spec && (
        <CarMesh
          key={`${spec.id}${parked.color}`}
          spec={spec}
          color={parked.color}
          mods={parked}
          beams={lights}
          ref={group}
        />
      )}
      <ChaseCamera target={group} />
    </group>
  );
}
