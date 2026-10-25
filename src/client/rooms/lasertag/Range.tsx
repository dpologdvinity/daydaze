// Photon Zone's target range on the arena's north wall: three neon rails
// with glowing discs, diamonds and stars sliding along them; the player at
// the line holding a light pistol or rifle (the aim clips, turned to the
// aim); a crosshair on the wall; each shot a beam of light, and a hit bursts
// into sparks while the target spins away. Mouse and touch aim over the wall
// and fire on a click or tap. The session (rangeSession.ts) keeps the drill.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playChime, playZap } from "../../../audio/worldSounds.ts";
import { ARENA } from "../../../game/laserTag.ts";
import type { Vec3 } from "../../../game/motion/ball.ts";
import {
  RAIL_Y,
  RAIL_Z,
  targetAt,
  type Target,
} from "../../../game/targetRange.ts";
import { useReducedMotion } from "../../motion.ts";
import type { Player } from "../../world/PlayerController.tsx";
import { Burst, type BurstHandle } from "../shared/game3d/Burst.tsx";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { aimAt, drillTime, fire, range } from "./rangeSession.ts";

/** The firing line, and the muzzle's height and reach from her feet. */
const LINE: Vec3 = [0, 0, 4.6];
const MUZZLE_UP = 1.4;
const MUZZLE_OUT = 0.55;
/** How long a beam and a spinning-away target show, s. */
const BEAM = 0.14;
const SPIN = 0.8;

const KINDS = ["duck", "can", "star"] as const;
const GLOW: Record<(typeof KINDS)[number], THREE.Color> = {
  duck: new THREE.Color("#4fd8ff").multiplyScalar(2),
  can: new THREE.Color("#b06bff").multiplyScalar(2),
  star: new THREE.Color("#ffe066").multiplyScalar(2.4),
};
const RAIL = new THREE.Color("#ff2f9a").multiplyScalar(1.6);
const BEAM_COLOR = new THREE.Color("#ff5fc8").multiplyScalar(3);

function shape(kind: (typeof KINDS)[number]) {
  if (kind === "duck") return new THREE.CircleGeometry(0.28, 24);
  if (kind === "can") return new THREE.CircleGeometry(0.3, 4);
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.14 : 0.32;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(s);
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();

/** One kind of target sliding along the rails; lit ones spin away. */
function Targets({ kind }: { kind: (typeof KINDS)[number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => shape(kind), [kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const litAt = useRef(new Map<number, number>());
  const calm = useReducedMotion();
  useFrame(() => {
    const im = mesh.current;
    const s = range.get();
    if (!im) return;
    im.visible = s.phase === "playing";
    if (!im.visible) return;
    const now = performance.now();
    const t = drillTime(now);
    const lit = s.shot?.lit;
    if (lit && !litAt.current.has(lit.id) && s.shot)
      litAt.current.set(lit.id, s.shot.when);
    let i = 0;
    for (const target of s.drill.targets) {
      if (target.kind !== kind) continue;
      place(target, t, now, calm, litAt.current);
      im.setMatrixAt(i++, m);
    }
    im.count = i;
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, 15]}
      frustumCulled={false}
      visible={false}
    >
      <meshBasicMaterial
        color={GLOW[kind]}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

function place(
  target: Target,
  t: number,
  now: number,
  calm: boolean,
  lit: Map<number, number>,
) {
  const [x, y, z] = targetAt(target, t);
  const when = lit.get(target.id);
  const k = when === undefined ? -1 : (now - when) / 1000 / SPIN;
  if (!target.hit) lit.delete(target.id);
  if (target.hit && (k < 0 || k >= 1)) {
    m.makeScale(0, 0, 0);
    return;
  }
  e.set(0, k >= 0 && !calm ? k * Math.PI * 4 : 0, 0);
  q.setFromEuler(e);
  v.set(x, y, z + 0.02);
  const s = k >= 0 ? 1 - k : 1;
  sc.set(s, s, s);
  m.compose(v, q, sc);
}

/** The crosshair on the wall. */
function Crosshair() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const r = mesh.current;
    const s = range.get();
    if (!r) return;
    r.visible = s.phase === "playing";
    if (r.visible) r.position.set(s.aim[0], s.aim[1], RAIL_Z + 0.05);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <ringGeometry args={[0.13, 0.17, 24]} />
      <meshBasicMaterial color={BEAM_COLOR} toneMapped={false} />
    </mesh>
  );
}

/** The beam from the muzzle to where the shot hit, and the spark burst. */
function Beam() {
  const mesh = useRef<THREE.Mesh>(null);
  const burst = useRef<BurstHandle>(null);
  const seen = useRef(0);
  const from = useMemo(() => new THREE.Vector3(), []);
  const to = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const b = mesh.current;
    const shot = range.get().shot;
    if (!b) return;
    if (!shot) {
      b.visible = false;
      return;
    }
    if (seen.current !== shot.n) {
      seen.current = shot.n;
      const yaw = Math.atan2(shot.at[0] - LINE[0], RAIL_Z - LINE[2]);
      from.set(
        LINE[0] + Math.sin(yaw) * MUZZLE_OUT,
        MUZZLE_UP,
        LINE[2] + Math.cos(yaw) * MUZZLE_OUT,
      );
      to.set(shot.at[0], shot.at[1], RAIL_Z + 0.03);
      // a thin bar stretched from the muzzle to the wall
      b.position.copy(from).add(to).multiplyScalar(0.5);
      b.scale.set(1, from.distanceTo(to), 1);
      b.quaternion.setFromUnitVectors(
        v.set(0, 1, 0),
        sc.copy(to).sub(from).normalize(),
      );
      playZap();
      if (shot.lit) {
        burst.current?.fire(to.x, to.y, to.z, 1);
        playChime(
          shot.lit.kind === "star" ? 3 : shot.lit.kind === "can" ? 2 : 1,
        );
      }
    }
    b.visible = (performance.now() - shot.when) / 1000 < BEAM;
  });
  return (
    <>
      <mesh ref={mesh} visible={false}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshBasicMaterial color={BEAM_COLOR} toneMapped={false} />
      </mesh>
      <Burst ref={burst} color="#ff9ae0" />
    </>
  );
}

/** The light gun: a short pistol or a long rifle, in front of her chest. */
function Gun() {
  const group = useRef<THREE.Group>(null);
  const rifle = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const g = group.current;
    const s = range.get();
    if (!g) return;
    g.visible = s.phase === "playing";
    if (!g.visible) return;
    const yaw = Math.atan2(s.aim[0] - LINE[0], RAIL_Z - LINE[2]);
    const pitch = Math.atan2(s.aim[1] - MUZZLE_UP, LINE[2] - RAIL_Z);
    g.position.set(
      LINE[0] + Math.sin(yaw) * (MUZZLE_OUT - 0.2),
      MUZZLE_UP - 0.03,
      LINE[2] + Math.cos(yaw) * (MUZZLE_OUT - 0.2),
    );
    g.rotation.set(-pitch, yaw, 0, "YXZ");
    if (rifle.current) rifle.current.visible = s.drill.gun === "rifle";
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.06, 0.08, 0.26]} />
        <meshStandardMaterial
          color="#22202a"
          emissive="#ff2f9a"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* the rifle's long barrel and stock */}
      <mesh ref={rifle} position={[0, 0.01, 0.12]}>
        <boxGeometry args={[0.05, 0.06, 0.8]} />
        <meshStandardMaterial
          color="#2a2836"
          emissive="#4fd8ff"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

