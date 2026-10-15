// Dev-only doll lab, not linked from the game. Open
// /src/client/avatar/lineup.html?shot=face|body|lineup|far on the dev server.
// Writes draw-call and triangle counts to data-stats on <body> for before/after.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { DEFAULT_LOOK, type Look } from "../../game/look.ts";
import { Doll } from "./Doll.tsx";

const shot = new URLSearchParams(location.search).get("shot") ?? "lineup";

const LINEUP: Look[] = [
  {
    ...DEFAULT_LOOK,
    skin: "#f3d4c4",
    hairStyle: "waves",
    hairColor: "#f1d78f",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "flares",
    outfitColor: "#3fe0d0",
    shadow: "#ff2f9a",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#e6b48e",
    hairStyle: "ponytail",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "mini",
    outfitColor: "#9b5cff",
    shadow: "#d23cff",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#c48d68",
    hairStyle: "buns",
    hairColor: "#4a2a1c",
    lips: "lips-burgundy-cherry",
    brows: "brows-fox-snatched",
    outfit: "fur",
    outfitColor: "#e8e2ff",
    shadow: "#8a5a3c",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#94603f",
    hairStyle: "waves",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-sculpted-espresso",
    outfit: "flares",
    outfitColor: "#ffb02e",
    shadow: "#3fe0d0",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#633c29",
    hairStyle: "ponytail",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "mini",
    outfitColor: "#141018",
    shadow: "#ffb02e",
  },
  {
    ...DEFAULT_LOOK,
    skin: "#633c29",
    hairStyle: "buns",
    hairColor: "#b77a3e",
    lips: "lips-hot-pink-glam",
    brows: "brows-fox-snatched",
    outfit: "fur",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
];

const BODY = [
  { ...LINEUP[0], outfit: "flares" as const },
  { ...LINEUP[1], outfit: "mini" as const },
  { ...LINEUP[2], outfit: "fur" as const },
];

const SHOTS = {
  lineup: {
    looks: LINEUP,
    x: (i: number) => (i - 2.5) * 0.95,
    cam: [0, 1.0, 9.8] as const,
    target: [0, 0.9, 0] as const,
    fov: 34,
  },
  body: {
    looks: BODY,
    x: (i: number) => (i - 1) * 1.4,
    cam: [0, 0.95, 6.2] as const,
    target: [0, 0.85, 0] as const,
    fov: 32,
  },
  face: {
    looks: [LINEUP[0]],
    x: () => 0,
    cam: [0, 1.5, 0.95] as const,
    target: [0, 1.42, 0] as const,
    fov: 22,
  },
  // distant crowd: what a doll costs when it is far from the camera
  far: {
    looks: LINEUP.slice(0, 1),
    x: () => 0,
    cam: [0, 1.0, 26] as const,
    target: [0, 0.9, 0] as const,
    fov: 34,
  },
};
type ShotName = keyof typeof SHOTS;
const plan = SHOTS[shot as ShotName] ?? SHOTS.lineup;

function measure(root: THREE.Object3D) {
  let calls = 0;
  let tris = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent)
      if (!p.visible) return;
    const g = o.geometry;
    const n = g.index ? g.index.count : g.attributes.position.count;
    calls += Array.isArray(o.material) ? o.material.length : 1;
    tris += n / 3;
  });
  return { calls, tris: Math.round(tris) };
}

function Probe({ count }: { count: number }) {
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    document.body.dataset.frames = String(frames.current);
    if (frames.current !== 12) return;
    const dolls = Array.from({ length: count }, (_, i) =>
      measure(scene.getObjectByName(`doll-${i}`) ?? new THREE.Object3D()),
    );
    const total = measure(scene);
    document.body.dataset.stats = JSON.stringify({ dolls, scene: total });
  });
  return null;
}

function Lab() {
  return (
    <Canvas
      frameloop="always"
      dpr={1}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{
        position: [...plan.cam],
        fov: plan.fov,
        near: 0.05,
        far: 200,
      }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(plan.target[0], plan.target[1], plan.target[2]);
        gl.setClearColor("#07020b");
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.6} />
      <directionalLight
        position={[-2, 1, -2]}
        intensity={0.5}
        color="#ff74d4"
      />
      {plan.looks.map((look, i) => (
        <group key={i} name={`doll-${i}`} position={[plan.x(i), 0, 0]}>
          <Doll look={look} mood="idle" seed={i} />
        </group>
      ))}
      <Probe count={plan.looks.length} />
    </Canvas>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("lineup.html is missing #root.");
createRoot(root).render(<Lab />);
