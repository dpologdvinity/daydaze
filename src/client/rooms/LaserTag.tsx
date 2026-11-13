// Photon Zone laser tag scene, plus the Rivals and Beams components that
// Paintball.tsx reuses for any TagGame session. The room ticks the shared
// laserTag session each frame from the player's position and leaves the game on
// unmount.

import { Range } from "./lasertag/Range.tsx";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { ARENA, COVER, DOWN_SECONDS, rivalAt } from "../../game/laserTag.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";
import type { Player } from "../world/PlayerController.tsx";
import { react } from "../world/reaction.ts";
import { hitDirection } from "../../game/reactions.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import {
  Opponent,
  type OpponentLook,
  type OpponentPose,
} from "./shared/Opponent.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { PropSet } from "./shared/Prop.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { laserTag, type TagGame } from "./lasertag/session.ts";

const RIVAL_COLORS = laserTag.colors;

const { x0, x1, z0, z1 } = ARENA;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.4;
const BEAM_SECONDS = 0.18;

const WALL = surface("concrete_wall_008", { scale: 0.5, color: "#2a1a4a" });

/** Black-light splatter for the walls. */
function splatter() {
  return canvasTex(
    512,
    256,
    (ctx) => {
      ctx.fillStyle = "#0a0614";
      ctx.fillRect(0, 0, 512, 256);
      const colors = ["#4fe3ff", "#ff4fb3", "#7dff6b", "#ffd84f", "#b14dff"];
      for (let i = 0; i < 70; i++) {
        const x = (i * 97) % 512;
        const y = (i * 53) % 256;
        ctx.fillStyle = colors[i % colors.length] ?? "#4fe3ff";
        ctx.globalAlpha = 0.5 + ((i * 13) % 5) / 10;
        ctx.beginPath();
        ctx.arc(x, y, 3 + ((i * 7) % 14), 0, Math.PI * 2);
        ctx.fill();
        // drips
        ctx.fillRect(x - 1.5, y, 3, 10 + ((i * 11) % 30));
      }
      ctx.globalAlpha = 1;
    },
    [3, 1],
  );
}

/** The arena: splattered walls, cover with glowing edges, a lit ceiling grid. */
function useShell(paint: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const PAINT = new THREE.MeshStandardMaterial({
      map: paint,
      emissive: "#ffffff",
      emissiveMap: paint,
      emissiveIntensity: 0.55,
      roughness: 0.9,
    });
    const edges = RIVAL_COLORS.map(
      (c) =>
        new THREE.MeshBasicMaterial({ color: hdr(c, 2.2), toneMapped: false }),
    );
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, 0],
      });
    b.add(new THREE.PlaneGeometry(W, H - 0.6), PAINT, {
      position: [0, H / 2, z0 + 0.01],
    });
    for (const [x, ry] of [
      [x0 + 0.01, Math.PI / 2],
      [x1 - 0.01, -Math.PI / 2],
    ] as const)
      b.add(new THREE.PlaneGeometry(D, H - 0.6), PAINT, {
        position: [x, H / 2, 0],
        rotation: [0, ry, 0],
      });
    COVER.forEach((c, i) => {
      const w = c.x1 - c.x0;
      const d = c.z1 - c.z0;
      const h = w > 2 || d > 2 ? 1.25 : 2.4;
      const cx = (c.x0 + c.x1) / 2;
      const cz = (c.z0 + c.z1) / 2;
      const edge = edges[i % edges.length] ?? edges[0];
      if (!edge) return;
      // glowing strips round the top and the base
      for (const y of [0.04, h - 0.03]) {
        b.add(new THREE.BoxGeometry(w + 0.04, 0.05, 0.04), edge, {
          position: [cx, y, c.z1 + 0.01],
        });
        b.add(new THREE.BoxGeometry(w + 0.04, 0.05, 0.04), edge, {
          position: [cx, y, c.z0 - 0.01],
        });
        b.add(new THREE.BoxGeometry(0.04, 0.05, d + 0.04), edge, {
          position: [c.x0 - 0.01, y, cz],
        });
        b.add(new THREE.BoxGeometry(0.04, 0.05, d + 0.04), edge, {
          position: [c.x1 + 0.01, y, cz],
        });
      }
    });
    return b.build();
  }, [paint]);
}

/** Solid cover remains visible while its model loads. */
function CoverFallback() {
  const cover = useMemo(() => {
    const batch = new Batch();
    const material = surface("plastic", {
      scale: 1,
      color: "#4a3a8a",
      roughness: 0.5,
    });
    COVER.forEach((c) => {
      const w = c.x1 - c.x0;
      const d = c.z1 - c.z0;
      const h = w > 2 || d > 2 ? 1.25 : 2.4;
      batch.add(new THREE.BoxGeometry(w, h, d), material, {
        position: [(c.x0 + c.x1) / 2, h / 2, (c.z0 + c.z1) / 2],
      });
    });
    return batch.build();
  }, []);
  return <primitive object={cover} />;
}

