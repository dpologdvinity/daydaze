import * as THREE from "three";
import { DECO, NeonText } from "../shared/Neon.tsx";
import { canvasTex, GOLD, LACQUER, neonMat } from "../shared/materials.ts";
import {
  BACK_Z,
  BAR_X,
  DJ_BOOTH,
  PODIUM_TOP,
  PODIUMS,
  WALL_X,
} from "./layout.ts";

const WALL = new THREE.MeshStandardMaterial({
  color: "#2a0b3e",
  roughness: 0.5,
  metalness: 0.2,
});
// the back wall: violet panels with a glowing pink seam every half metre
const BACK_WALL_TEX = canvasTex(
  256,
  128,
  (ctx) => {
    ctx.fillStyle = "#2a0b3e";
    ctx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 64) {
      ctx.fillStyle = "#ff2f9a";
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x, 0, 3, 128);
      ctx.globalAlpha = 1;
    }
    const g = ctx.createRadialGradient(128, 64, 8, 128, 64, 140);
    g.addColorStop(0, "rgba(155,92,255,0.55)");
    g.addColorStop(1, "rgba(42,11,62,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  },
  [3, 1],
);
// the mirror ball's facets, as a scatter of bright and dim squares
const DISCO = new THREE.MeshBasicMaterial({
  map: canvasTex(64, 64, (ctx) => {
    for (let x = 0; x < 64; x += 4)
      for (let y = 0; y < 64; y += 4) {
        const v = (x * 7 + y * 13) % 11;
        ctx.fillStyle = v > 6 ? "#ffffff" : v > 3 ? "#9fb8ff" : "#33304a";
        ctx.fillRect(x, y, 4, 4);
      }
  }),
  toneMapped: false,
});
const BANQUETTE = new THREE.MeshStandardMaterial({
  color: "#3a0f3a",
  roughness: 0.7,
});
const BACK_WALL = new THREE.MeshStandardMaterial({
  map: BACK_WALL_TEX,
  roughness: 0.6,
});
const WALL_HEIGHT = 4;
const TUBE_Z = [-4.2, -1.4, 1.4, 4.2];

/**
 * The dark back and side walls and the glowing trim. The street side is open,
 * like the Velvet Room, so the camera sees in past the door.
 */
export function Walls() {
  return (
    <>
      <mesh position={[0, WALL_HEIGHT / 2, BACK_Z]} material={BACK_WALL}>
        <boxGeometry args={[WALL_X * 2, WALL_HEIGHT, 0.2]} />
      </mesh>
      <mesh position={[-WALL_X, WALL_HEIGHT / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, WALL_HEIGHT, 14]} />
      </mesh>
      <mesh position={[WALL_X, WALL_HEIGHT / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, WALL_HEIGHT, 14]} />
      </mesh>
      {/* vertical neon tubes up each side wall, alternating pink and teal */}
      {TUBE_Z.map((z, i) => (
        <group key={z}>
          <mesh
            position={[-WALL_X + 0.14, 1.9, z]}
            material={neonMat(i % 2 ? "#4fe3ff" : "#ff2f9a", 2.5)}
          >
            <boxGeometry args={[0.05, 2.6, 0.05]} />
          </mesh>
          <mesh
            position={[WALL_X - 0.14, 1.9, z]}
            material={neonMat(i % 2 ? "#ff2f9a" : "#4fe3ff", 2.5)}
          >
            <boxGeometry args={[0.05, 2.6, 0.05]} />
          </mesh>
        </group>
      ))}
      {/* glowing trim along the top of each wall */}
      <mesh
        position={[0, 3.92, BACK_Z + 0.12]}
        material={neonMat("#ff2f9a", 3)}
      >
        <boxGeometry args={[WALL_X * 2, 0.05, 0.04]} />
      </mesh>
      <mesh
        position={[-WALL_X + 0.12, 3.92, 0]}
        material={neonMat("#b06bff", 3)}
      >
        <boxGeometry args={[0.04, 0.05, 14]} />
      </mesh>
      <mesh
        position={[WALL_X - 0.12, 3.92, 0]}
        material={neonMat("#4fe3ff", 3)}
      >
        <boxGeometry args={[0.04, 0.05, 14]} />
      </mesh>
      <NeonText
        text="PULSE"
        color="#ff4fb3"
        font={DECO}
        width={3.4}
        k={4}
        position={[0, 2.9, BACK_Z + 0.25]}
      />
    </>
  );
}

