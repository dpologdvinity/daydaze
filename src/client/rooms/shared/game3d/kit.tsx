// Dev-only lab for the in-world game kit, not linked from the game. Open
// /src/client/rooms/shared/game3d/kit.html on the dev server: a ball lobs
// over a net and bounces, a splash and a sand puff fire where it lands, a
// light burst pops at the top, and a judge holds up a card. `?freeze=1`
// stops drawing two frames after the first landing, for a screenshot. Writes frame counts and the
// scene's draw calls to data-frames / data-stats on <body>.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ballAt,
  bounce,
  lob,
  type Vec3,
} from "../../../../game/motion/ball.ts";
import { Ball } from "./Ball.tsx";
import { Burst, type BurstHandle } from "./Burst.tsx";
import { ScoreCard } from "./ScoreCard.tsx";
import { SandPuff, Splash } from "./Splash.tsx";

const FREEZE = new URLSearchParams(location.search).get("freeze") === "1";
const FLIGHT = lob([-3, 1.2, 0], [3, 0.11, 0], 3.2);
const HOP = bounce(FLIGHT, 0.45);
const LOOP = FLIGHT.duration + HOP.duration + 1.2;

function Scene() {
  const splash = useRef<BurstHandle>(null);
  const puff = useRef<BurstHandle>(null);
  const light = useRef<BurstHandle>(null);
  const [score, setScore] = useState<string | null>(null);
  const clock = useRef(0);
  const fired = useRef(-1);
  const info = useThree((s) => s.gl.info);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const sinceFire = useRef(-1);
  const frames = useRef(0);
  const track = (out: Vec3) => {
    const t = clock.current % LOOP;
    if (t < FLIGHT.duration) ballAt(FLIGHT, t, out);
    else ballAt(HOP, Math.min(HOP.duration, t - FLIGHT.duration), out);
    return true;
  };
  useFrame((_, dt) => {
    // the ball steps at 30 fps, so a slow software renderer still sees it fly
    clock.current += FREEZE ? 1 / 30 : dt;
    if (sinceFire.current >= 0 && ++sinceFire.current > 2 && FREEZE)
      setFrameloop("never");
    const lap = Math.floor(clock.current / LOOP);
    const t = clock.current % LOOP;
    if (t >= FLIGHT.duration && fired.current !== lap) {
      fired.current = lap;
      splash.current?.fire(3, 0.11, 0, 1.2);
      puff.current?.fire(3, 0.05, 0);
      light.current?.fire(0, 3.2, 0);
      setScore("9.5");
      sinceFire.current = 0;
    }
    if (t < 0.1 && fired.current === lap - 1) setScore(null);
    frames.current += 1;
    document.body.dataset.frames = String(frames.current);
    document.body.dataset.stats = JSON.stringify({
      calls: info.render.calls,
      triangles: info.render.triangles,
    });
  });
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#d9c08a" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.04, 2.4, 6]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
      <Ball track={track} />
      <Splash ref={splash} />
      <SandPuff ref={puff} />
      <Burst ref={light} color="#ff7ad9" />
      <ScoreCard score={score} position={[0, 0.9, 2.2]} />
    </>
  );
}

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <Canvas camera={{ position: [0, 3, 8], fov: 50 }} dpr={1}>
      <Scene />
    </Canvas>,
  );
