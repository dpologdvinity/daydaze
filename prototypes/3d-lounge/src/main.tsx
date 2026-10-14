import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { StrictMode, Suspense, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { Doll, OUTLINE_LAYER, type WalkState } from "./Doll";
import { BOOTH, Lounge, ROOM } from "./Lounge";
import { DEFAULT_LOOK, NPC_LOOKS, type Look, type Mood } from "./looks";
import { OFF } from "./flags";
import { Overlay, type View } from "./ui";
import "./spike.css";

const START = new THREE.Vector3(0.9, 0, 1.6);

function clampWalkable(p: THREE.Vector3) {
  p.x = THREE.MathUtils.clamp(p.x, -ROOM + 0.7, ROOM - 0.7);
  p.z = THREE.MathUtils.clamp(p.z, -3.9, ROOM - 0.5);
  p.y = 0;
  const d = new THREE.Vector2(p.x - BOOTH.x, p.z - BOOTH.z);
  if (d.length() < 1.9) {
    d.setLength(1.9);
    p.x = BOOTH.x + d.x;
    p.z = BOOTH.z + d.y;
  }
  return p;
}

type Player = { pos: THREE.Vector3; yaw: number; target: THREE.Vector3 };

function PlayerDoll({
  look,
  mood,
  player,
}: {
  look: Look;
  mood: Mood;
  player: Player;
}) {
  const g = useRef<THREE.Group>(null);
  const walk = useRef<WalkState>({ speed: 0 });
  const marker = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const d = new THREE.Vector3().subVectors(player.target, player.pos);
    d.y = 0;
    const dist = d.length();
    const moving = dist > 0.04;
    walk.current.speed = THREE.MathUtils.damp(
      walk.current.speed,
      moving ? 1 : 0,
      10,
      dt,
    );
    if (moving) {
      const want = Math.atan2(d.x, d.z);
      let diff = want - player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.yaw += diff * Math.min(1, dt * 9);
      const step = Math.min(dist, dt * 1.35 * (Math.abs(diff) < 1.2 ? 1 : 0.3));
      player.pos.addScaledVector(d.normalize(), step);
    }
    g.current?.position.copy(player.pos);
    if (g.current) g.current.rotation.y = player.yaw;
    if (marker.current) {
      marker.current.visible = moving;
      marker.current.position.set(player.target.x, 0.02, player.target.z);
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
      marker.current.scale.set(s, s, s);
    }
  });
  return (
    <>
      <group ref={g}>
        <Doll look={look} mood={mood} walk={walk} />
      </group>
      <mesh ref={marker} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.16, 0.2, 40]} />
        <meshBasicMaterial
          color={new THREE.Color("#ff4fb3").multiplyScalar(4)}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
    </>
  );
}

const VIEWS: Record<View, { off: THREE.Vector3; look: number }> = {
  room: { off: new THREE.Vector3(5.8, 5.4, 11), look: 1.0 },
  full: { off: new THREE.Vector3(0.6, 1.1, 3.5), look: 0.88 },
  face: { off: new THREE.Vector3(0.2, 1.55, 1.3), look: 1.45 },
};

function CameraRig({ player, view }: { player: Player; view: View }) {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  camera.layers.enable(OUTLINE_LAYER);
  const last = useRef(player.pos.clone());
  const fly = useRef<{ view: View; t: number } | null>(null);
  const shown = useRef<View | null>(null);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (shown.current !== view) {
      shown.current = view;
      fly.current = { view, t: 0 };
    }
    // follow the player without fighting the user's orbit
    const moved = new THREE.Vector3().subVectors(player.pos, last.current);
    last.current.copy(player.pos);
    camera.position.add(moved);
    c.target.add(moved);
    if (fly.current) {
      const v = VIEWS[fly.current.view];
      const off =
        fly.current.view === "room"
          ? v.off
          : v.off
              .clone()
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      const base =
        fly.current.view === "room"
          ? new THREE.Vector3(1.7, 0, -1)
          : player.pos;
      const goalPos = base.clone().add(off);
      const goalTarget = base.clone().setY(v.look);
      if (fly.current.view === "room") goalTarget.set(1.7, 1.0, -1.0);
      const k = 1 - Math.exp(-dt * 5);
      camera.position.lerp(goalPos, k);
      c.target.lerp(goalTarget, k);
      fly.current.t += dt;
      if (fly.current.t > 1.4) fly.current = null;
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      minDistance={0.6}
      maxDistance={15}
      maxPolarAngle={Math.PI / 2 - 0.06}
      minPolarAngle={0.15}
      target={[-0.4, 1.1, -1.4]}
    />
  );
}

function App() {
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [mood, setMood] = useState<Mood>("idle");
  const [view, setView] = useState<View>(
    (new URLSearchParams(location.search).get("view") as View) || "room",
  );
  const player = useMemo<Player>(
    () => ({ pos: START.clone(), yaw: 0.25, target: START.clone() }),
    [],
  );
  return (
    <div className="spike">
      <Canvas
        dpr={OFF.has("hidpi") ? 1 : [1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [3.8, 4.1, 7.2], fov: 38, near: 0.05, far: 60 }}
      >
        <Suspense fallback={null}>
          <Lounge
            onPick={(p) => {
              player.target.copy(clampWalkable(p));
            }}
          />
          <PlayerDoll look={look} mood={mood} player={player} />
          {!OFF.has("npcs") &&
            NPC_LOOKS.map((n, i) => (
              <Doll
                key={i}
                look={n.look}
                mood={n.mood}
                seed={i + 1}
                position={n.at}
                rotation-y={n.rot}
              />
            ))}
          <CameraRig player={player} view={view} />
          {!OFF.has("post") && (
            <EffectComposer multisampling={0}>
              <Bloom
                mipmapBlur
                luminanceThreshold={1}
                luminanceSmoothing={0.2}
                intensity={1.15}
                radius={0.72}
              />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette offset={0.28} darkness={0.72} />
              <SMAA />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
      <Overlay
        look={look}
        setLook={setLook}
        mood={mood}
        setMood={setMood}
        view={view}
        setView={setView}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
