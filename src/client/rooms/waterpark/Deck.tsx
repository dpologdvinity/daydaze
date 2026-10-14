import { useMemo } from "react";
import * as THREE from "three";
import { POOL } from "../../../game/waterPark.ts";
import { Floor, type PickHandler } from "../shared/Floor.tsx";
import { canvasTex } from "../shared/materials.ts";
import { Palm } from "../shared/Palm.tsx";
import { stripes, SUNSET_FLAG, toon } from "./materials.ts";

// Sun-bleached sandstone tiles with pale grout.
const TILES = canvasTex(
  128,
  128,
  (ctx) => {
    ctx.fillStyle = "#fff4e2";
    ctx.fillRect(0, 0, 128, 128);
    const tones = ["#f7d7ae", "#f3cda0", "#f9dfbd", "#f5d2a8"];
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = tones[y * 2 + x];
        ctx.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
      }
  },
  [16, 14],
);

/** A painted wooden sign; text in the hand-lettered script. */
export function Sign({
  text,
  width,
  bg,
  fg,
  ...rest
}: {
  text: string;
  width: number;
  bg: string;
  fg: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const tex = useMemo(
    () =>
      canvasTex(512, 160, (ctx) => {
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(4, 4, 504, 152, 40);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.font =
          "italic 700 104px 'Z003', 'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = fg;
        ctx.fillText(text, 256, 86, 470);
      }),
    [text, bg, fg],
  );
  return (
    <mesh {...rest}>
      <planeGeometry args={[width, (width * 160) / 512]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

function Lounger({
  position,
  rotation = 0,
  towel,
}: {
  position: [number, number, number];
  rotation?: number;
  towel: readonly string[];
}) {
  const tex = useMemo(() => {
    const t = stripes(towel);
    t.rotation = Math.PI / 2;
    return t;
  }, [towel]);
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.3, 0.15]} material={toon("#ffffff")}>
        <boxGeometry args={[0.7, 0.08, 1.4]} />
      </mesh>
      <mesh
        position={[0, 0.55, -0.7]}
        rotation-x={-0.65}
        material={toon("#ffffff")}
      >
        <boxGeometry args={[0.7, 0.08, 0.8]} />
      </mesh>
      {[-0.3, 0.3].flatMap((x) =>
        [-0.45, 0.75].map((z) => (
          <mesh
            key={`${x}${z}`}
            position={[x, 0.14, z]}
            material={toon("#d9d9e0")}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.345, 0.2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.62, 1.3]} />
        <meshToonMaterial map={tex} />
      </mesh>
    </group>
  );
}

function Umbrella({
  position,
  colors,
}: {
  position: [number, number, number];
  colors: readonly string[];
}) {
  const tex = useMemo(() => stripes(colors, 2), [colors]);
  return (
    <group position={position}>
      <mesh position-y={1.2} material={toon("#ffffff")}>
        <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
      </mesh>
      <mesh position-y={2.35}>
        <coneGeometry args={[1.3, 0.5, 12, 1, true]} />
        <meshToonMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={2.62} material={toon("#ffffff")}>
        <sphereGeometry args={[0.07, 10, 8]} />
      </mesh>
    </group>
  );
}

const AWNING = stripes(["#3fc2ff", "#ffffff"], 6);

/** The snack shack off the west edge, counter facing the deck. */
function SnackBar() {
  return (
    <group position={[-11.4, 0, 2.6]} rotation-y={Math.PI / 2}>
      {/* back wall, counter and roof */}
      <mesh position={[0, 1.5, -0.9]} material={toon("#7cf0c8")}>
        <boxGeometry args={[4.2, 3, 0.3]} />
      </mesh>
      {[-2, 2].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]} material={toon("#7cf0c8")}>
          <boxGeometry args={[0.25, 3, 2]} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0.85]} material={toon("#ff5fb4")}>
        <boxGeometry args={[3.8, 1.1, 0.5]} />
      </mesh>
      <mesh position={[0, 1.13, 0.9]} material={toon("#ffffff")}>
        <boxGeometry args={[4, 0.08, 0.65]} />
      </mesh>
      <mesh position={[0, 3.1, 0]} material={toon("#ffd23f")}>
        <boxGeometry args={[4.6, 0.2, 2.4]} />
      </mesh>
      <mesh position={[0, 2.7, 1.55]} rotation-x={0.45}>
        <planeGeometry args={[4.4, 1.1]} />
        <meshToonMaterial map={AWNING} side={THREE.DoubleSide} />
      </mesh>
      {/* menu board, cups and a giant ice cream on the roof */}
      <Sign
        text="Splash Snacks"
        width={3.2}
        bg="#ff3f9e"
        fg="#fff6c8"
        position={[0, 3.75, 0.2]}
      />
      <mesh position={[0, 2.0, -0.74]} material={toon("#1b2a4a")}>
        <boxGeometry args={[2.4, 1, 0.04]} />
      </mesh>
      {(
        [
          [-0.9, "#ff9a56"],
          [-0.5, "#7cf0c8"],
          [0.6, "#ff5fb4"],
        ] as const
      ).map(([x, c]) => (
        <mesh key={x} position={[x, 1.28, 0.9]} material={toon(c)}>
          <cylinderGeometry args={[0.07, 0.05, 0.22, 10]} />
        </mesh>
      ))}
      <group position={[1.6, 3.2, 0]}>
        <mesh position-y={0.45} rotation-x={Math.PI} material={toon("#e0a35c")}>
          <coneGeometry args={[0.35, 0.9, 12]} />
        </mesh>
        <mesh position-y={1.02} material={toon("#ffb6dd")}>
          <sphereGeometry args={[0.4, 16, 12]} />
        </mesh>
        <mesh position-y={1.45} material={toon("#fff6e8")}>
          <sphereGeometry args={[0.32, 16, 12]} />
        </mesh>
        <mesh position-y={1.8} material={toon("#ff2f5a")}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** A tall lifeguard chair across the pool, facing the deck. */
export const LIFEGUARD_SEAT: [number, number, number] = [
  -4,
  1.95,
  POOL.z0 - 0.95,
];

function LifeguardStand() {
  const [x, y, z] = LIFEGUARD_SEAT;
  const white = toon("#ffffff");
  return (
    <group position={[x, 0, z]}>
      {[-0.4, 0.4].flatMap((sx) =>
        [-0.35, 0.35].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx, y / 2, sz]}
            rotation-x={sz * 0.15}
            material={white}
          >
            <boxGeometry args={[0.1, y, 0.1]} />
          </mesh>
        )),
      )}
      {[0.5, 1.0, 1.5].map((h) => (
        <mesh key={h} position={[0, h, 0.37]} material={white}>
          <boxGeometry args={[0.8, 0.06, 0.06]} />
        </mesh>
      ))}
      <mesh position-y={y} material={toon("#ff4a3d")}>
        <boxGeometry args={[0.95, 0.1, 0.7]} />
      </mesh>
      <mesh position={[0, y + 0.45, -0.35]} material={toon("#ff4a3d")}>
        <boxGeometry args={[0.95, 0.8, 0.08]} />
      </mesh>
      <mesh position={[0.6, y - 0.4, 0.2]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.24, 0.07, 8, 20]} />
        <meshToonMaterial color="#ff7a1f" />
      </mesh>
      <mesh position={[0, y + 1.4, -0.3]} material={white}>
        <cylinderGeometry args={[0.03, 0.03, 1.9, 6]} />
      </mesh>
      <mesh position={[0, y + 2.35, -0.3]}>
        <coneGeometry args={[1.0, 0.4, 10, 1, true]} />
        <meshToonMaterial color="#ff4a3d" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** The palm-leaf gate back to the Plaza, on the east edge of the deck. */
