// Karaoke in the room: when a song starts the player's doll walks up to the
// mic and sings; the big screen turns into three note lanes with the melody
// falling to a glowing line on the beat; every hit bursts on the line, sings
// the note through the jukebox and flashes the stage's light strips; four
// right in a row and the crowd cheers. The session (./session.ts) keeps the
// song; this only draws it.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { playCheer } from "../../../audio/worldSounds.ts";
import { LANES, NOTES } from "../../../game/karaokeGame.ts";
import { MIC, STAGE } from "../../../game/karaoke.ts";
import type { Vec3 } from "../../../game/motion/ball.ts";
import { useReducedMotion } from "../../motion.ts";
import type { Player } from "../../world/PlayerController.tsx";
import { Burst, type BurstHandle } from "../shared/game3d/Burst.tsx";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { canvasTex, hdr } from "../shared/materials.ts";
import { karaoke, reachedMic, songNow } from "./session.ts";

/** Where the big screen hangs: its size, center height and wall z. */
export type ScreenSpot = { w: number; h: number; y: number; z: number };

const LANE_COLORS = ["#4fd8ff", "#ffe066", "#ff5fc8"] as const;
/** How far apart the lanes sit on the screen, and where the line is. */
const LANE_GAP = 0.78;
const LINE_Y = -0.78;
/** Screen units a note falls per second: it shows ~1.8 s ahead. */
const FALL = 1;
/** Walking pace up to the mic, m/s. */
const PACE = 1.6;
/** How long the crowd cheers, s. */
const CHEER_SECONDS = 3;

// a little off-center from the booths' side, the singer and the whole screen
const EYE: Vec3 = [1.1, 1.9, MIC[1] + 6.6];
const TARGET: Vec3 = [0, 2.05, MIC[1] - 1];

// the lane backdrop: a dark stage-night gradient with three soft lanes and
// little note heads at the line, in the lanes' colors
const LANES_TEX = canvasTex(512, 268, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 268);
  g.addColorStop(0, "#12052a");
  g.addColorStop(1, "#3a0a4a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 268);
  LANE_COLORS.forEach((c, i) => {
    const x = 256 + (i - 1) * 91;
    const lane = ctx.createLinearGradient(0, 0, 0, 268);
    lane.addColorStop(0, "rgba(255,255,255,0)");
    lane.addColorStop(1, `${c}55`);
    ctx.fillStyle = lane;
    ctx.fillRect(x - 34, 0, 68, 268);
    ctx.strokeStyle = `${c}aa`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, 225, 22, 0, Math.PI * 2);
    ctx.stroke();
  });
});

const m = new THREE.Matrix4();
const v = new THREE.Vector3();
const q = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const zero = new THREE.Vector3(0, 0, 0);
const tint = new THREE.Color();

