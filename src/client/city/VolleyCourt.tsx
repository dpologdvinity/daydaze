// A volleyball rally drawn on a court: the ball flies each touch the session
// (volleySession.ts) calls, the pair across the net run under it and dig or
// spike, the player's doll steps to the dig spot and the spike spot and plays
// her dig and spike clips, and landings throw sand (or water, in the pool).
// Contact thumps, a kill gets a cheer. Shared by the beach net (city) and the
// pool court (Water Park); the panel keeps only score and controls.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { playCheer, playSplash, playThump } from "../../audio/worldSounds.ts";
import type { GameClipId } from "../../game/dance/moves.ts";
import type { Look, SwimLook } from "../../game/look.ts";
import {
  ballAt,
  bounce,
  type Flight,
  type Vec3,
} from "../../game/motion/ball.ts";
import { VOLLEYBALL } from "../../game/city/layout.ts";
import type { PrizeGame } from "../../game/prizes.ts";
import {
  digSpot,
  opponentSpots,
  shotFlight,
  spikeSpot,
  type Court,
} from "../../game/volleyball.ts";
import { Doll } from "../avatar/Doll.tsx";
import { Ball } from "../rooms/shared/game3d/Ball.tsx";
import type { BurstHandle } from "../rooms/shared/game3d/Burst.tsx";
import { useGameClip } from "../rooms/shared/game3d/gameClip.ts";
import { SandPuff, Splash } from "../rooms/shared/game3d/Splash.tsx";
import { useGameShot } from "../rooms/shared/game3d/useGameShot.ts";
import type { Player } from "../world/PlayerController.tsx";
import { volley } from "./volleySession.ts";

/** How fast the dolls run to the ball, m/s. */
const RUN = 3.6;
/** How long a dig or spike clip plays after the touch, s. */
const CLIP_SECONDS = 0.9;
/** Ball radius: it rests on the sand at this height. */
const REST_Y = 0.11;

