// Photon Zone laser tag scene, plus the Rivals and Beams components that
// Paintball.tsx reuses for any TagGame session. The room ticks the shared
// laserTag session each frame from the player's position and leaves the game on
// unmount.

import { Range } from "./lasertag/Range.tsx";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { ARENA, COVER, rivalAt } from "../../game/laserTag.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { laserTag, type TagGame } from "./lasertag/session.ts";

const RIVAL_COLORS = laserTag.colors;

const { x0, x1, z0, z1 } = ARENA;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.4;
const BEAM_SECONDS = 0.18;

const SHELL = surface("plastic", {
  scale: 1,
  color: "#4a3a8a",
  roughness: 0.5,
});
const WALL = surface("concrete_wall_008", { scale: 0.5, color: "#2a1a4a" });

const RIVAL_BASE: Look = {
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-feathered-honey",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};
const RIVAL_LOOKS: readonly Look[] = [
  RIVAL_BASE,
  { ...RIVAL_BASE, skin: "#633c29", hairStyle: "afro", shadow: "#3fe0d0" },
  { ...RIVAL_BASE, skin: "#f3d4c4", hairStyle: "bob", hairColor: "#f1d78f" },
  { ...RIVAL_BASE, skin: "#94603f", hairStyle: "braids", shadow: "#3fe0d0" },
];

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
      b.add(new THREE.BoxGeometry(w, h, d), SHELL, {
        position: [cx, h / 2, cz],
      });
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

/** The four rivals, moving between cover and their peek spots, with a
 * tap target each and their vests glowing. */
/** A tag game's rivals, moving between cover and their peek spots, each
 * with a tap target and a glowing vest. */
export function Rivals({ game, seed = 401 }: { game: TagGame; seed?: number }) {
  const { store: tag, you, fire, colors } = game;
  const groups = useRef<(THREE.Group | null)[]>([]);
  const vests = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame((_, dt) => {
    const { round, phase } = tag.get();
    game.field.rivals.forEach((spot, i) => {
      const g = groups.current[i];
      if (!g) return;
      const { at, open } =
        phase === "playing"
          ? rivalAt(round, i)
          : { at: spot.hide, open: false };
      const k = 1 - Math.exp(-dt * 10);
      g.position.x += (at[0] - g.position.x) * k;
      g.position.z += (at[1] - g.position.z) * k;
      // facing the doorway end of the arena, where you start
      g.rotation.y = Math.atan2(
        you.at[0] - g.position.x,
        you.at[1] - g.position.z,
      );
      const down = round.t < (round.downUntil[i] ?? 0);
      const vest = vests.current[i];
      if (vest)
        vest.color
          .set(colors[i] ?? "#ffffff")
          .multiplyScalar(down ? 0.3 : open ? 3 : 1.6);
    });
  });
  const tap = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    fire(i);
  };
  return (
    <>
      {game.field.rivals.map((spot, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g;
          }}
          position={[spot.hide[0], 0, spot.hide[1]]}
        >
          <CrowdFigure
            look={RIVAL_LOOKS[i % RIVAL_LOOKS.length] ?? RIVAL_BASE}
            seed={seed + i}
          />
          {/* the sensor vest: chest and shoulder pads that light up */}
          <mesh position={[0, 1.02, 0.02]}>
            <boxGeometry args={[0.36, 0.3, 0.22]} />
            <meshBasicMaterial
              ref={(m) => {
                vests.current[i] = m;
              }}
              toneMapped={false}
            />
          </mesh>
          <mesh position-y={0.95} onClick={tap(i)} visible={false}>
            <boxGeometry args={[0.8, 1.9, 0.8]} />
          </mesh>
        </group>
      ))}
    </>
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
      <Rivals game={laserTag} />
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
