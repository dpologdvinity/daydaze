import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { CARS as ROSTER } from "../../game/driving/roster.ts";
import {
  BOUNDS,
  CARHOP,
  CARS,
  DINER,
  SCREEN,
  TABLES,
} from "../../game/driveIn.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { CarMesh } from "./speedway/CarMesh.tsx";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, gradientTex, hdr, neonMat } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
/** The film runs at a projector's 12 frames a second. */
const FILM_FPS = 12;
const FILM_W = 256;
const FILM_H = 128;

const FENCE = surface("wood_plank_wall", {
  scale: 0.6,
  color: "#6a5a7a",
  roughness: 0.8,
});
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#a8703a",
  roughness: 0.6,
});
const CHROME = surface("metal_plate", {
  scale: 1,
  color: "#d8dce8",
  roughness: 0.3,
});
const STEEL = new THREE.MeshStandardMaterial({
  color: "#c8ccd8",
  metalness: 0.4,
  roughness: 0.35,
});
const FRAME = new THREE.MeshStandardMaterial({
  color: "#e8e4f0",
  roughness: 0.6,
});
const WINDOW = new THREE.MeshBasicMaterial({
  color: hdr("#fff0c8", 1.6),
  toneMapped: false,
});
const PINK = neonMat("#ff2f9a", 2.4);
const NIGHT = gradientTex([
  [0, "#2a1440"],
  [0.5, "#120a2a"],
  [1, "#05040e"],
]);

const CARHOP_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "ponytail",
  hairColor: "#ff8a3d",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "shorts",
  outfitColor: "#ff2f9a",
  shadow: "#3fe0d0",
};
const DATES: readonly {
  look: Look;
  at: [number, number, number];
  rot: number;
}[] = [
  {
    look: {
      ...CARHOP_LOOK,
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      outfit: "jeans",
      outfitColor: "#3a5a8a",
    },
    at: [-4.2, 0, -2.2],
    rot: Math.PI,
  },
  {
    look: {
      ...CARHOP_LOOK,
      skin: "#f3d4c4",
      hairStyle: "waves",
      hairColor: "#f1d78f",
      outfit: "sundress",
      outfitColor: "#ffb02e",
    },
    at: [-3.5, 0, -2.4],
    rot: Math.PI + 0.3,
  },
];

/** Draws one frame of the feature: "Moon Girls", a pink rocket's trip to
 * the moon, with title cards between the shots. */
