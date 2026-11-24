// The active lane roster thins overnight, with changes outside the player bubble.
import type { Vec2 } from "../walk.ts";
import { carPose, type Traffic, type TrafficCar } from "./traffic.ts";

const pose = { x: 0, z: 0, yaw: 0 };

/** Keep one roster for simulation and drawing. The reserve keeps stable IDs. */
export function updateAmbientTraffic(
  traffic: Traffic,
  fleet: readonly TrafficCar[],
  limit: number,
  at: Vec2,
  range: number,
  cab: TrafficCar | null,
): void {
  const cars = traffic.cars;
  const last = cars.at(-1);
  if (last && fleet[last.id] !== last) cars.pop();
  if (cars.length === fleet.length && limit === fleet.length) {
    if (cab) cars.push(cab);
    return;
  }
  for (const car of fleet) {
    const wanted =
      car.id < limit || car.kind === "heavy" || car.body === "taxi";
    const index = cars.indexOf(car);
    if (wanted === index >= 0) continue;
    carPose(car, pose);
    if (Math.hypot(pose.x - at[0], pose.z - at[1]) <= range) continue;
    if (wanted) {
      let slot = cars.length;
      while (slot > 0 && cars[slot - 1].id > car.id) {
        cars[slot] = cars[slot - 1];
        slot--;
      }
      cars[slot] = car;
    } else {
      cars.copyWithin(index, index + 1);
      cars.pop();
    }
  }
  if (cab) cars.push(cab);
}
