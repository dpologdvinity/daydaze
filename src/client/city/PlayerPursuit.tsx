// A local police unit responds to player heat. Traffic and Chase reuse its pose
// for the cruiser body, lights and siren.
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { Group } from "three";
import { CITY_AREA } from "../../game/city/layout.ts";
import { clampToArea } from "../../game/area.ts";
import { DEFAULT_LOOK } from "../../game/look.ts";
import type { Vec2 } from "../../game/walk.ts";
import {
  CAPTURE_MS,
  captureTime,
  hasPoliceSight,
  responseFor,
  starsOf,
} from "../../game/wanted/wanted.ts";
import { Doll } from "../avatar/Doll.tsx";
import { setData } from "../world/dataset.ts";
import { driving } from "../world/driving.ts";
import { captureWanted, heat, tickHeat, wantedHud } from "../world/heat.ts";
import type { Player } from "../world/PlayerController.tsx";

const TICK_MS = 50;
const OFFICER_SPEED = 2.1;
const CRUISER_SPEED = 14;
const OFFICER_LOOK = { ...DEFAULT_LOOK, outfitColor: "#172c50" };

export const pursuer = { cruiser: false, x: 0, z: 0, yaw: 0, travel: 0 };

function spawnNear(target: Vec2, heading: number): Vec2 | null {
  for (const distance of [17, 12, 8]) {
    for (let i = 0; i < 8; i++) {
      const angle = heading + (i * Math.PI) / 4;
      const at = clampToArea(CITY_AREA, [
        target[0] - Math.sin(angle) * distance,
        target[1] - Math.cos(angle) * distance,
      ]);
      if (
        Math.hypot(at[0] - target[0], at[1] - target[1]) >= 7 &&
        hasPoliceSight(at, target, CITY_AREA.blockers)
      )
        return at;
    }
  }
  return null;
}

export function PlayerPursuit({ player }: { player: Player }) {
  const { stars } = wantedHud.use();
  const canvas = useThree((s) => s.gl.domElement);
  const officer = useRef<Group>(null);
  const walk = useRef({ speed: 0 });

  useEffect(() => {
    let unit: [number, number] | null = null;
    let captureMs = 0;
    let respondingInCar = false;
    let nextDispatch = 0;
    let previous = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(150, now - previous);
      previous = now;
      const stars = starsOf(heat.state);
      setData(canvas.dataset, "heat", heat.state.heat.toFixed(0));
      if (stars === 0) {
        unit = null;
        captureMs = 0;
        pursuer.cruiser = false;
        if (officer.current) officer.current.visible = false;
        return;
      }
      const car = driving.session?.kind === "city" ? driving.session.car : null;
      const onWheels = car !== null;
      const target: Vec2 = car?.position ?? player.walk.pos;
      if (!unit && now >= nextDispatch) {
        nextDispatch = now + 500;
        const start = spawnNear(target, player.yaw);
        unit = start && [start[0], start[1]];
      }
      if (onWheels !== respondingInCar) captureMs = 0;
      respondingInCar = onWheels;

      let sees = false;
      let distance = Infinity;
      if (unit) {
        const dx = target[0] - unit[0];
        const dz = target[1] - unit[1];
        distance = Math.hypot(dx, dz);
        sees =
          !player.seat?.inside &&
          distance <= responseFor(stars).sightRadius &&
          hasPoliceSight(unit, target, CITY_AREA.blockers);
        const speed = respondingInCar ? CRUISER_SPEED : OFFICER_SPEED;
        const step = sees
          ? Math.min(Math.max(0, distance - 2.4), (speed * dt) / 1000)
          : 0;
        if (step > 0) {
          pursuer.yaw = Math.atan2(-dz, dx);
          unit[0] += (step * dx) / distance;
          unit[1] += (step * dz) / distance;
          distance -= step;
        }
        pursuer.x = unit[0];
        pursuer.z = unit[1];
        pursuer.travel += step;
        walk.current.speed = step > 0 ? speed : 0;
      }
      pursuer.cruiser = unit !== null && respondingInCar;
      const group = officer.current;
      if (group) group.visible = unit !== null && !respondingInCar;
      tickHeat(dt, sees);
      captureMs = captureTime(
        captureMs,
        dt,
        distance,
        car?.speed ?? null,
        sees,
      );
      if (captureMs >= CAPTURE_MS) captureWanted(Date.now());
    };
    const timer = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(timer);
      pursuer.cruiser = false;
      tickHeat(0, false);
    };
  }, [canvas, player]);

  useFrame(() => {
    const group = officer.current;
    if (!group) return;
    group.position.set(pursuer.x, 0, pursuer.z);
    group.rotation.y = pursuer.yaw + Math.PI / 2;
  });

  return stars > 0 ? (
    <Suspense fallback={null}>
      <group ref={officer} visible={false}>
        <Doll look={OFFICER_LOOK} mood="idle" walk={walk} seed={78} />
      </group>
    </Suspense>
  ) : null;
}
