import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BAR,
  BARTENDER,
  BOUNDS,
  CABANAS,
  LOUNGER_HALF,
  LOUNGER_Z,
  LOUNGERS,
  POOL,
  STOOL_X,
  STOOL_ZS,
  TUB,
  TUB_RIM,
} from "../../game/hotelRooftop.ts";
import type { Look, SwimLook } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles } from "./shared/Bottles.tsx";
import { plant, stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, gradientTex, hdr } from "./shared/materials.ts";
import { NeonText, MARQUEE } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { causticTex } from "./waterpark/materials.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
/** The street is 40 m down. */
const STREET_Y = -40;

const TILE = surface("rounded_square_tiled_wall", {
  scale: 1.6,
  color: "#bfe8f0",
});
const STUCCO = surface("white_plaster_02", { scale: 0.6, color: "#fff4ea" });
const TEAK = surface("wood_veneer", {
  scale: 1.2,
  color: "#a8703a",
  roughness: 0.5,
});
const CANVAS = surface("fabric_pattern_05", { scale: 2, color: "#fff8f0" });
const CUSHION = surface("fabric_leather_02", {
  scale: 1,
  color: "#ff7aa8",
  roughness: 0.8,
});
const RAIL_GLASS = new THREE.MeshStandardMaterial({
  color: "#d8f4ff",
  transparent: true,
  opacity: 0.18,
  roughness: 0.05,
});
const STEEL = new THREE.MeshStandardMaterial({
  color: "#e0e4ec",
  metalness: 0.5,
  roughness: 0.3,
});
const SHADE = ["#ff4fb3", "#ffffff"] as const;

const BARTENDER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffb02e",
};
const LIFEGUARD_LOOK: Look = {
  ...BARTENDER_LOOK,
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#f1d78f",
  outfit: "hoodie-bikers",
  outfitColor: "#ff2f9a",
};
/** Guests: lying out, in the pool and in the tub. */
const GUESTS: readonly {
  look: Look;
  swim: SwimLook;
  at: [number, number, number];
  rot: number;
  mood: "idle" | "sit";
  bob?: true;
}[] = [
  {
    look: {
      ...BARTENDER_LOOK,
      skin: "#f3d4c4",
      hairStyle: "waves",
      hairColor: "#ff4fb3",
    },
    swim: { style: "bikini", color: "#3fe0d0" },
    at: [-2.5, -0.95, -6.2],
    rot: 0.4,
    mood: "idle",
    bob: true,
  },
  {
    look: {
      ...BARTENDER_LOOK,
      skin: "#633c29",
      hairStyle: "coils",
      hairColor: "#1b1014",
    },
    swim: { style: "one-piece", color: "#ffb02e" },
    at: [1.4, -0.95, -6.6],
    rot: -0.5,
    mood: "idle",
    bob: true,
  },
  {
    look: {
      ...BARTENDER_LOOK,
      skin: "#c48d68",
      hairStyle: "top-knot",
      hairColor: "#4a2a1c",
    },
    swim: { style: "bikini", color: "#ff2f9a" },
    at: [TUB[0] + 0.78, 0.32 - 0.33, TUB[1]],
    rot: -Math.PI / 2,
    mood: "sit",
  },
];

/** A bright late-afternoon sky. */
const SKY = gradientTex([
  [0, "#ffb38a"],
  [0.35, "#ffd8c0"],
  [0.7, "#8fd0ff"],
  [1, "#3a8fe0"],
]);

/** Daylight windows: pale glass in a steel grid. */
function windowsTex() {
  return canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = "#8a9cb4";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = (x * 3 + y * 5) % 7 === 0 ? "#fff0d0" : "#3a6a9a";
        ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12);
      }
  });
}

/** The towers all round, below and beyond the deck, as one mesh. */
function skylineGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 48; i++) {
    const n = Math.sin(i * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    // the open side is the pool's: towers across the back and sides
    const a = Math.PI * (0.55 + (i / 48) * 0.9) + r * 0.05;
    const dist = 30 + ((r * 7.1) % 1) * 90;
    const w = 5 + ((r * 3.7) % 1) * 6;
    const d = 5 + ((r * 5.3) % 1) * 6;
    const h = dist > 70 ? 34 + ((r * 9.7) % 1) * 40 : 18 + ((r * 9.7) % 1) * 18;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++)
      uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    g.translate(Math.sin(a) * dist, STREET_Y + h / 2, Math.cos(a) * dist);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Skyline parts have mismatched attributes.");
  return merged;
}