/** The DJ booth on the back edge, with a lit deck and a glowing LED panel behind it. */
export function DjBooth() {
  return (
    <group position={[DJ_BOOTH.x, 0, DJ_BOOTH.z]}>
      <mesh position={[0, 0.55, 0.1]} material={LACQUER}>
        <boxGeometry args={[3.2, 1.1, 0.9]} />
      </mesh>
      <mesh position={[0, 1.12, 0.1]} material={neonMat("#4fe3ff", 3)}>
        <boxGeometry args={[3.3, 0.04, 0.95]} />
      </mesh>
      <mesh position={[-0.75, 1.17, 0.05]}>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 28]} />
        <meshStandardMaterial color="#0b0310" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0.75, 1.17, 0.05]}>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 28]} />
        <meshStandardMaterial color="#0b0310" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.9, -0.25]} material={neonMat("#ff4fb3", 1.4)}>
        <planeGeometry args={[2.9, 1.3]} />
      </mesh>
    </group>
  );
}

/** A mirror ball over the dance floor, its facets catching the light. */
export function MirrorBall() {
  return (
    <group position={[0, 3.2, 1.2]}>
      <mesh material={DISCO}>
        <sphereGeometry args={[0.38, 20, 14]} />
      </mesh>
      <mesh position-y={0.55} material={neonMat("#c9b7d8", 0.6)}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
      </mesh>
    </group>
  );
}

/** Two dancers' podiums on the back corners, lit around the rim. */
export function Podiums() {
  return (
    <>
      {PODIUMS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position-y={PODIUM_TOP / 2} material={LACQUER}>
            <cylinderGeometry args={[0.8, 0.9, PODIUM_TOP, 32]} />
          </mesh>
          <mesh
            position-y={PODIUM_TOP + 0.01}
            material={neonMat(i === 0 ? "#ffb02e" : "#9b5cff", 3)}
          >
            <cylinderGeometry args={[0.82, 0.82, 0.02, 32]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** The bar counter down the left wall, with glowing shelves behind it. */
export function Bar() {
  return (
    <>
      <mesh position={[BAR_X, 0.5, 0]} material={LACQUER}>
        <boxGeometry args={[0.6, 1, 6.4]} />
      </mesh>
      <mesh position={[BAR_X, 1.02, 0]} material={GOLD}>
        <boxGeometry args={[0.66, 0.04, 6.44]} />
      </mesh>
      {/* bottles on the shelf, each lit from inside */}
      {[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((z, i) => (
        <mesh
          key={z}
          position={[-WALL_X + 0.35, 1.7, z]}
          material={neonMat(
            ["#ff8a3d", "#ff2f9a", "#4fe3ff", "#ffb02e"][i % 4],
            2,
          )}
        >
          <cylinderGeometry args={[0.07, 0.09, 0.4, 8]} />
        </mesh>
      ))}
      {[1.5, 2.1, 2.7].map((y, i) => (
        <mesh
          key={y}
          position={[-WALL_X + 0.14, y, 0]}
          material={neonMat(i === 1 ? "#ff8a3d" : "#ff4fb3", 2)}
        >
          <boxGeometry args={[0.04, 0.05, 5.6]} />
        </mesh>
      ))}
    </>
  );
}

/** Two banquette booths along the right wall. */
export function Booths() {
  return (
    <>
      {[-2.4, 1.8].map((z) => (
        <group key={z} position={[WALL_X - 0.45, 0, z]}>
          <mesh position={[0, 0.3, 0]} material={BANQUETTE}>
            <boxGeometry args={[0.8, 0.6, 2.4]} />
          </mesh>
          <mesh position={[0.35, 0.95, 0]} material={BANQUETTE}>
            <boxGeometry args={[0.25, 0.9, 2.4]} />
          </mesh>
          <mesh position={[-0.95, 0.82, 0]} material={neonMat("#ff4fb3", 2)}>
            <cylinderGeometry args={[0.35, 0.35, 0.04, 24]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** A coat rail and counter by the street door, with a sign above. */
export function CoatCheck() {
  return (
    <group position={[-4.9, 0, 6.0]}>
      <mesh position={[0, 0.55, 0]} material={LACQUER}>
        <boxGeometry args={[1.6, 1.1, 0.5]} />
      </mesh>
      <mesh position={[0, 1.12, 0]} material={GOLD}>
        <boxGeometry args={[1.66, 0.04, 0.54]} />
      </mesh>
      <mesh position={[0, 2.2, -0.2]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
        <meshStandardMaterial color="#c9b7d8" metalness={1} roughness={0.3} />
      </mesh>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1.7, -0.2]}
          material={neonMat(["#ffb02e", "#9b5cff", "#3fe0d0"][i], 1.2)}
        >
          <boxGeometry args={[0.36, 0.9, 0.12]} />
        </mesh>
      ))}
    </group>
  );
}
