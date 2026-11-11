// The four wheels of a downloaded car body (CarMesh): the body GLB's lone wheel
// (tyre and hub meshes, public/models/cars/) instanced at each axle by
// BODY_WHEELS, two draws for the lot. They turn by the road the car has
// rolled and the front pair steers, both read from how the car's own
// transform moved since the last frame, so the same wheels serve your car, a
// remote player's and a showroom turntable without the parent passing speed.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { BufferGeometry, InstancedMesh, Material } from "three";
import { Matrix4 } from "three";
import type { BodyKey } from "../../../game/driving/bodies.ts";
import { BODY_WHEELS, steerAngle } from "../../../game/driving/wheels.ts";
import { WHEELS_PER_CAR, wheelMatrix } from "../../city/wheelPlacement.ts";

/** A car that moved further than this in one frame was placed, not driven. */
const TELEPORT = 10;
/** How fast the front wheels follow the steering, per second. */
const STEER_EASE = 12;

const matrix = new Matrix4();

type Motion = {
  x: number;
  z: number;
  yaw: number;
  /** Body-frame meters rolled, and the eased steering angle. */
  travel: number;
  steer: number;
};

/**
 * Place inside the body's scaled group: the instanced meshes sit at its origin,
 * so their world matrix is the car's, and the layout is in body units.
 */
export function CarWheels({
  body,
  tyre,
  rim,
  tyreMaterial,
  rimMaterial,
}: {
  body: BodyKey;
  tyre: BufferGeometry | undefined;
  rim: BufferGeometry | undefined;
  tyreMaterial: Material;
  rimMaterial: Material;
}) {
  const tyres = useRef<InstancedMesh>(null);
  const rims = useRef<InstancedMesh>(null);
  const motion = useRef<Motion>({
    x: Number.NaN,
    z: Number.NaN,
    yaw: 0,
    travel: 0,
    steer: 0,
  });
  const layout = BODY_WHEELS[body];

  useFrame((_, dt) => {
    const mesh = tyres.current;
    if (!mesh) return;
    // the world matrix of the last render: the car's position, and its nose
    // (the z column, as long as the scale)
    const e = mesh.matrixWorld.elements;
    const hx = e[8];
    const hz = e[10];
    const scale = Math.hypot(hx, hz) || 1;
    const m = motion.current;
    const yaw = Math.atan2(hx, hz);
    let ds = 0;
    let dYaw = 0;
    if (!Number.isNaN(m.x)) {
      const rolled = ((e[12] - m.x) * hx + (e[14] - m.z) * hz) / scale;
      if (Math.abs(rolled) < TELEPORT) {
        ds = rolled / scale;
        dYaw = yaw - m.yaw;
      }
    }
    m.x = e[12];
    m.z = e[14];
    m.yaw = yaw;
    m.travel += ds;
    m.steer +=
      (steerAngle(layout.frontZ - layout.rearZ, dYaw, ds) - m.steer) *
      Math.min(1, dt * STEER_EASE);
    for (let i = 0; i < WHEELS_PER_CAR; i++) {
      wheelMatrix(matrix, layout, i, m.travel, m.steer);
      mesh.setMatrixAt(i, matrix);
      rims.current?.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (rims.current) rims.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {tyre && (
        <instancedMesh
          ref={tyres}
          args={[tyre, undefined, WHEELS_PER_CAR]}
          material={tyreMaterial}
          frustumCulled={false}
        />
      )}
      {rim && (
        <instancedMesh
          ref={rims}
          args={[rim, undefined, WHEELS_PER_CAR]}
          material={rimMaterial}
          frustumCulled={false}
        />
      )}
    </>
  );
}
