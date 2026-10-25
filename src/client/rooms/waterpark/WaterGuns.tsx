// The water-gun battle on the wave pool: rubber ducks, ring floats and star
// floats bob across three rows; the player stands on the deck aiming a toy
// water pistol (the aim-pistol clip, turned to the aim); a ring on the water
// shows where the squirt lands; each squirt arcs out as a jet of drops and
// splashes, and a soaked floatie spins up out of the water. Mouse and touch
// aim over the water and squirt on a click or tap. The session
// (waterGunSession.ts) keeps the battle.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { playSplash, playSquirt } from "../../../audio/worldSounds.ts";
import { ballAt, lobIn, type Vec3 } from "../../../game/motion/ball.ts";
import { POOL } from "../../../game/waterPark.ts";
import { floatieAt, type Target } from "../../../game/waterGuns.ts";
import { useReducedMotion } from "../../motion.ts";
import type { Player } from "../../world/PlayerController.tsx";
import type { BurstHandle } from "../shared/game3d/Burst.tsx";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { Splash } from "../shared/game3d/Splash.tsx";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { POOL_CENTER, waveAt } from "./Pool.tsx";
import { aimAt, battleTime, fire, waterGuns } from "./waterGunSession.ts";

/** Where the player stands on the deck, at the pool's near edge. */
const STAND: Vec3 = [POOL_CENTER[0], 0, POOL.z1 + 0.9];
/** The pistol's muzzle, relative to her feet: chest high, arms out. */
const MUZZLE_UP = 1.32;
const MUZZLE_OUT = 0.62;
/** A squirt's flight time, s, and the jet's drops. */
const JET = 0.45;
const DROPS = 14;
/** How long a soaked floatie spins up before it's gone, s. */
const SPIN = 1.1;

const KINDS = ["duck", "can", "star"] as const;
const COLORS: Record<(typeof KINDS)[number], string> = {
  duck: "#ffd23f",
  can: "#ff7a3d",
  star: "#ff5fc8",
};

/** A rubber duck: a round body and a head up at the front, one mesh. */
function duckGeometry() {
  const body = new THREE.SphereGeometry(0.22, 12, 8).scale(1, 0.75, 1.25);
  const head = new THREE.SphereGeometry(0.13, 10, 8).translate(0, 0.2, 0.16);
  const tail = new THREE.ConeGeometry(0.08, 0.16, 8)
    .rotateX(-Math.PI / 3)
    .translate(0, 0.1, -0.27);
  const merged = mergeGeometries([body, head, tail]);
  body.dispose();
  head.dispose();
  tail.dispose();
  return merged ?? new THREE.SphereGeometry(0.22, 12, 8);
}

/** A five-pointed star float, puffy. */
function starGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.13 : 0.3;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();
const at: Vec3 = [0, 0, 0];