/** The note lanes over the big screen while a song is on. */
function NoteLanes({
  screen,
  burst,
}: {
  screen: ScreenSpot;
  burst: RefObject<BurstHandle | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const notes = useRef<THREE.InstancedMesh>(null);
  const line = useRef<THREE.MeshBasicMaterial>(null);
  const sung = useRef(0);
  const flash = useRef(0);
  const calm = useReducedMotion();
  const lineColor = useMemo(() => hdr("#ffffff", 2.2), []);
  useEffect(() => {
    const im = notes.current;
    if (!im) return;
    for (let i = 0; i < NOTES; i++) im.setColorAt(i, tint.set("#ffffff"));
  }, []);
  useFrame((_, dt) => {
    const g = group.current;
    const im = notes.current;
    if (!g || !im) return;
    const s = karaoke.get();
    g.visible = s.phase !== "off";
    if (!g.visible) return;
    const now = songNow();
    for (let i = 0; i < NOTES; i++) {
      const note = s.notes[i];
      const y = note ? LINE_Y + (note.at - now) * FALL : 0;
      const show = note && i >= s.song.length && y < screen.h / 2 - 0.12;
      v.set(note ? (note.lane - 1) * LANE_GAP : 0, y, 0.02);
      m.compose(v, q, show ? one : zero);
      im.setMatrixAt(i, m);
      if (note)
        im.setColorAt(i, tint.set(LANE_COLORS[note.lane % LANES] ?? "#fff"));
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    // a new right note: burst on the line in its lane and flash the line
    if (s.song.length > sung.current) {
      const last = s.song[s.song.length - 1];
      const note = s.notes[s.song.length - 1];
      if (
        last?.lane &&
        (last.swing === "perfect" || last.swing === "good") &&
        note
      ) {
        flash.current = 1;
        burst.current?.fire(
          (note.lane - 1) * LANE_GAP,
          screen.y + LINE_Y,
          screen.z + 0.2,
          last.swing === "perfect" ? 1.2 : 0.8,
        );
      }
    }
    sung.current = s.song.length;
    flash.current = calm ? 0 : Math.max(0, flash.current - dt * 3);
    line.current?.color.copy(lineColor).multiplyScalar(1 + flash.current * 1.5);
  });
  return (
    <group
      ref={group}
      position={[0, screen.y, screen.z + 0.07]}
      visible={false}
    >
      <mesh>
        <planeGeometry args={[screen.w, screen.h]} />
        <meshBasicMaterial map={LANES_TEX} toneMapped={false} />
      </mesh>
      <mesh position={[0, LINE_Y, 0.01]}>
        <boxGeometry args={[LANE_GAP * 3.2, 0.03, 0.01]} />
        <meshBasicMaterial ref={line} color={lineColor} toneMapped={false} />
      </mesh>
      <instancedMesh
        ref={notes}
        args={[undefined, undefined, NOTES]}
        frustumCulled={false}
      >
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Two tall light strips flanking the screen that flash on every hit. */
function LightStrips({ screen }: { screen: ScreenSpot }) {
  const calm = useReducedMotion();
  const base = useMemo(() => hdr("#ff6ac8", 1.6), []);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const sung = useRef(0);
  const flash = useRef(0);
  useFrame((_, dt) => {
    const s = karaoke.get();
    if (s.song.length > sung.current) {
      const last = s.song[s.song.length - 1];
      if (last?.lane && (last.swing === "perfect" || last.swing === "good"))
        flash.current = 1;
    }
    sung.current = s.song.length;
    flash.current = calm ? 0 : Math.max(0, flash.current - dt * 2.5);
    mat.current?.color.copy(base).multiplyScalar(1 + flash.current * 2.5);
  });
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (screen.w / 2 + 0.35), screen.y, screen.z + 0.05]}
        >
          <boxGeometry args={[0.06, screen.h + 0.4, 0.03]} />
          <meshBasicMaterial
            ref={side < 0 ? mat : undefined}
            color={base}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * The player at the mic: walks up when a song starts (a striding seat, so the
 * legs walk), turns to the room and sings; hands the doll back when the mic
 * goes down. Returns whether she's at the mic.
 */
function useWalkToMic(player: Player): boolean {
  const [arrived, setArrived] = useState(false);
  const took = useRef<GameSeat | null>(null);
  const at = useRef(false);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  useFrame((_, dt) => {
    const on = karaoke.get().phase !== "off";
    if (!on) {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      if (at.current) setArrived((at.current = false));
      return;
    }
    if (!took.current) {
      const mine: GameSeat = {
        position: player.pos.clone(),
        yaw: player.yaw,
        stride: true,
      };
      if (!claimSeat(player, mine)) return;
      took.current = mine;
    }
    const seat = took.current;
    if (!seat || player.seat !== seat) return;
    const dx = MIC[0] - seat.position.x;
    const dz = MIC[1] - seat.position.z;
    const d = Math.hypot(dx, dz);
    const step = PACE * dt;
    if (d > step) {
      seat.position.x += (dx / d) * step;
      seat.position.z += (dz / d) * step;
      seat.position.y = STAGE.height;
      seat.yaw = Math.atan2(dx, dz);
      seat.stride = true;
    } else {
      seat.position.set(MIC[0], STAGE.height, MIC[1]);
      // face the room
      seat.yaw = 0;
      seat.stride = false;
      if (!at.current) {
        setArrived((at.current = true));
        reachedMic();
      }
    }
  });
  return arrived;
}

/** Karaoke on stage: the singer, the lanes, the light strips and the camera. */
export function SingStage({
  player,
  screen,
}: {
  player: Player;
  screen: ScreenSpot;
}) {
  const arrived = useWalkToMic(player);
  const s = karaoke.use();
  const { phase } = s;
  const live = phase === "cueing" || phase === "singing";
  useGameClip("karaoke", arrived && live ? "sing" : null);
  // the shot frames the stage from the moment she steps up, so you watch her
  // walk on
  useGameShot("karaoke", phase !== "off", EYE, TARGET);
  const burst = useRef<BurstHandle>(null);
  // hits and streak cheers, mirrored onto the canvas for the browser tests
  const canvas = useThree((s) => s.gl.domElement);
  const cheered = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    const hits = s.song.filter(
      (n) => n.lane && (n.swing === "perfect" || n.swing === "good"),
    ).length;
    canvas.dataset.karaokeHits = String(hits);
    canvas.dataset.karaokePhase = s.phase;
    if (s.cheerAt !== cheered.current) {
      cheered.current = s.cheerAt;
      if (Number.isFinite(s.cheerAt)) playCheer(0.6);
    }
  }, [s, canvas]);
  return (
    <>
      <NoteLanes screen={screen} burst={burst} />
      <LightStrips screen={screen} />
      <Burst ref={burst} color="#fff1a8" />
    </>
  );
}

/** True while the crowd should be cheering the singer's streak. */
export function useCrowdCheering(): boolean {
  const [on, setOn] = useState(false);
  useFrame(() => {
    const s = karaoke.get();
    const cheer =
      performance.now() / 1000 - s.cheerAt < CHEER_SECONDS && s.phase !== "off";
    if (cheer !== on) setOn(cheer);
  });
  return on;
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
