// The player's own car lamps (CarMesh): one shared material whose gain follows
// the city's night, like the traffic's lamps (trafficBodies.ts). Outside the
// city nothing sets it and the lamps keep their plain color.
import * as THREE from "three";
import { lampGain } from "../../game/city/daylight.ts";

/** Vertex color carries the lamp hue; the gain pushes it past 1 for the bloom. */
export const CAR_LAMP = new THREE.MeshBasicMaterial({
  vertexColors: true,
  toneMapped: false,
});

/** Brightens or dims every car lamp for the hour (`neon`: 0 day, 1 night). */
export function setCarLampGlow(neon: number): void {
  CAR_LAMP.color.setScalar(lampGain(neon));
}