/** The floaties of one kind, bobbing in their rows; soaked ones spin up. */
function Floaties({ kind }: { kind: (typeof KINDS)[number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  const geometry = useMemo(
    () =>
      kind === "duck"
        ? duckGeometry()
        : kind === "can"
          ? new THREE.TorusGeometry(0.26, 0.1, 8, 18).rotateX(Math.PI / 2)
          : starGeometry(),
    [kind],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  // when each floatie was soaked (performance.now()), to spin it up
  const soakedAt = useRef(new Map<number, number>());
  useFrame(({ clock }) => {
    const im = mesh.current;
    const s = waterGuns.get();
    if (!im) return;
    im.visible = s.phase !== "off";
    if (!im.visible) return;
    const now = performance.now();
    const t = s.phase === "playing" ? battleTime(now) : 0;
    const shot = s.shot;
    if (shot?.soaked && !soakedAt.current.has(shot.soaked.id))
      soakedAt.current.set(shot.soaked.id, shot.when);
    let i = 0;
    for (const target of s.battle.targets) {
      if (target.kind !== kind) continue;
      place(target, t, now, clock.elapsedTime, calm, soakedAt.current);
      im.setMatrixAt(i++, m);
    }
    im.count = i;
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, 5 * 3]}
      frustumCulled={false}
      visible={false}
    >
      <meshStandardMaterial color={COLORS[kind]} roughness={0.35} />
    </instancedMesh>
  );
}

/** One floatie's matrix into `m`: bobbing on the waves, or spinning up out
 * of the water once soaked (then gone until the pool restocks). */
function place(
  target: Target,
  t: number,
  now: number,
  clock: number,
  calm: boolean,
  soaked: Map<number, number>,
) {
  const [x, z] = floatieAt(target, t);
  const wave = calm ? 0 : waveAt(x - POOL_CENTER[0], z - POOL_CENTER[1], clock);
  const when = soaked.get(target.id);
  const k = when === undefined ? -1 : (now - when) / 1000 / SPIN;
  if (!target.hit) soaked.delete(target.id);
  if (target.hit && (k < 0 || k >= 1)) {
    m.makeScale(0, 0, 0);
    return;
  }
  const spin = k >= 0 ? k * Math.PI * 6 : 0;
  const lift = k >= 0 ? Math.sin(k * Math.PI) * 0.9 : 0;
  e.set(calm ? 0 : Math.sin(clock * 1.3 + target.id) * 0.12, spin, 0);
  q.setFromEuler(e);
  v.set(x, POOL.water + 0.06 + wave + lift, z);
  const s = k >= 0 ? 1 - k * 0.6 : 1;
  sc.set(s, s, s);
  m.compose(v, q, sc);
}

const RING = new THREE.Color("#ffffff").multiplyScalar(2);

/** The aim ring on the water. */
function AimRing() {
  const mesh = useRef<THREE.Mesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    const r = mesh.current;
    const s = waterGuns.get();
    if (!r) return;
    r.visible = s.phase === "playing";
    if (!r.visible) return;
    r.position.set(s.aim[0], POOL.water + 0.1, s.aim[1]);
    const pulse = calm ? 1 : 1 + Math.sin(clock.elapsedTime * 6) * 0.08;
    r.scale.set(pulse, pulse, pulse);
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.32, 0.42, 28]} />
      <meshBasicMaterial
        color={RING}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/** The jet of drops from the muzzle to where the squirt lands. */
function Jet({ splash }: { splash: RefObject<BurstHandle | null> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seen = useRef(0);
  const flight = useRef(lobIn([0, 0, 0], [0, 0, 1], JET));
  const splashed = useRef(0);
  useFrame(() => {
    const im = mesh.current;
    const s = waterGuns.get();
    if (!im) return;
    const shot = s.shot;
    if (!shot) {
      im.visible = false;
      return;
    }
    if (seen.current !== shot.n) {
      seen.current = shot.n;
      const yaw = Math.atan2(shot.at[0] - STAND[0], shot.at[1] - STAND[2]);
      flight.current = lobIn(
        [
          STAND[0] + Math.sin(yaw) * MUZZLE_OUT,
          MUZZLE_UP,
          STAND[2] + Math.cos(yaw) * MUZZLE_OUT,
        ],
        [shot.at[0], POOL.water + 0.1, shot.at[1]],
        JET,
      );
      playSquirt();
    }
    const age = (performance.now() - shot.when) / 1000;
    im.visible = age < JET + 0.1;
    if (age >= JET && splashed.current !== shot.n) {
      splashed.current = shot.n;
      splash.current?.fire(
        shot.at[0],
        POOL.water + 0.05,
        shot.at[1],
        shot.soaked ? 0.9 : 0.5,
      );
      playSplash(shot.soaked ? 0.45 : 0.25);
    }
    if (!im.visible) return;
    for (let i = 0; i < DROPS; i++) {
      // the drops trail back along the arc from its head
      const t = Math.max(0, Math.min(JET, age - (i / DROPS) * 0.12));
      ballAt(flight.current, t, at);
      v.set(at[0], at[1], at[2]);
      const r = 0.085 * (1 - i / DROPS) + 0.03;
      sc.set(r, r, r);
      m.compose(v, q.identity(), sc);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, DROPS]}
      frustumCulled={false}
      visible={false}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial
        color="#e6f8ff"
        emissive="#9fe4ff"
        emissiveIntensity={1.2}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}

/** The toy water pistol, held out in front of her, turned to the aim. */
function Pistol() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    const s = waterGuns.get();
    if (!g) return;
    g.visible = s.phase === "playing";
    if (!g.visible) return;
    const yaw = Math.atan2(s.aim[0] - STAND[0], s.aim[1] - STAND[2]);
    g.position.set(
      STAND[0] + Math.sin(yaw) * (MUZZLE_OUT - 0.18),
      MUZZLE_UP - 0.04,
      STAND[2] + Math.cos(yaw) * (MUZZLE_OUT - 0.18),
    );
    g.rotation.set(0, yaw, 0);
  });
  return (
    <group ref={group} visible={false}>
      {/* barrel, tank and grip in toy colors */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.07, 0.08, 0.3]} />
        <meshStandardMaterial color="#3fc2ff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.09, 0.02]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.16, 12]} />
        <meshStandardMaterial
          color="#ff5fc8"
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, -0.08, -0.03]} rotation-x={0.3}>
        <boxGeometry args={[0.06, 0.14, 0.07]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** The battle on the pool: floaties, aim ring, jet, pistol, player, camera. */
export function WaterGuns({ player }: { player: Player }) {
  const s = waterGuns.use();
  const playing = s.phase === "playing";
  const splash = useRef<BurstHandle>(null);
  useGameClip("water-guns", playing ? "aim-pistol" : null);
  const eye = useMemo<Vec3>(() => [STAND[0] + 0.8, 2.7, STAND[2] + 3.6], []);
  const target = useMemo<Vec3>(
    () => [POOL_CENTER[0], 0, POOL_CENTER[1] - 0.5],
    [],
  );
  useGameShot("water-guns", s.phase !== "off", eye, target);
  // the player on the deck, turned to the aim
  const took = useRef<GameSeat | null>(null);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  useFrame(() => {
    const st = waterGuns.get();
    if (st.phase !== "playing") {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      return;
    }
    if (!took.current) {
      const mine: GameSeat = {
        position: new THREE.Vector3(...STAND),
        yaw: Math.PI,
      };
      if (!claimSeat(player, mine)) return;
      took.current = mine;
    }
    if (took.current)
      took.current.yaw = Math.atan2(st.aim[0] - STAND[0], st.aim[1] - STAND[2]);
  });
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    canvas.dataset.waterShots = String(s.shot?.n ?? 0);
    canvas.dataset.waterScore = String(s.battle.score);
  }, [canvas, s.shot, s.battle.score]);
  // mouse and touch: aim where the pointer is on the water, squirt on a tap
  const onMove = (ev: ThreeEvent<PointerEvent>) => {
    if (!playing) return;
    aimAt(ev.point.x, ev.point.z);
  };
  const onTap = (ev: ThreeEvent<MouseEvent>) => {
    if (!playing || ev.delta > 6) return;
    ev.stopPropagation();
    aimAt(ev.point.x, ev.point.z);
    fire(performance.now());
  };
  return (
    <>
      {KINDS.map((k) => (
        <Floaties key={k} kind={k} />
      ))}
      <AimRing />
      <Pistol />
      <Jet splash={splash} />
      <Splash ref={splash} />
      {playing && (
        // an invisible sheet over the water that catches the pointer
        <mesh
          position={[POOL_CENTER[0], POOL.water + 0.12, POOL_CENTER[1]]}
          rotation-x={-Math.PI / 2}
          onPointerMove={onMove}
          onClick={onTap}
        >
          <planeGeometry args={[POOL.x1 - POOL.x0, POOL.z1 - POOL.z0]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
