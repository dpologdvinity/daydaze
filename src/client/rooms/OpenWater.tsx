import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  DIVE_BUOY,
  LANE_BUOYS,
  SAND,
  SEA,
  SHACK,
  SHORE_Z,
  depthAt,
} from "../../game/openWater.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { Look } from "../../game/look.ts";
import { scuba } from "../avatar/human/afloat.ts";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { SeaLife } from "./ocean/SeaLife.tsx";

const SEA_LENGTH = SHORE_Z - SEA.far;

/** The seabed under the surf: sand sloping away to the deep, drawn straight
 * from depthAt so what you wade on is what the water is deep over. */
function seabed(): THREE.BufferGeometry {
  const rows = 40;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const shallow = new THREE.Color("#f0dcae");
  const deep = new THREE.Color("#1b6f93");
  const c = new THREE.Color();
  for (let r = 0; r <= rows; r++) {
    const z = SHORE_Z - (r / rows) * SEA_LENGTH;
    const d = depthAt(0, z);
    c.copy(shallow).lerp(deep, Math.min(1, d / 5));
    for (const x of [-SEA.x, SEA.x]) {
      pos.push(x, -d, z);
      col.push(c.r, c.g, c.b);
    }
    if (r > 0) {
      const a = (r - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const buoyMat = new THREE.MeshStandardMaterial({ color: "#ff4f4f" });
const whiteMat = new THREE.MeshStandardMaterial({ color: "#ffffff" });

/** A float with a stripe, and the dive buoy's flag on a mast. */
function Buoys() {
  return (
    <>
      {LANE_BUOYS.map(([x, z]) => (
        <mesh key={x} position={[x, 0, z]} material={buoyMat}>
          <sphereGeometry args={[0.28, 12, 8]} />
        </mesh>
      ))}
      <group position={[DIVE_BUOY[0], 0, DIVE_BUOY[1]]}>
        <mesh position-y={0.2} material={buoyMat}>
          <cylinderGeometry args={[0.55, 0.7, 1.1, 14]} />
        </mesh>
        <mesh position-y={0.55} material={whiteMat}>
          <cylinderGeometry args={[0.57, 0.6, 0.3, 14]} />
        </mesh>
        <mesh position-y={1.8} material={whiteMat}>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
        </mesh>
        <mesh position={[0.35, 2.4, 0]}>
          <planeGeometry args={[0.7, 0.45]} />
          <meshStandardMaterial
            color="#3fe0d0"
            side={THREE.DoubleSide}
            emissive="#0b8a9a"
          />
        </mesh>
      </group>
    </>
  );
}

const WOOD = new THREE.MeshStandardMaterial({
  color: "#c8915a",
  roughness: 0.85,
});
const ROOF = new THREE.MeshStandardMaterial({
  color: "#ff6f91",
  roughness: 0.6,
});

/** The dive shack: a stilted beach hut with a striped awning and its sign. */
function Shack() {
  return (
    <group position={[SHACK.x, 0, SHACK.z]} rotation-y={Math.PI}>
      <mesh position-y={1.2} material={WOOD}>
        <boxGeometry args={[SHACK.w, 2.4, SHACK.d]} />
      </mesh>
      <mesh position={[0, 2.65, 0]} rotation-z={0} material={ROOF}>
        <boxGeometry args={[SHACK.w + 0.8, 0.3, SHACK.d + 0.8]} />
      </mesh>
      {/* the counter window, and the awning over it */}
      <mesh position={[0, 1.3, -SHACK.d / 2 - 0.02]}>
        <planeGeometry args={[3.4, 1.2]} />
        <meshStandardMaterial color="#1a3a4a" />
      </mesh>
      <mesh position={[0, 2.25, -SHACK.d / 2 - 0.5]} rotation-x={0.45}>
        <boxGeometry args={[4, 0.08, 1.2]} />
        <meshStandardMaterial color="#3fe0d0" />
      </mesh>
      <NeonText
        text="DIVE SHACK"
        color="#3fe0d0"
        font={MARQUEE}
        width={3.6}
        k={3.2}
        position={[0, 3.35, -SHACK.d / 2 - 0.05]}
        rotation-y={Math.PI}
      />
      {/* tanks racked beside the window */}
      {[-2.5, -2.1, -1.7].map((x) => (
        <mesh key={x} position={[x, 0.55, -SHACK.d / 2 - 0.3]}>
          <capsuleGeometry args={[0.13, 0.7, 4, 10]} />
          <meshStandardMaterial
            color="#ffb02e"
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

const INSTRUCTOR: Look = {
  skin: "#94603f",
  hairStyle: "long-curly",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-sculpted-espresso",
  outfit: "baby-tee-mini",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

function SeaSurface({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#2aa9d6",
      transparent: true,
      opacity: 0.62,
      roughness: 0.12,
      metalness: 0.15,
      depthWrite: false,
    });
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    // the swell: a slow breathing of the water's tone
    material.opacity = calm
      ? 0.62
      : 0.6 + Math.sin(clock.elapsedTime * 0.7) * 0.03;
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0, (SHORE_Z + SEA.far) / 2]}
      onClick={click}
      name="floor"
      material={material}
      renderOrder={2}
    >
      <planeGeometry args={[SEA.x * 2 + 60, SEA_LENGTH + 40]} />
    </mesh>
  );
}

/**
 * Seaside Swim, through the gate on Shore Boulevard: a bright sand strip with
 * the dive shack, then the sea: wade in, swim out among schools of fish and
 * the dolphin pod, and swim into the red buoy (with rented gear) to dive.
 */
export function OpenWater({ onPick }: { onPick: PickHandler }) {
  const bed = useMemo(seabed, []);
  useEffect(() => () => bed.dispose(), [bed]);
  // her tank and mask come off when she leaves the sea
  useEffect(() => () => scuba.set({ wearing: false }), []);
  return (
    <>
      <color attach="background" args={["#8fd6ff"]} />
      <fog attach="fog" args={["#bfe8ff", 40, 130]} />
      <hemisphereLight args={["#e4f4ff", "#f2d9a8", 1.5]} />
      <directionalLight
        position={[18, 30, 12]}
        intensity={2.4}
        color="#fff3dc"
      />
      <Floor
        width={SAND.x1 - SAND.x0}
        depth={SAND.z1 - SAND.z0}
        center={[0, (SAND.z0 + SAND.z1) / 2]}
        color="#ffffff"
        texture={{ id: "coast_sand_01", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.95 }}
        mirror={0}
        onPick={onPick}
      />
      <mesh
        geometry={bed}
        onClick={(e) => e.delta <= 6 && onPick([e.point.x, e.point.z])}
      >
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <SeaSurface onPick={onPick} />
      <PortalPads room={ROOMS["open-water"]} color="#3fe0d0" />
      <Shack />
      <Buoys />
      <SeaLife />
      <TalkingNpc
        name="Kai"
        role="lifeguard"
        look={INSTRUCTOR}
        mood="idle"
        at={[SHACK.x - 3.8, 0, SHACK.z - 3.4]}
        rot={Math.PI}
        seed={411}
        greet
        context={{ venue: "open-water", neighborhood: "beachside" }}
      />
    </>
  );
}
