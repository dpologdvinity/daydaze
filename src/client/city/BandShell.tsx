// The park's band shell (src/game/city/bandShell.ts): the white half-dome
// (Sketchfab "Cartoon Open Air Stage", CC BY), folding chairs, the band's
// instruments and music stands, and, while the park band is on stage (it plays
// every half hour from 10:00 to 17:30 on the player's clock; `?time=HH:MM`
// pins and runs it), the band and the audience as dolls, seated on the picnic
// blankets and chairs or swaying at the edge. The music comes from
// src/audio/parkBand.ts, louder the closer you are. Mounted only near the
// shell, so the rest of the city pays nothing; the low tier draws fewer dolls.
// The canvas carries `data-band` (playing, onstage or off), `data-band-tune`
// and `data-band-dolls` for the browser tests.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type * as THREE from "three";
import {
  BAND,
  BAND_Y,
  FIRST_SET,
  CHAIRS,
  CROWD,
  STAGE_Y,
  bandAt,
  bandHint,
  bandOnStage,
  shellDistance,
  shellNear,
  type BandNow,
} from "../../game/city/bandShell.ts";
import { BAND_SHELL } from "../../game/city/park.ts";
import { parseTimeFlag } from "../../game/city/daylight.ts";
import { ParkBand } from "../../audio/parkBand.ts";
import { Doll } from "../avatar/Doll.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { dimMeshes } from "./CityFurniture.tsx";
import { bandDesk } from "./bandDesk.ts";
import { useDaylight } from "./daylight.ts";
import { disposeInstanced } from "./dispose.ts";
import { propParts, type PropSpot } from "./instancedProps.ts";

const URLS = {
  shell: "/models/park/band-shell.glb",
  chair: "/models/park/lawn-chair.glb",
  trumpet: "/models/park/band-trumpet.glb",
  sax: "/models/park/band-sax.glb",
  drum: "/models/park/band-drum.glb",
  stand: "/models/park/band-stand.glb",
} as const;
const KEYS = Object.keys(URLS) as (keyof typeof URLS)[];
const PATHS = KEYS.map((k) => URLS[k]);

/** The earshot at which the overlay's band card shows (m). */
const CARD_RANGE = 28;
const REPICK = 0.75;

const loadedAt = Date.now();
const pinned = parseTimeFlag(location.search);
const held = Number(
  new URLSearchParams(location.search).get("band") ?? Number.NaN,
);
/**
 * Seconds into the day on the player's clock. A `?time=` pin runs on from
 * there; `?band=30` holds the clock 30 s into the day's first set (10:00), so
 * a screenshot or test catches the band mid-tune however long the page takes
 * to load.
 */
