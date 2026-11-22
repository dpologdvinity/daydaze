// The police car chase through downtown: squad cars pursuing a fleeing sports
// car with wailing sirens, flashing light bars, crash impact boom, and smoke
// billowing from the wrecked hood. Cars are drawn through Traffic.tsx; this
// handles roof light bars, crash smoke and spatial sound.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  playCrashBoom,
  startSiren,
  type DistantLoop,
} from "../../audio/worldSounds.ts";
import {
  blankChase,
  CHASE_COPS,
  chaseFrame,
  chaseInto,
} from "../../game/city/chase.ts";
import { useReducedMotion } from "../motion.ts";
import { pursuer } from "./PlayerPursuit.tsx";
import { chaseClock } from "./eventClocks.ts";

/** Distance meters audio can be heard from cars. */
const SIREN_RANGE = 420;
const CRASH_RANGE = 360;

/** Light bar on squad car roof (car nose faces +z in local frame). */
const BAR_Y = 1.62;
const BAR_SIDE = 0.32;
const FLASH = 0.18;
const BAR_SIDES = [-1, 1];

const RED = new THREE.Color("#ff2236").multiplyScalar(3);
const BLUE = new THREE.Color("#2a5bff").multiplyScalar(3);
const DIM_RED = new THREE.Color("#ff2236").multiplyScalar(0.25);
const DIM_BLUE = new THREE.Color("#2a5bff").multiplyScalar(0.25);
const SMOKE_COLOR = new THREE.Color("#9da3af");
const NOSE = Math.PI / 2;

const SMOKE_PUFFS = 4;

export function Chase() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const frame = useMemo(blankChase, []);
  const bars = useRef<THREE.InstancedMesh>(null);
  const smoke = useRef<THREE.InstancedMesh>(null);
  const siren = useRef<DistantLoop | null>(null);
  const crashedSlot = useRef(-1);

  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const local = useMemo(() => new THREE.Matrix4(), []);
  const turn = useMemo(() => new THREE.Quaternion(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const unit = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useEffect(
    () => () => {
      siren.current?.stop();
    },
    [],
  );

  useFrame(() => {
    const t = chaseClock();
    chaseFrame(t, frame);
    const live = chaseInto(t) !== null;
    const cx = camera.position.x;
    const cz = camera.position.z;

    // Siren sound: volume scaled from nearest squad car
    let nearestCop = Infinity;
    if (live && frame.siren) {
      for (let k = 0; k < CHASE_COPS; k++) {
        const cop = frame.cops[k];
        if (cop.visible) {
          nearestCop = Math.min(nearestCop, Math.hypot(cx - cop.x, cz - cop.z));
        }
      }
    }
    if (pursuer.cruiser)
      nearestCop = Math.min(
        nearestCop,
        Math.hypot(cx - pursuer.x, cz - pursuer.z),
      );
    if (nearestCop < SIREN_RANGE) {
      siren.current ??= startSiren();
      siren.current?.level((1 - nearestCop / SIREN_RANGE) ** 2);
    } else if (siren.current) {
      siren.current.stop();
      siren.current = null;
    }

    // Crash boom: triggered once when entering crashed state
    if (live && frame.crashed) {
      if (crashedSlot.current !== frame.slot) {
        crashedSlot.current = frame.slot;
        const toCrash = Math.hypot(
          cx - frame.crashPos[0],
          cz - frame.crashPos[1],
        );
        if (toCrash < CRASH_RANGE) {
          playCrashBoom((1 - toCrash / CRASH_RANGE) ** 2);
        }
      }
    } else {
      crashedSlot.current = -1;
    }

    // Light bars on squad cars
    const swap = Math.floor(t / FLASH) % 2 === 0;
    const barMesh = bars.current;
    if (barMesh) {
      let n = 0;
      for (let k = 0; k <= CHASE_COPS; k++) {
        const cop = k === CHASE_COPS ? pursuer : frame.cops[k];
        const lit =
          k === CHASE_COPS
            ? pursuer.cruiser
            : live && frame.lights && frame.cops[k].visible && frame.lit[k];
        if (!lit) continue;
        matrix.compose(
          at.set(cop.x, 0, cop.z),
          turn.setFromAxisAngle(up, cop.yaw + NOSE),
          unit,
        );
        for (const side of BAR_SIDES) {
          local.makeTranslation(side * BAR_SIDE, BAR_Y, 0);
          barMesh.setMatrixAt(n, local.premultiply(matrix));
          const red = side < 0;
          const bright = calm || (red ? swap : !swap);
          barMesh.setColorAt(
            n,
            red ? (bright ? RED : DIM_RED) : bright ? BLUE : DIM_BLUE,
          );
          n++;
        }
      }
      barMesh.count = n;
      barMesh.visible = n > 0;
      barMesh.instanceMatrix.needsUpdate = true;
      if (barMesh.instanceColor) barMesh.instanceColor.needsUpdate = true;
    }

    // Smoke from crashed car hood
    const smokeMesh = smoke.current;
    if (smokeMesh) {
      let count = 0;
      if (live && frame.crashed) {
        const fleeing = frame.fleeing;
        const hoodX = fleeing.x + Math.cos(fleeing.yaw) * 1.5;
        const hoodZ = fleeing.z - Math.sin(fleeing.yaw) * 1.5;
        for (let i = 0; i < SMOKE_PUFFS; i++) {
          const u = calm ? 0.3 * (i + 1) : (t * 0.7 + i * 0.25) % 1.0;
          const py = 0.8 + u * 1.8;
          const px = hoodX + Math.cos(i * 1.6) * (u * 0.3);
          const pz = hoodZ + Math.sin(i * 1.6) * (u * 0.3);
          const s = 0.5 + u * 1.1;
          matrix.compose(
            at.set(px, py, pz),
            turn.identity(),
            scale.set(s, s, s),
          );
          smokeMesh.setMatrixAt(count, matrix);
          smokeMesh.setColorAt(count, SMOKE_COLOR);
          count++;
        }
      }
      smokeMesh.count = count;
      smokeMesh.visible = count > 0;
      smokeMesh.instanceMatrix.needsUpdate = true;
      if (smokeMesh.instanceColor) smokeMesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={bars}
        args={[undefined, undefined, (CHASE_COPS + 1) * 2]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[0.5, 0.12, 0.26]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={smoke}
        args={[undefined, undefined, SMOKE_PUFFS]}
        frustumCulled={false}
        visible={false}
      >
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial
          color={SMOKE_COLOR}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