function useDeck() {
  return useMemo(() => {
    const b = new Batch();
    const pw = POOL.x1 - POOL.x0;
    const pd = POOL.z1 - POOL.z0;
    const pcx = (POOL.x0 + POOL.x1) / 2;
    const pcz = (POOL.z0 + POOL.z1) / 2;
    // the pool's tiled basin, sunk into the deck, and its coping
    b.add(new THREE.BoxGeometry(pw, 0.05, pd), TILE, {
      position: [pcx, -1.4, pcz],
    });
    for (const [x, z, w, d] of [
      [pcx, POOL.z1, pw, 0.1],
      [POOL.x0, pcz, 0.1, pd],
      [POOL.x1, pcz, 0.1, pd],
    ] as const)
      b.add(new THREE.BoxGeometry(w, 1.4, d), TILE, {
        position: [x, -0.7, z],
      });
    for (const [x, z, w, d] of [
      [pcx, POOL.z1 + 0.15, pw + 0.6, 0.3],
      [POOL.x0 - 0.15, pcz, 0.3, pd],
      [POOL.x1 + 0.15, pcz, 0.3, pd],
    ] as const)
      b.add(new THREE.BoxGeometry(w, 0.06, d), STUCCO, {
        position: [x, 0.02, z],
      });
    // the infinity edge: a low spill wall the water runs over
    b.add(new THREE.BoxGeometry(pw, 1.6, 0.12), TILE, {
      position: [pcx, -0.95, POOL.z0 - 0.06],
    });
    // the deck's skirt down the building's face, so the edge has depth
    b.add(new THREE.BoxGeometry(W, 3, 0.3), STUCCO, {
      position: [0, -1.5, z0 - 0.3],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, 3, D), STUCCO, {
        position: [x, -1.5, (z0 + z1) / 2],
      });
    // glass rails down the sides and behind the tub
    for (const x of [x0, x1])
      b.add(new THREE.BoxGeometry(0.04, 1.1, D), RAIL_GLASS, {
        position: [x, 0.55, (z0 + z1) / 2],
      });
    b.add(new THREE.BoxGeometry(x1 - POOL.x1 - 0.3, 1.1, 0.04), RAIL_GLASS, {
      position: [(x1 + POOL.x1 + 0.3) / 2, 0.55, z0],
    });
    b.add(new THREE.BoxGeometry(POOL.x0 - x0 - 0.3, 1.1, 0.04), RAIL_GLASS, {
      position: [(x0 + POOL.x0 - 0.3) / 2, 0.55, z0],
    });
    for (const x of [x0, x1])
      b.add(new THREE.BoxGeometry(0.06, 0.05, D), STEEL, {
        position: [x, 1.12, (z0 + z1) / 2],
      });
    // the hot tub: a tiled drum
    b.add(
      new THREE.CylinderGeometry(TUB_RIM, TUB_RIM, 0.62, 24, 1, true),
      TILE,
      { position: [TUB[0], 0.31, TUB[1]] },
    );
    b.add(new THREE.TorusGeometry(TUB_RIM, 0.08, 6, 24), STUCCO, {
      position: [TUB[0], 0.62, TUB[1]],
      rotation: [Math.PI / 2, 0, 0],
    });
    // loungers: a teak frame, a pink cushion, the back propped up poolside;
    // an umbrella between each pair
    for (const x of LOUNGERS) {
      b.add(new THREE.BoxGeometry(0.7, 0.24, LOUNGER_HALF * 2), TEAK, {
        position: [x, 0.22, LOUNGER_Z],
      });
      b.add(new THREE.BoxGeometry(0.64, 0.06, LOUNGER_HALF * 1.3), CUSHION, {
        position: [x, 0.37, LOUNGER_Z + LOUNGER_HALF * 0.33],
      });
      b.add(new THREE.BoxGeometry(0.64, 0.06, 0.7), CUSHION, {
        position: [x, 0.55, LOUNGER_Z - LOUNGER_HALF + 0.3],
        rotation: [0.6, 0, 0],
      });
    }
    LOUNGERS.slice(0, -1).forEach((x, i) => {
      const ux = x + 1.2;
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), STEEL, {
        position: [ux, 1.2, LOUNGER_Z],
      });
      for (let k = 0; k < 8; k++)
        b.add(
          new THREE.ConeGeometry(
            1.1,
            0.4,
            3,
            1,
            true,
            (k / 8) * Math.PI * 2,
            Math.PI / 4,
          ),
          surface("fabric_pattern_05", {
            scale: 2,
            color: SHADE[(k + i) % 2] ?? "#ffffff",
          }),
          { position: [ux, 2.45, LOUNGER_Z] },
        );
    });
    // the pool bar: stucco front, teak top, a back bar of bottles
    const bd = BAR.z1 - BAR.z0;
    const bz = (BAR.z0 + BAR.z1) / 2;
    b.add(new THREE.BoxGeometry(BAR.x1 - BAR.x0, 1.05, bd), STUCCO, {
      position: [(BAR.x0 + BAR.x1) / 2, 0.525, bz],
    });
    b.add(new THREE.BoxGeometry(BAR.x1 - BAR.x0 + 0.2, 0.07, bd + 0.1), TEAK, {
      position: [(BAR.x0 + BAR.x1) / 2, 1.08, bz],
    });
    // a pergola over the bar
    for (const [x, z] of [
      [BAR.x0 - 0.2, BAR.z0 - 0.2],
      [BAR.x0 - 0.2, BAR.z1 + 0.2],
      [BAR.x1 + 0.6, BAR.z0 - 0.2],
      [BAR.x1 + 0.6, BAR.z1 + 0.2],
    ] as const)
      b.add(new THREE.BoxGeometry(0.14, 3, 0.14), TEAK, {
        position: [x, 1.5, z],
      });
    for (let z = BAR.z0 - 0.2; z <= BAR.z1 + 0.25; z += 0.5)
      b.add(new THREE.BoxGeometry(1.7, 0.08, 0.08), TEAK, {
        position: [(BAR.x0 + BAR.x1) / 2 + 0.2, 3.02, z],
      });
    // cabanas: four posts, a canvas roof, curtains tied back, a daybed
    for (const [x, z] of CABANAS) {
      for (const [dx, dz] of [
        [-0.8, -0.9],
        [-0.8, 0.9],
        [1.8, -0.9],
        [1.8, 0.9],
      ] as const)
        b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), STUCCO, {
          position: [x + dx, 1.3, z + dz],
        });
      b.add(new THREE.BoxGeometry(2.8, 0.1, 2), CANVAS, {
        position: [x + 0.5, 2.62, z],
      });
      for (const dz of [-0.9, 0.9])
        b.add(new THREE.BoxGeometry(0.06, 2.4, 0.3), CANVAS, {
          position: [x - 0.8, 1.3, z + dz * 0.85],
        });
      b.add(new THREE.BoxGeometry(2.4, 0.4, 1.7), TEAK, {
        position: [x + 0.5, 0.2, z],
      });
      b.add(new THREE.BoxGeometry(2.3, 0.14, 1.6), CANVAS, {
        position: [x + 0.5, 0.45, z],
      });
      b.add(new THREE.BoxGeometry(0.3, 0.5, 1.5), CUSHION, {
        position: [x + 1.5, 0.7, z],
      });
    }
    for (const [x, z] of [
      [x0 + 0.7, z1 - 0.8],
      [x1 - 0.7, z1 - 0.8],
      [x0 + 0.7, -3.4],
    ] as const)
      plant(b, { x, z }, 1.6);
    stringLights(b, [x0 + 0.2, 3, z1 - 0.4], [x0 + 0.2, 3, -2], 12, "#ffd27a");
    stringLights(b, [x1 - 0.2, 3, z1 - 0.4], [x1 - 0.2, 3, -2], 12, "#ffd27a");
    return b.build();
  }, []);
}