/** The pair across the net. */
const OPPONENTS: readonly { look: Look; swim: SwimLook }[] = [
  {
    look: {
      skin: "#c48d68",
      hairStyle: "ponytail",
      hairColor: "#4a2a1c",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
    swim: { style: "bikini", color: "#ffb02e" },
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "buns",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    swim: { style: "one-piece", color: "#3fe0d0" },
  },
];

/** A court in the world: its size, its center (the foot of the net, on the
 * playing surface the ball lands on), the height the dolls stand at, and
 * where the player's side faces (yaw 0: her side is toward -z). */
export type CourtSpot = {
  court: Court;
  center: Vec3;
  floor: number;
  yaw?: number;
  /** The camera: how far behind the back line and how high (default 4.2
   * back, 3.6 up). */
  shot?: { back: number; up: number };
};

/** The beach net's court: the net along x, the player's side toward the
 * boardwalk. */
export const BEACH_COURT: CourtSpot = {
  court: { half: VOLLEYBALL.half, depth: VOLLEYBALL.depth, net: 2.45 },
  // the sand's top is at 0.14 (plan.ts surfaceStyle); walkers stand at 0
  center: [VOLLEYBALL.x, 0.14, VOLLEYBALL.z],
  floor: 0,
};

const local: Vec3 = [0, 0, 0];
const v = new THREE.Vector3();

/** Court coordinates to the world, written into `out`. */
function toWorld(spot: CourtSpot, p: Vec3, out: Vec3): Vec3 {
  const yaw = spot.yaw ?? 0;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  out[0] = spot.center[0] + p[0] * c + p[2] * s;
  out[1] = spot.center[1] + p[1];
  out[2] = spot.center[2] - p[0] * s + p[2] * c;
  return out;
}

type Touch = NonNullable<ReturnType<typeof volley.get>["flight"]>;

/** What a scene needs for the current touch, worked out once per flight: the
 * flight in court coordinates, the hop after it lands (kills and shanks),
 * where it ends, and where the pair across the net go for it. */
type Cached = {
  f: Touch;
  flight: Flight;
  hop: Flight | null;
  end: Vec3;
  theirs: [[number, number], [number, number]];
};

function useFlight(spot: CourtSpot): () => Cached | null {
  const cache = useRef<Cached | null>(null);
  return () => {
    const f = volley.get().flight;
    if (!f) return null;
    if (cache.current?.f.n !== f.n) {
      const flight = shotFlight(spot.court, f.shot, f.seconds, f.lane);
      const lands = f.shot === "kill" || f.shot === "miss";
      const end = ballAt(flight, flight.duration, [0, 0, 0]);
      cache.current = {
        f,
        flight,
        hop: lands ? bounce(flight, 0.4) : null,
        end,
        theirs: opponentSpots(spot.court, end),
      };
    }
    return cache.current;
  };
}

/** Where the player goes for a touch, in court coordinates: the dig spot
 * for their attack, under the set for her spike, base otherwise. */
function playerSpot(c: Court, f: Touch): Vec3 {
  const p =
    f.shot === "attack" || f.shot === "miss"
      ? digSpot(c, f.lane)
      : f.shot === "set"
        ? spikeSpot(c, f.lane)
        : digSpot(c, 0);
  return [p[0], 0, p[2] - (f.shot === "set" ? 0.3 : 0.2)];
}

/** One of the pair across the net: runs to her spot, digs or spikes. */
function Opponent({
  spot,
  index,
  move,
}: {
  spot: CourtSpot;
  index: 0 | 1;
  move: GameClipId | undefined;
}) {
  const group = useRef<THREE.Group>(null);
  const at = useRef<Vec3>([0, 0, 0]);
  const flightOf = useFlight(spot);
  const base = useMemo(
    () => opponentSpots(spot.court, [0, 0, -1])[index],
    [spot, index],
  );
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const [x, z] = flightOf()?.theirs[index] ?? base;
    const p = at.current;
    const dx = x - p[0];
    const dz = z - p[2];
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, RUN * dt);
    if (d > 1e-4) {
      p[0] += (dx / d) * step;
      p[2] += (dz / d) * step;
    }
    toWorld(spot, p, local);
    g.position.set(local[0], spot.floor, local[2]);
    // they face your side of the net
    g.rotation.y = (spot.yaw ?? 0) + Math.PI;
  });
  const o = OPPONENTS[index];
  return (
    <group ref={group}>
      <Doll
        look={o.look}
        swim={o.swim}
        mood={move ? "dance" : "idle"}
        dance={move}
        seed={300 + index}
      />
    </group>
  );
}

/**
 * The rally on one court while its game is on (`prize` names whose game it
 * is, since the beach and the pool share the session).
 */
export function VolleyCourt({
  spot,
  prize,
  player,
  water = false,
}: {
  spot: CourtSpot;
  prize: PrizeGame;
  player: Player;
  /** A pool court: splashes instead of sand puffs. */
  water?: boolean;
}) {
  const s = volley.use();
  const on = s.phase !== "off" && s.prize === prize;
  return on ? <Rally spot={spot} player={player} water={water} /> : null;
}