function drawFilm(ctx: CanvasRenderingContext2D, t: number) {
  const loop = t % 24;
  ctx.fillStyle = "#0a0820";
  ctx.fillRect(0, 0, FILM_W, FILM_H);
  if (loop < 3 || (loop > 12 && loop < 14)) {
    // a title card on old film: cream on black, a flicker of grain
    ctx.fillStyle = "#141018";
    ctx.fillRect(0, 0, FILM_W, FILM_H);
    ctx.fillStyle = "#f4ecd8";
    ctx.textAlign = "center";
    ctx.font = "italic bold 22px Georgia, serif";
    ctx.fillText(loop < 3 ? "Moon Girls" : "Chapter Two", FILM_W / 2, 60);
    ctx.font = "11px Georgia, serif";
    ctx.fillText(
      loop < 3 ? "a Starlite Picture" : "the far side",
      FILM_W / 2,
      82,
    );
  } else {
    // stars streaming past, the moon coming closer, the rocket bobbing
    for (let i = 0; i < 40; i++) {
      const x =
        (((i * 53 - loop * (20 + (i % 5) * 8)) % FILM_W) + FILM_W) % FILM_W;
      const y = (i * 29) % FILM_H;
      ctx.fillStyle = i % 4 ? "#ffffff" : "#ffd84f";
      ctx.fillRect(x, y, i % 3 ? 1 : 2, 1);
    }
    const near = loop > 14 ? (loop - 14) / 10 : (loop - 3) / 9;
    const r = 14 + near * 40;
    ctx.fillStyle = "#f4ecd8";
    ctx.beginPath();
    ctx.arc(FILM_W - 40 - near * 30, 40 + near * 10, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8ccb8";
    for (const [dx, dy, cr] of [
      [-0.3, -0.2, 0.18],
      [0.25, 0.1, 0.12],
      [-0.1, 0.35, 0.1],
    ] as const) {
      ctx.beginPath();
      ctx.arc(
        FILM_W - 40 - near * 30 + dx * r,
        40 + near * 10 + dy * r,
        cr * r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    const rx = 50 + Math.sin(loop * 0.7) * 10 + near * 30;
    const ry = 70 + Math.sin(loop * 2.1) * 8;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-0.25);
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.lineTo(-32 - ((loop * 12) % 6), 0);
    ctx.lineTo(-22, 4);
    ctx.fill();
    ctx.fillStyle = "#ff4fb3";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bfe8ff";
    ctx.beginPath();
    ctx.arc(8, -1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // the projector's flicker and a scratch now and then
  ctx.fillStyle = `rgba(255,240,200,${0.04 + ((t * 37) % 1) * 0.04})`;
  ctx.fillRect(0, 0, FILM_W, FILM_H);
  if ((t * 7) % 3 < 0.4) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(((t * 97) % 1) * FILM_W, 0, 1, FILM_H);
  }
}

function useLot() {
  return useMemo(() => {
    const b = new Batch();
    // fences round the lot
    b.add(new THREE.BoxGeometry(W, 1.6, 0.12), FENCE, {
      position: [0, 0.8, z0],
    });
    for (const x of [x0, x1])
      b.add(new THREE.BoxGeometry(0.12, 1.6, D), FENCE, {
        position: [x, 0.8, (z0 + z1) / 2],
      });
    // the screen: a white face on a lattice of posts, over the back fence
    const top = SCREEN.base + SCREEN.height;
    b.add(
      new THREE.BoxGeometry(SCREEN.width + 0.6, SCREEN.height + 0.6, 0.3),
      FRAME,
      {
        position: [0, SCREEN.base + SCREEN.height / 2, SCREEN.z - 0.2],
      },
    );
    for (
      let x = -SCREEN.width / 2;
      x <= SCREEN.width / 2;
      x += SCREEN.width / 4
    )
      b.add(new THREE.BoxGeometry(0.25, top + 0.3, 0.25), FRAME, {
        position: [x, (top + 0.3) / 2, SCREEN.z - 0.6],
      });
    // speaker posts beside each car
    for (const {
      at: [x, z],
    } of CARS) {
      b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8), STEEL, {
        position: [x - 1.6, 0.6, z + 0.6],
      });
      b.add(new THREE.BoxGeometry(0.22, 0.28, 0.12), STEEL, {
        position: [x - 1.6, 1.3, z + 0.6],
      });
    }
    // the diner: chrome walls, a glowing walk-up window, a pink stripe
    const dw = DINER.x1 - DINER.x0;
    const dd = DINER.z1 - DINER.z0;
    const dx = (DINER.x0 + DINER.x1) / 2;
    const dz = (DINER.z0 + DINER.z1) / 2;
    b.add(new THREE.BoxGeometry(dw, 3.4, dd), CHROME, {
      position: [dx, 1.7, dz],
    });
    b.add(new THREE.BoxGeometry(0.05, 1, dd - 1.6), WINDOW, {
      position: [DINER.x0 - 0.03, 1.6, dz],
    });
    b.add(new THREE.BoxGeometry(0.06, 0.12, dd), PINK, {
      position: [DINER.x0 - 0.04, 2.6, dz],
    });
    b.add(new THREE.BoxGeometry(0.9, 0.08, dd - 1), WOOD, {
      position: [DINER.x0 - 0.4, 1.05, dz],
    });
    // the awning: pink and white stripes
    for (let i = 0; i < 10; i++)
      b.add(new THREE.BoxGeometry(1.2, 0.04, dd / 10), i % 2 ? FRAME : PINK, {
        position: [DINER.x0 - 0.5, 2.9, DINER.z0 + (i + 0.5) * (dd / 10)],
        rotation: [0, 0, -0.35],
      });
    // picnic tables and their benches
    for (const [x, z] of TABLES) {
      b.add(new THREE.BoxGeometry(1.8, 0.06, 0.7), WOOD, {
        position: [x, 0.75, z],
      });
      for (const side of [-1, 1]) {
        b.add(new THREE.BoxGeometry(1.8, 0.05, 0.28), WOOD, {
          position: [x, 0.45, z + side * 0.42],
        });
        b.add(new THREE.BoxGeometry(0.06, 0.75, 0.06), WOOD, {
          position: [x + side * 0.75, 0.375, z],
        });
      }
    }
    stringLights(
      b,
      [x0 + 0.2, 2.6, z1 - 0.3],
      [DINER.x0 - 0.2, 2.6, z1 - 0.3],
      18,
    );
    stringLights(
      b,
      [x0 + 0.2, 2.6, z1 - 0.3],
      [x0 + 0.2, 2.6, z0 + 0.4],
      14,
      "#ff8ad8",
    );
    return b.build();
  }, []);
}

/** The feature on the big screen, redrawn twelve times a second, and its
 * glow on the lot. */
function Screen() {
  const calm = useReducedMotion();
  const film = useMemo(
    () => canvasTex(FILM_W, FILM_H, (ctx) => drawFilm(ctx, 4)),
    [],
  );
  useEffect(() => () => film.dispose(), [film]);
  const ctx = useMemo(() => {
    const image: unknown = film.image;
    return image instanceof HTMLCanvasElement ? image.getContext("2d") : null;
  }, [film]);
  const last = useRef(-1);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (calm || !ctx) return;
    const frame = Math.floor(clock.elapsedTime * FILM_FPS);
    if (frame === last.current) return;
    last.current = frame;
    const t = frame / FILM_FPS;
    drawFilm(ctx, t);
    film.needsUpdate = true;
    if (glow.current)
      glow.current.intensity =
        t % 24 < 3 || (t % 24 > 12 && t % 24 < 14) ? 4 : 7;
  });
  return (
    <>
      <mesh position={[0, SCREEN.base + SCREEN.height / 2, SCREEN.z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        <meshBasicMaterial map={film} toneMapped={false} />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, SCREEN.base + 2, SCREEN.z + 4]}
        color="#c8d8ff"
        intensity={7}
        distance={22}
      />
    </>
  );
}