/** The target range on the north wall: rails, targets, player, camera. */
export function Range({ player }: { player: Player }) {
  const s = range.use();
  const playing = s.phase === "playing";
  useGameClip(
    "target-range",
    playing ? (s.drill.gun === "rifle" ? "aim-rifle" : "aim-pistol") : null,
  );
  const eye = useMemo<Vec3>(() => [1.3, 2.0, LINE[2] + 2.8], []);
  const target = useMemo<Vec3>(() => [0, 1.7, RAIL_Z], []);
  useGameShot("target-range", playing, eye, target);
  const took = useRef<GameSeat | null>(null);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  useFrame(() => {
    const st = range.get();
    if (st.phase !== "playing") {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      return;
    }
    if (!took.current) {
      const mine: GameSeat = {
        position: new THREE.Vector3(...LINE),
        yaw: Math.PI,
      };
      if (!claimSeat(player, mine)) return;
      took.current = mine;
    }
    if (took.current)
      took.current.yaw = Math.atan2(st.aim[0] - LINE[0], RAIL_Z - LINE[2]);
  });
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    canvas.dataset.rangeShots = String(s.shot?.n ?? 0);
  }, [canvas, s.shot]);
  const onMove = (ev: ThreeEvent<PointerEvent>) => {
    if (playing) aimAt(ev.point.x, ev.point.y);
  };
  const onTap = (ev: ThreeEvent<MouseEvent>) => {
    if (!playing || ev.delta > 6) return;
    ev.stopPropagation();
    aimAt(ev.point.x, ev.point.y);
    fire(performance.now());
  };
  return (
    <>
      {/* the three rails, always lit */}
      {RAIL_Y.map((y) => (
        <mesh key={y} position={[0, y - 0.36, RAIL_Z - 0.02]}>
          <boxGeometry args={[ARENA.x1 - ARENA.x0 - 2.4, 0.04, 0.04]} />
          <meshBasicMaterial color={RAIL} toneMapped={false} />
        </mesh>
      ))}
      {KINDS.map((k) => (
        <Targets key={k} kind={k} />
      ))}
      <Crosshair />
      <Beam />
      <Gun />
      {playing && (
        // an invisible sheet on the wall that catches the pointer
        <mesh
          position={[0, 1.8, RAIL_Z + 0.04]}
          onPointerMove={onMove}
          onClick={onTap}
        >
          <planeGeometry args={[ARENA.x1 - ARENA.x0, 3.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