export function bandClock(): number {
  if (Number.isFinite(held)) return FIRST_SET + held;
  if (pinned !== null) return pinned * 3600 + (Date.now() - loadedAt) / 1000;
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

export function BandShell({ player }: { player: Player }): JSX.Element | null {
  const [near, setNear] = useState(false);
  useFrame(() => {
    const now = shellNear(player.pos.x, player.pos.z);
    if (now !== near) setNear(now);
  });
  return near ? <Shell player={player} /> : null;
}

/** The instruments' spots: held in front of each musician, stands before them. */
function bandSpots(): Map<"trumpet" | "sax" | "drum" | "stand", PropSpot[]> {
  const by = new Map<"trumpet" | "sax" | "drum" | "stand", PropSpot[]>();
  const add = (k: "trumpet" | "sax" | "drum" | "stand", s: PropSpot) =>
    by.set(k, [...(by.get(k) ?? []), s]);
  const floor = BAND_Y + STAGE_Y;
  for (const m of BAND) {
    const [x, z] = m.at;
    if (m.instrument === "trumpet")
      add("trumpet", {
        x,
        y: floor + 1.2,
        z: z - 0.3,
        yaw: Math.PI / 2,
        scale: 1,
      });
    else if (m.instrument === "sax")
      add("sax", { x: x + 0.1, y: floor + 0.7, z: z - 0.25, yaw: 0, scale: 1 });
    else if (m.instrument === "drum")
      add("drum", { x, y: floor + 0.55, z: z - 0.45, yaw: 0, scale: 1 });
    if (m.instrument !== "baton")
      add("stand", { x, y: floor, z: z - 0.9, yaw: Math.PI, scale: 1 });
  }
  return by;
}

function Shell({ player }: { player: Player }): JSX.Element {
  const low = useQuality() === "low";
  const canvas = useThree((s) => s.gl.domElement);
  const gltfs = useGLTF(PATHS);
  const { neon } = useDaylight();
  const parts = useMemo(() => {
    const scenes = Object.fromEntries(
      KEYS.map((k, i) => [k, gltfs[i]?.scene] as const),
    );
    const out: THREE.InstancedMesh[] = [];
    const place = (
      scene: THREE.Object3D | undefined,
      spots: readonly PropSpot[],
    ) => {
      if (scene && spots.length > 0) out.push(...propParts(scene, spots));
    };
    place(scenes.shell, [
      // the model opens toward +z; turned to open north onto the lawn
      { x: BAND_SHELL.x, y: BAND_Y, z: BAND_SHELL.z, yaw: Math.PI, scale: 1 },
    ]);
    place(
      scenes.chair,
      CHAIRS.map((c) => ({
        x: c.at[0],
        y: BAND_Y,
        z: c.at[1],
        yaw: c.yaw,
        scale: 1,
      })),
    );
    const spots = bandSpots();
    for (const k of ["trumpet", "sax", "drum", "stand"] as const)
      place(scenes[k], spots.get(k) ?? []);
    return out;
  }, [gltfs]);
  useEffect(() => () => disposeInstanced(parts, true), [parts]);
  useEffect(() => dimMeshes(parts, 1 - 0.55 * neon), [parts, neon]);

  // the band's schedule, its sound and who is drawn
  const sound = useMemo(() => new ParkBand(), []);
  useEffect(
    () => () => {
      sound.stop();
      bandDesk.set({ near: false, hint: "", playing: false });
      delete canvas.dataset.band;
      delete canvas.dataset.bandTune;
      delete canvas.dataset.bandDolls;
    },
    [sound, canvas],
  );
  const [now, setNow] = useState<BandNow>(() => bandAt(bandClock()));
  const [shown, setShown] = useState<readonly number[]>([]);
  const lastPick = useRef(-Infinity);
  const lastSound = useRef(0);
  const DRAWN = low ? 5 : 10;
  const people = useMemo(
    () => [
      ...BAND.map((m) => ({ at: m.at })),
      ...CROWD.map((c) => ({ at: c.at })),
    ],
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const d = shellDistance(player.pos.x, player.pos.z);
    const current = bandAt(bandClock());
    if (t - lastSound.current > 0.15) {
      lastSound.current = t;
      sound.update(current, d);
    }
    if (t - lastPick.current < REPICK) return;
    lastPick.current = t;
    const onStage = bandOnStage(current);
    if (
      current.playing !== now.playing ||
      (current.playing && now.playing && current.tune !== now.tune) ||
      (!current.playing && !now.playing && current.onStage !== now.onStage)
    )
      setNow(current);
    const hint = bandHint(current);
    const card = d < CARD_RANGE;
    const desk = bandDesk.get();
    if (
      desk.hint !== hint ||
      desk.near !== card ||
      desk.playing !== current.playing
    )
      bandDesk.set({ near: card, hint, playing: current.playing });
    const next = onStage
      ? people
          .map((p, i) => ({
            i,
            d: Math.hypot(p.at[0] - player.pos.x, p.at[1] - player.pos.z),
          }))
          .sort((a, b) => a.d - b.d)
          .slice(0, DRAWN)
          .map((n) => n.i)
      : [];
    if (next.length !== shown.length || next.some((i) => !shown.includes(i)))
      setShown(next);
  });
  useEffect(() => {
    canvas.dataset.band = now.playing
      ? "playing"
      : bandOnStage(now)
        ? "onstage"
        : "off";
    canvas.dataset.bandTune = now.playing ? now.tune.song.id : "";
    canvas.dataset.bandDolls = String(shown.length);
  }, [canvas, now, shown.length]);

  return (
    <>
      {parts.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {shown.map((i) => {
        if (i < BAND.length) {
          const m = BAND[i];
          return (
            <group
              key={i}
              position={[m.at[0], BAND_Y + STAGE_Y, m.at[1]]}
              rotation-y={m.yaw}
            >
              <Doll
                look={m.look}
                mood={now.playing ? "dance" : "idle"}
                dance="groove"
                seed={800 + i}
              />
            </group>
          );
        }
        const c = CROWD[i - BAND.length];
        return (
          <group
            key={i}
            // a seat's height, less where a sitting doll's thighs come to
            position={[
              c.at[0],
              BAND_Y + (c.pose === "sit" ? c.seat - 0.48 : 0),
              c.at[1],
            ]}
            rotation-y={c.yaw}
          >
            <Doll
              look={c.look}
              mood={c.pose === "sit" ? "sit" : now.playing ? "dance" : "idle"}
              dance="hip-sway"
              seed={820 + i}
            />
          </group>
        );
      })}
    </>
  );
}

useGLTF.preload(PATHS);