/** The night sky's stars, one points mesh. */
function Stars() {
  const geometry = useMemo(() => {
    const p = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const e = 0.15 + ((i * 0.618) % 1) * 1.2;
      p.set(
        [
          Math.cos(a) * Math.cos(e) * 150,
          Math.sin(e) * 150,
          Math.sin(a) * Math.cos(e) * 150,
        ],
        i * 3,
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={1.2}
        sizeAttenuation={false}
        fog={false}
      />
    </points>
  );
}

/**
 * The Starlite Drive-In on Maple Drive: a lot under the stars, four classic
 * cars parked facing a giant screen playing "Moon Girls", speaker posts, a
 * chrome diner with a glowing walk-up window under a striped awning, picnic
 * tables, and Dot the carhop.
 */
export function DriveIn({ onPick }: { onPick: PickHandler }): JSX.Element {
  const lot = useLot();
  const specs = useMemo(
    () => CARS.map((c) => ({ ...c, spec: ROSTER.find((r) => r.id === c.id) })),
    [],
  );
  return (
    <>
      <mesh scale={[300, 300, 300]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial map={NIGHT} side={THREE.BackSide} fog={false} />
      </mesh>
      <Stars />
      <mesh position={[-60, 50, -140]}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial
          color={hdr("#fff4dc", 1.5)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <hemisphereLight args={["#6a5aa8", "#1a1028", 1.2]} />
      <pointLight
        position={[DINER.x0 - 1.5, 2.6, (DINER.z0 + DINER.z1) / 2]}
        color="#ffd8a8"
        intensity={7}
        distance={10}
      />
      <Floor
        width={W}
        depth={D}
        color="#6a6878"
        texture={{ id: "asphalt_02", scale: 0.3 }}
        low={{ metalness: 0, roughness: 0.85 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["drive-in"]} color="#ff2f9a" />
      <primitive object={lot} />
      <Screen />
      {specs.map(({ at: [x, z], spec, color, id }) =>
        spec ? (
          <group key={id} position={[x, 0, z]} rotation-y={Math.PI}>
            <CarMesh
              spec={spec}
              color={color}
              // CarMesh starts hidden for the speedway's own placement
              ref={(g: THREE.Group | null) => {
                if (g) g.visible = true;
              }}
            />
          </group>
        ) : null,
      )}
      <NeonText
        text="Starlite"
        color="#ff2f9a"
        font={SCRIPT}
        width={2.6}
        k={2.4}
        position={[DINER.x0 - 0.06, 3.3, (DINER.z0 + DINER.z1) / 2]}
        rotation-y={-Math.PI / 2}
        flicker
      />
      <TalkingNpc
        name="Dot"
        role="server"
        look={CARHOP_LOOK}
        mood="idle"
        at={[CARHOP[0], 0, CARHOP[1]]}
        rot={-Math.PI / 2}
        seed={591}
        greet
        context={{ venue: "drive-in", neighborhood: "suburbia" }}
      />
      {DATES.map((d, i) => (
        <group key={i} position={d.at} rotation-y={d.rot}>
          <CrowdFigure look={d.look} move="chatting" seed={592 + i} />
        </group>
      ))}
    </>
  );
}