/** Sci-fi crates fitted to the same cover footprints used by line of sight. */
function CoverModels() {
  const { scene } = useGLTF("/models/props/scifi-crate.glb");
  const mesh = useMemo(() => {
    scene.updateMatrixWorld(true);
    let source: THREE.Mesh | undefined;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !source) source = object;
    });
    if (!source) throw new Error("Sci-fi crate has no mesh");
    const geometry = bakedGeometry(source);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -bounds.min.y, -center.z);
    const instances = new THREE.InstancedMesh(
      geometry,
      source.material,
      COVER.length,
    );
    const transform = new THREE.Object3D();
    COVER.forEach((cover, i) => {
      const width = cover.x1 - cover.x0;
      const depth = cover.z1 - cover.z0;
      const height = width > 2 || depth > 2 ? 1.25 : 2.4;
      transform.position.set(
        (cover.x0 + cover.x1) / 2,
        0,
        (cover.z0 + cover.z1) / 2,
      );
      transform.scale.set(width / size.x, height / size.y, depth / size.z);
      transform.updateMatrix();
      instances.setMatrixAt(i, transform.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    return instances;
  }, [scene]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/** Who each rival is, by her place in the game: both bodies, both skin tones. */
const OPPONENT_LOOKS = [
  { sex: "f", tone: "light" },
  { sex: "m", tone: "dark" },
  { sex: "f", tone: "dark" },
  { sex: "m", tone: "light" },
  { sex: "f", tone: "light" },
] as const;
/** How fast a rival runs between cover and her peek spot, meters a second. */
const RUN_SPEED = 6;
/** How fast she turns, per second (how much of the angle left each second). */
const TURN = 12;

/** What one rival has done, to tell shots and tags apart from one frame to
 * the next: where she stands, and when she last fired. */
type RivalTrack = {
  ready: boolean;
  x: number;
  z: number;
  yaw: number;
  t: number;
  window: number;
  shotAt: number;
};

/** A tag game's rivals, each a Universal Base Character in her team's colors
 * with a pistol, running between cover and her peek spot. The AI
 * (laserTag.ts) says where she is, when she fires and when she goes down;
 * game/opponents.ts turns that into a clip. A tap target rides along. */
export function Rivals({
  game,
  glow = true,
}: {
  game: TagGame;
  /** The vests and pistols light up (laser tag); paintball's stay plain. */
  glow?: boolean;
}) {
  return (
    <>
      {game.field.rivals.map((_, i) => (
        <Rival key={i} game={game} i={i} glow={glow} />
      ))}
    </>
  );
}

function Rival({ game, i, glow }: { game: TagGame; i: number; glow: boolean }) {
  const { store: tag, you, fire, colors } = game;
  const spot = game.field.rivals[i];
  const track = useRef<RivalTrack>({
    ready: false,
    x: 0,
    z: 0,
    yaw: 0,
    t: 0,
    window: -1,
    shotAt: -Infinity,
  });
  const look = useMemo<OpponentLook>(
    () => ({
      ...(OPPONENT_LOOKS[i % OPPONENT_LOOKS.length] ?? OPPONENT_LOOKS[0]),
      team: colors[i] ?? "#ffffff",
      glow,
      gun: glow ? (colors[i] ?? "#ffffff") : "#ff8a3d",
    }),
    [i, colors, glow],
  );
  const drive = (dt: number, pose: OpponentPose) => {
    if (!spot) return;
    const { round, phase } = tag.get();
    const k = track.current;
    if (!k.ready) {
      k.ready = true;
      k.x = spot.hide[0];
      k.z = spot.hide[1];
    }
    // a new round starts the clock over
    if (round.t < k.t) {
      k.window = -1;
      k.shotAt = -Infinity;
    }
    k.t = round.t;
    const playing = phase === "playing";
    const downUntil = round.downUntil[i] ?? 0;
    const down = playing && round.t < downUntil;
    const target = playing ? rivalAt(round, i) : { at: spot.hide, open: false };
    // her last shot at you: the pop-out she fired in changed
    const window = round.fired[i] ?? -1;
    if (window !== k.window) {
      if (playing && window >= 0) k.shotAt = round.t;
      k.window = window;
    }
    const dx = target.at[0] - k.x;
    const dz = target.at[1] - k.z;
    const dist = Math.hypot(dx, dz);
    const moving = !down && dist > 0.05;
    if (moving) {
      const step = Math.min(dist, RUN_SPEED * dt);
      k.x += (dx / dist) * step;
      k.z += (dz / dist) * step;
    }
    // facing: where she runs, otherwise at you (a downed rival stays put)
    if (!down) {
      const want = moving
        ? Math.atan2(dx, dz)
        : Math.atan2(you.at[0] - k.x, you.at[1] - k.z);
      const turn = Math.atan2(Math.sin(want - k.yaw), Math.cos(want - k.yaw));
      k.yaw += turn * Math.min(1, dt * TURN);
    }
    pose.x = k.x;
    pose.z = k.z;
    pose.yaw = k.yaw;
    const s = pose.sense;
    s.playing = playing;
    s.down = down;
    s.sinceTag = down ? round.t - (downUntil - DOWN_SECONDS) : Infinity;
    s.untilUp = down ? downUntil - round.t : 0;
    s.moving = moving;
    s.open = target.open;
    s.sinceShot = playing ? round.t - k.shotAt : Infinity;
    pose.glow = down ? 0.15 : target.open ? 1 : 0.5;
  };
  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    fire(i);
  };
  return (
    <Opponent look={look} drive={drive}>
      <mesh position-y={0.95} onClick={tap} visible={false}>
        <boxGeometry args={[0.8, 1.9, 0.8]} />
      </mesh>
    </Opponent>
  );
}

/** Your shots and theirs: a beam that flashes for a moment. */
/** A tag game's shots, yours and theirs: a beam that flashes a moment. */
export function Beams({ game, player }: { game: TagGame; player: Player }) {
  const { store: tag, colors } = game;
  const geo = useMemo(
    () =>
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(6), 3),
      ),
    [],
  );
  const mat = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#ffffff", toneMapped: false }),
    [],
  );
  const beam = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const lastHits = useRef(0);
  const lastFired = useRef<number[]>([]);
  const hitAt = useRef(-10);
  const hitBy = useRef(0);
  useFrame(() => {
    const l = beam;
    const { round, shot } = tag.get();
    // a new hit on you: the rival whose last shot just changed fired it
    if (round.hits > lastHits.current) {
      hitAt.current = round.t;
      const who = round.fired.findIndex((w, i) => w !== lastFired.current[i]);
      if (who >= 0) hitBy.current = who;
      // she flinches from the side the shot came from
      react(
        hitDirection(
          player.yaw,
          [player.pos.x, player.pos.z],
          rivalAt(round, hitBy.current).at,
        ),
      );
    }
    lastHits.current = round.hits;
    lastFired.current = round.fired;
    const p = geo.attributes.position;
    const mine =
      shot && round.t - shot.t < BEAM_SECONDS && shot.result !== "recharging";
    const theirs = round.t - hitAt.current < BEAM_SECONDS;
    l.visible = Boolean(mine || theirs);
    if (!l.visible) return;
    const who = mine && shot ? shot.rival : hitBy.current;
    const r = rivalAt(round, who);
    p.setXYZ(0, player.pos.x, 1.2, player.pos.z);
    p.setXYZ(1, r.at[0], 1.2, r.at[1]);
    p.needsUpdate = true;
    mat.color
      .set(mine ? (colors[who] ?? "#ffffff") : "#ff3040")
      .multiplyScalar(3);
  });
  return <primitive object={beam} />;
}