function Gate() {
  return (
    <group position={[11.6, 0, 2.5]} rotation-y={-Math.PI / 2}>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]} material={toon("#ff9a56")}>
          <cylinderGeometry args={[0.16, 0.2, 3, 10]} />
        </mesh>
      ))}
      <mesh position-y={3.0} rotation-z={Math.PI / 2}>
        <torusGeometry args={[1.1, 0.14, 8, 20, Math.PI]} />
        <meshToonMaterial color="#ff5fb4" />
      </mesh>
      <Sign
        text="to the plaza"
        width={2.3}
        bg="#3fc2ff"
        fg="#ffffff"
        position={[0, 3.55, 0.05]}
      />
    </group>
  );
}

const LOUNGERS: readonly {
  at: [number, number, number];
  rot: number;
  towel: readonly string[];
}[] = [
  { at: [-1.6, 0, 5.6], rot: Math.PI, towel: ["#ffd23f", "#ffffff"] },
  { at: [0.2, 0, 5.6], rot: Math.PI, towel: SUNSET_FLAG },
  { at: [2.0, 0, 5.6], rot: Math.PI, towel: ["#3fc2ff", "#7cf0c8"] },
  { at: [4.4, 0, 5.4], rot: Math.PI - 0.3, towel: ["#ff5fb4", "#ffffff"] },
  { at: [-8.4, 0, 6.0], rot: Math.PI + 0.25, towel: ["#ff9a56", "#fff1dc"] },
];

/** The deck around the pool: tiles, loungers, shade, snacks and palms. */
export function Deck({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <Floor
        width={30}
        depth={26}
        center={[0, -1.5]}
        color="#ffffff"
        map={TILES}
        mirror={0.25}
        mixStrength={1.2}
        roughness={0.7}
        envMapIntensity={0.4}
        low={{ metalness: 0, roughness: 0.85 }}
        onPick={onPick}
      />
      {LOUNGERS.map((l, i) => (
        <Lounger key={i} position={l.at} rotation={l.rot} towel={l.towel} />
      ))}
      <Umbrella position={[-0.7, 0, 6.3]} colors={["#ff3f9e", "#ffffff"]} />
      <Umbrella position={[3.2, 0, 6.2]} colors={["#3fc2ff", "#ffd23f"]} />
      <Umbrella position={[-9.4, 0, 6.6]} colors={["#7cf0c8", "#ff9a56"]} />
      <SnackBar />
      <LifeguardStand />
      <Gate />
      <Palm position={[-10.9, 0, -1.0]} scale={1.7} />
      <Palm position={[-10.6, 0, 6.6]} scale={1.5} />
      <Palm position={[11.2, 0, -2.6]} scale={1.8} />
      <Palm position={[11.4, 0, 6.6]} scale={1.4} />
      <Palm position={[4.4, 0, -10.6]} scale={1.9} />
      <Palm position={[-9.6, 0, -10.6]} scale={1.6} />
      <Palm position={[1.6, 0, -10.6]} scale={1.3} />
    </>
  );
}