function Rally({
  spot,
  player,
  water,
}: {
  spot: CourtSpot;
  player: Player;
  water: boolean;
}) {
  const s = volley.use();
  const flightOf = useFlight(spot);
  const puff = useRef<BurstHandle>(null);
  const canvas = useThree((st) => st.gl.domElement);
  const landed = useRef(-1);
  const heard = useRef(-1);

  // the player's clip: a dig or a spike right after each touch she makes
  const [clip, setClip] = useState<GameClipId | null>(null);
  useEffect(() => {
    if (!s.last) return;
    setClip(s.last.touch === "dig" ? "dig" : "spike");
    const id = window.setTimeout(() => setClip(null), CLIP_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [s.last]);
  useGameClip("volleyball", clip);

  // the opponents' clips: the hitter spikes their attack, the digger digs
  // yours
  const shot = s.flight?.shot;
  const theirs: [GameClipId | undefined, GameClipId | undefined] =
    shot === "attack"
      ? [undefined, "spike"]
      : shot === "their-dig"
        ? ["dig", undefined]
        : [undefined, undefined];

  // the camera behind the player's side, looking over the net
  const eye = useMemo(
    () =>
      toWorld(
        spot,
        [0, spot.shot?.up ?? 3.6, -spot.court.depth - (spot.shot?.back ?? 4.2)],
        [0, 0, 0],
      ),
    [spot],
  );
  const target = useMemo(() => toWorld(spot, [0, 1.2, 1.5], [0, 0, 0]), [spot]);
  useGameShot("volleyball", true, eye, target);

  // the player steps to where the ball is coming: a striding seat
  const took = useRef(false);
  useEffect(
    () => () => {
      if (took.current) player.seat = null;
    },
    [player],
  );
  const here: Vec3 = useMemo(() => [0, 0, 0], []);
  const want = useRef<{ n: number; at: Vec3 }>({ n: -1, at: [0, 0, 0] });

  // the ball, in the world: in flight, hopping after it lands, then at rest
  const track = (out: Vec3) => {
    const cur = flightOf();
    if (!cur || s.phase === "over") return false;
    const t = (performance.now() - cur.f.at) / 1000;
    if (t <= cur.flight.duration) ballAt(cur.flight, t, local);
    else if (cur.hop) {
      ballAt(
        cur.hop,
        Math.min(t - cur.flight.duration, cur.hop.duration),
        local,
      );
    } else {
      // a touch nobody made: it carries on and drops to the ground
      ballAt(cur.flight, t, local);
      local[1] = Math.max(REST_Y, local[1]);
    }
    toWorld(spot, local, out);
    return true;
  };

  useFrame((_, dt) => {
    const cur = flightOf();
    if (!cur) return;
    const f = cur.f;
    // contact: a thump as each touch leaves a hand
    if (heard.current !== f.n) {
      heard.current = f.n;
      playThump(f.shot === "kill" || f.shot === "attack" ? 1 : 0.6);
      canvas.dataset.volleyBall = `${f.shot}-${f.n}`;
    }
    // landing: sand or water, and a cheer on a kill
    const t = (performance.now() - f.at) / 1000;
    if (cur.hop && t >= cur.flight.duration && landed.current !== f.n) {
      landed.current = f.n;
      toWorld(spot, cur.end, here);
      puff.current?.fire(here[0], spot.center[1] + 0.02, here[2], 1);
      if (water) playSplash(0.35);
      if (f.shot === "kill") playCheer(0.45);
    }
    // the player: to the dig spot for their attack, under the set for the
    // spike, back to base otherwise; facing the net
    if (!took.current) {
      took.current = true;
      player.sitting = false;
      player.seat = {
        position: player.pos.clone(),
        yaw: spot.yaw ?? 0,
        stride: false,
      };
    }
    const seat = player.seat;
    if (!seat) return;
    if (want.current.n !== f.n)
      want.current = {
        n: f.n,
        at: toWorld(spot, playerSpot(spot.court, f), [0, 0, 0]),
      };
    const [wx, , wz] = want.current.at;
    here[0] = wx;
    here[2] = wz;
    v.set(here[0] - seat.position.x, 0, here[2] - seat.position.z);
    const d = v.length();
    const step = Math.min(d, RUN * dt);
    seat.stride = d > 0.08;
    if (d > 1e-4) seat.position.addScaledVector(v.normalize(), step);
    seat.position.y = spot.floor;
    seat.yaw = spot.yaw ?? 0;
  });

  return (
    <>
      <Ball track={track} radius={0.11} color="#fff6d8" stripe="#ffb02e" />
      <Opponent spot={spot} index={0} move={theirs[0]} />
      <Opponent spot={spot} index={1} move={theirs[1]} />
      {water ? <Splash ref={puff} /> : <SandPuff ref={puff} />}
    </>
  );
}