/**
 * Photon Zone, laser tag in the old flea market hall on Gallery Row: a
 * black-lit arena of glowing cover and paint-splattered walls. Suit up from
 * the panel; four rivals pop out of cover to shoot.
 */
export function LaserTag({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const calm = useReducedMotion();
  const paint = useMemo(splatter, []);
  useEffect(() => () => paint.dispose(), [paint]);
  const shell = useShell(paint);
  useEffect(() => () => laserTag.leave(), []);
  useFrame((_, dt) => {
    laserTag.you.at = [player.pos.x, player.pos.z];
    laserTag.tick(Math.min(dt, 0.5));
  });
  return (
    <>
      <Range player={player} />
      <color attach="background" args={["#05020c"]} />
      <fog attach="fog" args={["#0c0620", 10, 30]} />
      <hemisphereLight args={["#8a5cff", "#1a0830", 0.9]} />
      <pointLight
        position={[0, 3.6, 0]}
        color="#b14dff"
        intensity={8}
        distance={18}
      />
      <Floor
        width={W}
        depth={D}
        color="#3a2a6a"
        texture={{ id: "rubber_tiles", scale: 0.5 }}
        low={{ metalness: 0.1, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["laser-tag"]} color="#4fe3ff" />
      <primitive object={shell} />
      <Suspense fallback={<CoverFallback />}>
        <CoverModels />
      </Suspense>
      <Suspense fallback={null}>
        <PropSet
          model="scifi-locker"
          width={0.9}
          depth={0.5}
          height={2.4}
          at={[
            [x0 + 0.3, 0, -0.5, Math.PI / 2],
            [x1 - 0.3, 0, -0.5, -Math.PI / 2],
          ]}
        />
      </Suspense>
      <Suspense fallback={null}>
        <Rivals game={laserTag} />
      </Suspense>
      <Beams game={laserTag} player={player} />
      <NeonText
        text="PHOTON ZONE"
        color="#4fe3ff"
        font={MARQUEE}
        width={5}
        k={3.4}
        position={[0, 3.6, z0 + 0.05]}
        flicker
      />
      <Sparkles
        count={80}
        scale={[W - 2, 3, D - 2]}
        position={[0, 1.8, 0]}
        size={2.4}
        speed={calm ? 0 : 0.2}
        color="#c8b0ff"
        opacity={0.5}
      />
    </>
  );
}
