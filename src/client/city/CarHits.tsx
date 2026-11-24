// Cars and people on the city's streets (game/city/carHits.ts and
// streetKnocks.ts): a traffic car that hits the player on foot knocks her
// down by its speed and its driver shouts; the player's own car knocks
// walkers down, slows, raises police heat and, driven off, makes it a
// hit-and-run; walkers dodge or freeze before a car and bystanders stop to
// look and gasp. Tires screech and horns blow on a hard stop. Nobody is ever
// hurt for real: every fall ends in a get-up (the game is 13+).

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { clampToArea } from "../../game/area.ts";
import {
  carSpeedAfterHit,
  hitOutcome,
  hitReaction,
  knockback,
  openHitScene,
  stepHitScene,
  type HitScene,
} from "../../game/city/carHits.ts";
import { CITY_AREA } from "../../game/city/layout.ts";
import { COPS } from "../../game/city/heist.ts";
import { CHASE_COPS } from "../../game/city/chase.ts";
import { PEDESTRIANS, pedestrianOut } from "../../game/city/pedestrians.ts";
import {
  knock,
  evadeFastCar,
  settle,
  startle,
  streetPose,
  touches,
  watch,
  type CarNow,
  type StreetPose,
} from "../../game/city/streetKnocks.ts";
import type { TrafficHit } from "../../game/city/traffic.ts";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../game/dialogue/pick.ts";
import type {
  DialogueRole,
  DialogueSituation,
} from "../../game/dialogue/types.ts";
import { playHorn, playScreech, playThump } from "../../audio/worldSounds.ts";
import { setCamOverride } from "../world/camOverride.ts";
import { setData } from "../world/dataset.ts";
import { driving } from "../world/driving.ts";
import { crime } from "../world/heat.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { react } from "../world/reaction.ts";
import { TIME_SCALE } from "../timeScale.ts";
import { cityHour } from "./daylight.ts";
import {
  resetStreetClock,
  streetHits,
  streetSeconds,
  tickStreetClock,
  walkerState,
} from "./streetHits.ts";

/** Walkers farther than this from a car (meters) are left alone. */
const NEAR_CAR = 30;
/** Bystanders within this many meters of a hit stop and look. */
const BYSTANDERS = 16;
/** Seconds a thrown player takes to land. */
const SLIDE_SECONDS = 0.35;
/** Seconds a shout stays over the spot. */
const BUBBLE_SECONDS = 4;

type Bubble = { id: number; x: number; z: number; text: string };

