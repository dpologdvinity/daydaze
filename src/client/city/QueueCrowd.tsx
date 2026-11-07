// The people waiting outside the clubs (src/game/city/queues.ts): Kenney Mini
// Characters (CC0) baked standing by art/speedway/build_people.py, one
// instanced mesh per look. Only the queues near the player are placed, when
// the plan reloads; nothing runs per frame.

import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  QUEUE_LOOKS,
  QUEUE_NEAR,
  QUEUE_NEAR_LOW,
  QUEUE_SPOTS,
  type QueueLook,
  type QueueSpot,
} from "../../game/city/queues.ts";
import { hash } from "../../game/city/hash.ts";
import { PERSON_SCALE, usePersonAt } from "../rooms/speedway/peopleModel.ts";
import { useQuality } from "../world/quality.ts";
import { cityFurniture } from "./CityFurniture.tsx";

/** Standing on the forecourt slab. */
const GROUND = 0.1;

const url = (look: QueueLook) => `/models/speedway/people-${look}-idle.glb`;
const spotsOf = (look: QueueLook) => QUEUE_SPOTS.filter((s) => s.look === look);
const dummy = new THREE.Object3D();

/** One look: an instanced mesh of the queued people wearing it who are near. */
function Look({
  look,
  near,
  at,
}: {
  look: QueueLook;
  near: number;
  at: readonly [number, number];
}): JSX.Element | null {
  const person = usePersonAt(url(look));
  const mine = useMemo(() => spotsOf(look), [look]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let n = 0;
    for (const s of mine as readonly QueueSpot[]) {
      if (Math.hypot(s.x - at[0], s.z - at[1]) > near) continue;
      dummy.position.set(s.x, GROUND, s.z);
      dummy.rotation.set(0, s.yaw, 0);
      // a little taller or shorter, so a line is not a row of twins
      dummy.scale.setScalar(PERSON_SCALE * (0.94 + hash(s.x, s.z, 5) * 0.12));
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }, [person, mine, near, at]);
  if (!person || mine.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[person.geometry, person.material, mine.length]}
      frustumCulled={false}
    />
  );
}

export function QueueCrowd(): JSX.Element {
  const low = useQuality() === "low";
  const { at } = cityFurniture.use();
  return (
    <>
      {QUEUE_LOOKS.map((look) => (
        <Look
          key={look}
          look={look}
          near={low ? QUEUE_NEAR_LOW : QUEUE_NEAR}
          at={at}
        />
      ))}
    </>
  );
}