/** The pool's water: caustics drifting across a bright tiled blue. */
function useWater() {
  return useMemo(() => {
    const caustic = causticTex();
    caustic.wrapS = caustic.wrapT = THREE.RepeatWrapping;
    caustic.repeat.set(3, 1.2);
    const mat = new THREE.MeshStandardMaterial({
      color: "#4ac8e8",
      emissive: "#bff4ff",
      emissiveMap: caustic,
      emissiveIntensity: 0.55,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    return { mat, caustic };
  }, []);
}

/**
 * The Marquise Rooftop, on top of the hotel on Park Avenue: a late
 * afternoon pool deck forty floors up, an infinity pool spilling toward the
 * skyline, pink-cushioned loungers under striped umbrellas, a bubbling hot
 * tub, a pool bar under a pergola and two canvas cabanas. Swimwear on.
 */
export function HotelRooftop({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const deck = useDeck();
  const skyline = useMemo(skylineGeometry, []);
  const windows = useMemo(windowsTex, []);
  const water = useWater();
  useEffect(
    () => () => {
      skyline.dispose();
      windows.dispose();
      water.caustic.dispose();
      water.mat.dispose();
    },
    [skyline, windows, water],
  );
  const swimmers = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }, dt) => {
    if (calm) return;
    water.caustic.offset.x += dt * 0.02;
    water.caustic.offset.y += dt * 0.013;
    const t = clock.elapsedTime;
    GUESTS.forEach((g, i) => {
      const s = swimmers.current[i];
      if (s && g.bob) s.position.y = g.at[1] + Math.sin(t * 1.6 + i) * 0.04;
    });
  });
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, 0] as const),
    [],
  );
  const pw = POOL.x1 - POOL.x0;
  const pd = POOL.z1 - POOL.z0;
  return (
    <>
      <mesh scale={[400, 400, 400]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial map={SKY} side={THREE.BackSide} fog={false} />
      </mesh>
      <fog attach="fog" args={["#ffd8c8", 110, 320]} />
      <mesh geometry={skyline}>
        <meshBasicMaterial map={windows} color="#e8eef8" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={STREET_Y}>
        <circleGeometry args={[240, 32]} />
        <meshBasicMaterial color="#6a7088" />
      </mesh>
      <mesh position={[60, 22, -160]}>
        <circleGeometry args={[9, 40]} />
        <meshBasicMaterial
          color={hdr("#fff2c8", 1.8)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <hemisphereLight args={["#fff4e0", "#c8a088", 2.2]} />
      <directionalLight
        position={[20, 18, -30]}
        color="#ffd8a8"
        intensity={2.2}
      />
      {/* the deck in three pieces, round the sunken pool */}
      {(
        [
          [x0, POOL.z1, x1, z1],
          [x0, z0, POOL.x0, POOL.z1],
          [POOL.x1, z0, x1, POOL.z1],
        ] as const
      ).map(([a, b, c, d]) => (
        <Floor
          key={`${a},${b}`}
          width={c - a}
          depth={d - b}
          center={[(a + c) / 2, (b + d) / 2]}
          color="#f0e4d4"
          texture={{ id: "long_white_tiles", scale: 0.6 }}
          low={{ metalness: 0, roughness: 0.7 }}
          onPick={onPick}
        />
      ))}
      <PortalPads room={ROOMS["hotel-rooftop"]} color="#ffd166" />
      <primitive object={deck} />
      <mesh
        material={water.mat}
        position={[(POOL.x0 + POOL.x1) / 2, -0.12, (POOL.z0 + POOL.z1) / 2]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[pw, pd]} />
      </mesh>
      <mesh
        material={water.mat}
        position={[TUB[0], 0.5, TUB[1]]}
        rotation-x={-Math.PI / 2}
      >
        <circleGeometry args={[TUB_RIM - 0.04, 24]} />
      </mesh>
      <BarStools at={stools} color="#ff7aa8" />
      {/* bottles along the bar top, the row turned to run down the bar */}
      <group position={[BAR.x0 + 0.2, 0, 0]} rotation-y={-Math.PI / 2}>
        <Bottles
          rows={[
            { x0: BAR.z0 + 0.3, x1: BAR.z1 - 0.3, y: 1.12, z: 0, count: 9 },
          ]}
          seed={47}
        />
      </group>
      <Palm position={[x1 - 0.8, 0, -3.4]} scale={1.3} />
      <Palm position={[x0 + 0.8, 0, z1 - 2.4]} scale={1.2} />
      <NeonText
        text="THE MARQUISE"
        color="#ffd166"
        font={MARQUEE}
        width={4}
        k={1.6}
        position={[-6.4, 3.4, z1 - 0.2]}
        rotation-y={Math.PI}
      />
      <TalkingNpc
        name="Simone"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[BARTENDER[0], 0, BARTENDER[1]]}
        rot={Math.PI / 2}
        seed={521}
        greet
        context={{ venue: "hotel-rooftop", neighborhood: "uptown" }}
      />
      <TalkingNpc
        name="Dani"
        role="lifeguard"
        look={LIFEGUARD_LOOK}
        mood="idle"
        at={[POOL.x1 + 0.9, 0, -4.2]}
        rot={-2.4}
        seed={522}
        context={{ venue: "hotel-rooftop", neighborhood: "uptown" }}
      />
      {GUESTS.map((g, i) => (
        <group
          key={i}
          ref={(el) => {
            swimmers.current[i] = el;
          }}
          position={g.at}
          rotation-y={g.rot}
        >
          <Doll look={g.look} swim={g.swim} mood={g.mood} seed={530 + i} />
        </group>
      ))}
    </>
  );
}