export function CarHits({ player }: { player: Player }) {
  const canvas = useThree((s) => s.gl.domElement);
  const [bubbles, setBubbles] = useState<readonly Bubble[]>([]);
  // pending bubble timers, each dropped once it fires
  const timers = useRef(new Set<number>());
  const recent = useRef<RecentLines>([]);
  const nextId = useRef(0);
  // the player thrown by a car: from, to and seconds into the throw
  const slide = useRef({ on: false, t: 0, x0: 0, z0: 0, x1: 0, z1: 0 });
  const scene = useRef<HitScene | null>(null);
  const alarms = useRef(streetHits.alarms);
  const here = useMemo<[number, number]>(() => [0, 0], []);
  const pose = useMemo<StreetPose>(
    () => ({ x: 0, z: 0, yaw: 0, held: false, reaction: null }),
    [],
  );
  const car = useMemo<CarNow>(
    () => ({ x: 0, z: 0, fx: 0, fz: 1, speed: 0 }),
    [],
  );
  const danger = useMemo(() => ({ x: 0, z: 0, speed: 0, siren: false }), []);

  useEffect(() => {
    // the line banks are their own chunk; a failed load leaves "..." lines
    loadDialogue().catch((e: unknown) => console.warn(e));
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      streetHits.hit = null;
      streetHits.heist = null;
      streetHits.chase = null;
      streetHits.walkers.clear();
      resetStreetClock();
    };
  }, []);

  /** A handwritten line over (x, z) after `delay` seconds, for a while. */
  const say = (
    role: DialogueRole,
    situation: DialogueSituation,
    x: number,
    z: number,
    delay: number,
  ) => {
    const picked = pickLine({
      role,
      situation,
      rng: Math.random,
      recent: recent.current,
    });
    recent.current = picked.recent;
    const bubble: Bubble = { id: nextId.current++, x, z, text: picked.text };
    const later = (fn: () => void, seconds: number) => {
      const id = window.setTimeout(
        () => {
          timers.current.delete(id);
          fn();
        },
        (seconds * 1000) / TIME_SCALE,
      );
      timers.current.add(id);
    };
    later(() => setBubbles((b) => [...b.slice(-2), bubble]), delay);
    later(
      () => setBubbles((b) => b.filter((o) => o !== bubble)),
      delay + BUBBLE_SECONDS,
    );
  };

  /** Walkers near (x, z) stop and look; the nearest one gasps. */
  const bystanders = (x: number, z: number, now: number, skip: number) => {
    const hour = cityHour();
    let nearest = -1;
    let best = BYSTANDERS;
    PEDESTRIANS.forEach((p, i) => {
      if (i === skip || p.bike || !pedestrianOut(p, hour)) return;
      const s = walkerState(i);
      streetPose(p, s, now, pose);
      const d = Math.hypot(pose.x - x, pose.z - z);
      if (d > BYSTANDERS) return;
      watch(s, p, now, [x, z]);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    if (nearest < 0) return;
    streetPose(PEDESTRIANS[nearest], walkerState(nearest), now, pose);
    say("pedestrian", "action-saw-hit", pose.x, pose.z, 0.5);
  };

  /** A traffic car hit the player on foot. */
  const struck = (hit: TrafficHit, now: number) => {
    if (driving.session || driving.passenger !== null || player.seat) return;
    const outcome = hitOutcome(hit.speed);
    if (!outcome || !react(hitReaction(outcome))) return;
    // traffic's yaw: 0 faces +x, positive turns toward -z
    const fx = Math.cos(hit.yaw);
    const fz = -Math.sin(hit.yaw);
    const far = knockback(hit.speed);
    const x0 = player.pos.x;
    const z0 = player.pos.z;
    const [x1, z1] = clampToArea(CITY_AREA, [x0 + fx * far, z0 + fz * far]);
    player.walk.target = null;
    slide.current = { on: true, t: 0, x0, z0, x1, z1 };
    playThump(outcome === "bump" ? 0.5 : 1);
    setData(canvas.dataset, "carHit", outcome);
    say("motorist", "action-hit-walker", hit.x, hit.z, 0.8);
    bystanders(x0, z0, now, -1);
  };

  /**
   * Your car hits walker `i` at `speed` m/s heading (fx, fz): she goes down
   * (unless she is already), the police heat rises, she has a word for you
   * once she is up and the street stops to look. Says whether she went down.
   */
  const hitWalker = (
    i: number,
    now: number,
    speed: number,
    fx: number,
    fz: number,
  ): boolean => {
    const p = PEDESTRIANS[i];
    const st = walkerState(i);
    streetPose(p, st, now, pose);
    const x = pose.x;
    const z = pose.z;
    knock(st, now, speed, fx, fz);
    // a knock that landed starts now; one on someone already down did not
    const ev = st.ev;
    if (!ev || ev.kind !== "knock" || ev.at !== now) return false;
    playThump(speed < 3 ? 0.5 : 1);
    crime("pedestrianHit");
    // the first hit's scene runs on until it is over: a second hit nearby
    // must not reset where driving off is measured from
    scene.current ??= openHitScene([x, z]);
    setData(canvas.dataset, "walkerHit", String(i));
    say(
      "pedestrian",
      "action-knocked-down",
      x + ev.push[0],
      z + ev.push[1],
      Math.max(0.5, ev.hold - 0.6),
    );
    bystanders(x, z, now, i);
    return true;
  };

  // `?debug=1` puts `daydazeKnockWalker(speed, pinCam?, dry?)` on the page,
  // for tests and screenshots: the walker nearest you is hit as by your car at
  // `speed` m/s, coming from your side (her index, or -1 with nobody near).
  // `pinCam: true` pins the camera to frame her fall, get-up and speech bubble.
  // `dry: true` only probes whether someone is near (boolean).
  const hitRef = useRef(hitWalker);
  hitRef.current = hitWalker;
  useEffect(() => {
    if (new URLSearchParams(location.search).get("debug") !== "1") return;
    const knockNearest = (speed: unknown, pinCam?: unknown, dry?: unknown) => {
      if (typeof speed !== "number" || !Number.isFinite(speed)) return -1;
      const now = streetSeconds();
      const hour = cityHour();
      let nearest = -1;
      let best = 25;
      PEDESTRIANS.forEach((p, i) => {
        if (p.bike || !pedestrianOut(p, hour)) return;
        streetPose(p, walkerState(i), now, pose);
        const d = Math.hypot(pose.x - player.pos.x, pose.z - player.pos.z);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      if (nearest < 0) return dry === true ? false : -1;
      streetPose(PEDESTRIANS[nearest], walkerState(nearest), now, pose);
      const d = Math.max(best, 1e-6);
      const fx = (pose.x - player.pos.x) / d;
      const fz = (pose.z - player.pos.z) / d;
      if (pinCam === true) {
        const far = knockback(speed);
        const landX = pose.x + fx * far;
        const landZ = pose.z + fz * far;
        const px = -fz;
        const pz = fx;
        setCamOverride({
          eye: [landX + px * 3.2 - fx * 2.8, 1.7, landZ + pz * 3.2 - fz * 2.8],
          look: [landX, 0.9, landZ],
        });
      }
      if (dry === true) return true;
      return hitRef.current(nearest, now, speed, fx, fz) ? nearest : -1;
    };
    Object.assign(window, { daydazeKnockWalker: knockNearest });
    return () => {
      Object.assign(window, { daydazeKnockWalker: undefined });
    };
  }, [player, pose]);

  useFrame((_, dt) => {
    tickStreetClock(dt);
    const now = streetSeconds();
    const gameDt = dt * TIME_SCALE;
    // a hard stop for the player in the road: tires lock and the horn goes
    // (a new traffic simulation starts its count over: no alarm in that)
    if (streetHits.alarms > alarms.current) {
      playScreech();
      playHorn();
    }
    alarms.current = streetHits.alarms;
    const hit = streetHits.hit;
    if (hit) {
      streetHits.hit = null;
      struck(hit, now);
    }
    const sl = slide.current;
    if (sl.on) {
      sl.t += gameDt;
      const k = Math.min(1, sl.t / SLIDE_SECONDS);
      const e = 1 - (1 - k) * (1 - k);
      placePlayer(
        player,
        sl.x0 + (sl.x1 - sl.x0) * e,
        sl.z0 + (sl.z1 - sl.z0) * e,
      );
      if (k >= 1) sl.on = false;
    }

    // Event cars share the same pedestrian reactions as the player's car.
    const { heist, chase } = streetHits;
    const hour = cityHour();
    for (let k = 0; k < COPS + 1 + CHASE_COPS + 1; k++) {
      const isHeist = k <= COPS;
      if (!heist || !chase) break;
      const n = isHeist ? k : k - COPS - 1;
      const eventCar = isHeist
        ? n < COPS
          ? heist.cops[n]
          : heist.getaway
        : n < CHASE_COPS
          ? chase.cops[n]
          : chase.fleeing;
      if (!eventCar.visible) continue;
      danger.x = eventCar.x;
      danger.z = eventCar.z;
      danger.speed = eventCar.speed;
      danger.siren = isHeist
        ? n < COPS && heist.siren && heist.lit[n]
        : n < CHASE_COPS && chase.siren && chase.lit[n];
      if (!danger.siren && danger.speed <= 15) continue;
      for (let i = 0; i < PEDESTRIANS.length; i++) {
        const p = PEDESTRIANS[i];
        if (p.bike || !pedestrianOut(p, hour)) continue;
        const half = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) / 2;
        if (
          !streetHits.walkers.get(i)?.ev &&
          Math.hypot(
            (p.a[0] + p.b[0]) / 2 - danger.x,
            (p.a[1] + p.b[1]) / 2 - danger.z,
          ) -
            half >
            12
        )
          continue;
        const st = walkerState(i);
        settle(st, now);
        evadeFastCar(st, p, now, danger);
      }
    }

    // your own car among the walkers
    const s = driving.session?.kind === "city" ? driving.session : null;
    if (s) {
      const c = s.car;
      const back = c.speed < 0 ? -1 : 1;
      car.x = c.position[0];
      car.z = c.position[1];
      // walk.ts yaw: 0 faces +z; a reversing car bears down behind it
      car.fx = Math.sin(c.yaw) * back;
      car.fz = Math.cos(c.yaw) * back;
      car.speed = Math.abs(c.speed);
      const hour = cityHour();
      for (let i = 0; i < PEDESTRIANS.length; i++) {
        const p = PEDESTRIANS[i];
        if (p.bike) continue;
        // cheap reject: her whole strip is out of reach
        const half = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) / 2;
        const cx = (p.a[0] + p.b[0]) / 2;
        const cz = (p.a[1] + p.b[1]) / 2;
        if (Math.hypot(cx - car.x, cz - car.z) - half > NEAR_CAR) continue;
        if (!pedestrianOut(p, hour)) continue;
        const st = walkerState(i);
        settle(st, now);
        startle(st, p, i, now, car);
        streetPose(p, st, now, pose);
        if (!touches(car, s.spec.length, s.spec.width, pose)) continue;
        if (hitWalker(i, now, car.speed, car.fx, car.fz))
          c.speed = carSpeedAfterHit(c.speed);
      }
    }

    // driving off from a hit within a few seconds is a hit-and-run
    if (scene.current) {
      here[0] = player.pos.x;
      here[1] = player.pos.z;
      const r = stepHitScene(scene.current, gameDt, here);
      scene.current = r.scene;
      if (r.hitAndRun) crime("hitAndRun");
    }
  });

  return (
    <>
      {bubbles.map((b) => (
        <Html key={b.id} position={[b.x, 2.4, b.z]} center>
          {/* its own width, not squeezed at the edge of the view */}
          <p className="bubble" style={{ width: "max-content" }}>
            {b.text}
          </p>
        </Html>
      ))}
    </>
  );
}
