// Gallery 44 on Gallery Row: the white-cube shell, six framed pieces drawn into
// one canvas atlas texture, plinth sculptures, the curator and a visitor, and
// the open wall where the player's own painting hangs.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BENCH,
  BOUNDS,
  EASEL,
  OPEN_WALL,
  PLINTHS,
} from "../../game/gallery.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { usePaintingTexture } from "./gallery/painting.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 5;

// a true white cube: plain paint, no plaster texture to grey it down
const WHITE = new THREE.MeshStandardMaterial({
  color: "#f6f4f0",
  roughness: 0.9,
});
const OAK = surface("oak_wood_planks", {
  scale: 1,
  color: "#c89a6a",
  roughness: 0.5,
});
const FRAME = new THREE.MeshStandardMaterial({
  color: "#1a1a1e",
  roughness: 0.4,
});
const SPOT = new THREE.MeshBasicMaterial({
  color: hdr("#fff6e0", 2.4),
  toneMapped: false,
});
const TRACK = new THREE.MeshStandardMaterial({
  color: "#2a2a30",
  roughness: 0.5,
});

/** The six pieces on show: where each hangs, its size and how it's made. */
type Piece = {
  at: [number, number, number];
  ry: number;
  w: number;
  h: number;
  title: string;
  artist: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
};

const PIECES: readonly Piece[] = [
  {
    at: [-4.5, 2.4, z0 + 0.04],
    ry: 0,
    w: 2.2,
    h: 2.8,
    title: "Two Pinks, Dusk",
    artist: "R. Okafor",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#3a1a2a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ff5a8a";
      ctx.fillRect(w * 0.1, h * 0.08, w * 0.8, h * 0.42);
      ctx.fillStyle = "#ffb3c8";
      ctx.fillRect(w * 0.1, h * 0.56, w * 0.8, h * 0.36);
    },
  },
  {
    at: [x0 + 0.04, 2.6, 1.8],
    ry: Math.PI / 2,
    w: 3.4,
    h: 2.2,
    title: "Orbit No. 9",
    artist: "M. Laurent",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#f4ecd8";
      ctx.fillRect(0, 0, w, h);
      const colors = ["#2e7dff", "#ff2f9a", "#ffd84f", "#141018", "#3fe0d0"];
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = colors[i % colors.length] ?? "#141018";
        ctx.fillStyle = colors[(i + 2) % colors.length] ?? "#2e7dff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        const x = ((i * 97) % 100) / 100;
        const y = ((i * 61) % 100) / 100;
        ctx.arc(x * w, y * h, 8 + ((i * 13) % 30), 0, Math.PI * 2);
        if (i % 3 === 0) ctx.fill();
        else ctx.stroke();
      }
      ctx.strokeStyle = "#141018";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(((i * 37) % 100) * (w / 100), 0);
        ctx.lineTo(((i * 71) % 100) * (w / 100), h);
        ctx.stroke();
      }
    },
  },
  {
    at: [5.2, 2.4, z0 + 0.04],
    ry: 0,
    w: 2,
    h: 2,
    title: "Grid for a Hot Day",
    artist: "Ana Reyes",
    draw: (ctx, w, h) => {
      const colors = ["#ff8a3d", "#ffd84f", "#ff2f9a", "#f8f4ee"];
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 6; x++) {
          ctx.fillStyle = colors[(x * 3 + y * 5) % colors.length] ?? "#fff";
          ctx.fillRect((x * w) / 6, (y * h) / 6, w / 6 - 2, h / 6 - 2);
        }
    },
  },
  {
    at: [x1 - 0.04, 2.4, -3.4],
    ry: -Math.PI / 2,
    w: 2.4,
    h: 1.6,
    title: "Lagoon, Low Tide",
    artist: "Hana Seo",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#bfe8ff");
      g.addColorStop(0.55, "#3fe0d0");
      g.addColorStop(1, "#1a4a6a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 9; i++) {
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        const y = h * (0.5 + i * 0.05);
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 8)
          ctx.lineTo(x, y + Math.sin(x * 0.06 + i) * 3);
        ctx.stroke();
      }
    },
  },
  {
    at: [x1 - 0.04, 2.4, 1.2],
    ry: -Math.PI / 2,
    w: 1.6,
    h: 2.2,
    title: "Self Portrait in Chrome",
    artist: "D. Whitfield",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#141018";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(
        w / 2,
        h * 0.4,
        4,
        w / 2,
        h * 0.4,
        w * 0.5,
      );
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#9b9bb8");
      g.addColorStop(1, "#2a2a3a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.4, w * 0.28, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w * 0.25, h * 0.66, w * 0.5, h * 0.34);
    },
  },
  {
    at: [x0 + 0.04, 2.4, -3.4],
    ry: Math.PI / 2,
    w: 2.4,
    h: 1.8,
    title: "Night Bus",
    artist: "T. Mendoza",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#1a1438";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ["#ffd84f", "#ff8ad8", "#8adfff"][i % 3] ?? "#fff";
        ctx.fillRect(
          ((i * 53) % 100) * (w / 100),
          h * 0.55 + ((i * 7) % 5) * 4,
          6,
          3,
        );
      }
      ctx.fillStyle = "#ff2f9a";
      ctx.fillRect(w * 0.1, h * 0.62, w * 0.8, h * 0.18);
      ctx.fillStyle = "#ffe8a0";
      for (let x = 0; x < 7; x++)
        ctx.fillRect(w * 0.14 + x * w * 0.105, h * 0.65, w * 0.07, h * 0.07);
    },
  },
];

const PX = 128;

/** Every piece and its wall label, drawn into one atlas: a row per piece. */
function atlasTex() {
  return canvasTex(PX * 2, PX * PIECES.length, (ctx) => {
    PIECES.forEach((p, i) => {
      ctx.save();
      ctx.translate(0, i * PX);
      ctx.beginPath();
      ctx.rect(0, 0, PX, PX);
      ctx.clip();
      p.draw(ctx, PX, PX);
      ctx.restore();
      // the label beside it: white card, title in italics, the artist
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(PX, i * PX, PX, PX);
      ctx.fillStyle = "#141018";
      ctx.font = "italic bold 14px Georgia, serif";
      ctx.fillText(p.title, PX + 8, i * PX + 50, PX - 16);
      ctx.font = "12px sans-serif";
      ctx.fillText(p.artist, PX + 8, i * PX + 72, PX - 16);
    });
  });
}

/** A plane mapped to atlas cell (`col`, `row`). */
function cell(w: number, h: number, col: number, row: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++)
    uv.setXY(
      k,
      (col + uv.getX(k)) / 2,
      1 - (row + 1 - uv.getY(k)) / PIECES.length,
    );
  return g;
}

function useRoom(atlas: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const ART = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.8 });
    // white walls, a dark skirting, track lighting along both long walls
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WHITE, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WHITE, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    b.add(new THREE.BoxGeometry(W, 0.1, 0.04), TRACK, {
      position: [0, 0.05, z0 + 0.02],
    });
    for (const x of [x0 + 0.02, x1 - 0.02])
      b.add(new THREE.BoxGeometry(0.04, 0.1, D), TRACK, {
        position: [x, 0.05, (z0 + z1) / 2],
      });
    b.add(new THREE.BoxGeometry(W - 1, 0.05, 0.05), TRACK, {
      position: [0, H - 0.4, z0 + 1.6],
    });
    for (const x of [x0 + 1.4, x1 - 1.4])
      b.add(new THREE.BoxGeometry(0.05, 0.05, D - 1), TRACK, {
        position: [x, H - 0.4, (z0 + z1) / 2],
      });
    // the pieces in their frames, each with a spot aimed at it and a label
    PIECES.forEach((p, i) => {
      const frame = new THREE.Object3D();
      frame.position.set(...p.at);
      frame.rotation.y = p.ry;
      frame.updateMatrix();
      const put = (
        g: THREE.BufferGeometry,
        m: THREE.Material,
        local: [number, number, number],
      ) => {
        g.translate(...local);
        g.applyMatrix4(frame.matrix);
        b.add(g, m);
      };
      put(new THREE.BoxGeometry(p.w + 0.1, p.h + 0.1, 0.05), FRAME, [0, 0, 0]);
      put(cell(p.w, p.h, 0, i), ART, [0, 0, 0.03]);
      put(cell(0.32, 0.32, 1, i), ART, [p.w / 2 + 0.35, -p.h / 2 + 0.4, 0.01]);
      put(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 10), TRACK, [
        0,
        H - 0.5 - p.at[1],
        1.5,
      ]);
      put(new THREE.CircleGeometry(0.05, 10), SPOT, [
        0,
        H - 0.59 - p.at[1],
        1.5,
      ]);
    });
    // the bench: oak slab on two steel legs
    const bw = BENCH.x1 - BENCH.x0;
    b.add(new THREE.BoxGeometry(bw, 0.08, BENCH.z1 - BENCH.z0 + 0.1), OAK, {
      position: [0, 0.45, 0],
    });
    for (const x of [BENCH.x0 + 0.2, BENCH.x1 - 0.2])
      b.add(new THREE.BoxGeometry(0.06, 0.42, 0.45), TRACK, {
        position: [x, 0.21, 0],
      });
    // sculptures on white plinths: a knot and a stack of glossy spheres
    for (const [x, z] of PLINTHS)
      b.add(new THREE.BoxGeometry(0.8, 1, 0.8), WHITE, {
        position: [x, 0.5, z],
      });
    const [k, s] = PLINTHS;
    if (k)
      b.add(
        painted(
          new THREE.TorusKnotGeometry(0.28, 0.08, 96, 12, 2, 3),
          "#ff2f9a",
        ),
        GLOSS,
        { position: [k[0], 1.5, k[1]] },
      );
    if (s)
      [0.24, 0.18, 0.13].reduce((y, r, i) => {
        b.add(
          painted(
            new THREE.SphereGeometry(r, 20, 14),
            ["#3fe0d0", "#ffd84f", "#9b5cff"][i] ?? "#fff",
          ),
          GLOSS,
          { position: [s[0], y + r, s[1]] },
        );
        return y + r * 2 - 0.02;
      }, 1);
    // the easel: three legs, a ledge, the open wall's frame and label
    for (const [dx, dz, rx, rz] of [
      [-0.25, 0.1, -0.08, 0.12],
      [0.25, 0.1, -0.08, -0.12],
      [0, -0.25, 0.2, 0],
    ] as const)
      b.add(new THREE.BoxGeometry(0.04, 1.8, 0.04), OAK, {
        position: [EASEL[0] + dx, 0.9, EASEL[1] + dz],
        rotation: [rx, 0, rz],
      });
    b.add(new THREE.BoxGeometry(0.7, 0.04, 0.08), OAK, {
      position: [EASEL[0], 0.85, EASEL[1] + 0.14],
    });
    b.add(
      new THREE.BoxGeometry(OPEN_WALL.size + 0.14, OPEN_WALL.size + 0.14, 0.05),
      FRAME,
      { position: [OPEN_WALL.x, OPEN_WALL.y, z0 + 0.03] },
    );
    return b.build();
  }, [atlas]);
}

/** The player's painting on the open wall, and a blank one on the easel
 * until there is one. */
function OpenWall() {
  const tex = usePaintingTexture();
  return (
    <>
      <mesh position={[OPEN_WALL.x, OPEN_WALL.y, z0 + 0.06]}>
        <planeGeometry args={[OPEN_WALL.size, OPEN_WALL.size]} />
        {tex ? (
          <meshStandardMaterial key={tex.uuid} map={tex} roughness={0.8} />
        ) : (
          <meshStandardMaterial key="blank" color="#f8f4ee" roughness={0.9} />
        )}
      </mesh>
      <mesh position={[EASEL[0], 1.32, EASEL[1] + 0.12]} rotation-x={-0.12}>
        <planeGeometry args={[0.8, 0.8]} />
        {tex ? (
          <meshStandardMaterial key={tex.uuid} map={tex} roughness={0.8} />
        ) : (
          <meshStandardMaterial key="blank" color="#f8f4ee" roughness={0.9} />
        )}
      </mesh>
    </>
  );
}

const CURATOR: Look = {
  skin: "#94603f",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "sequin-slip",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};
const VISITOR: Look = {
  ...CURATOR,
  skin: "#f3d4c4",
  hairStyle: "curl-cloud",
  hairColor: "#ffb3d9",
  outfit: "glam-faux-fur",
  outfitColor: "#e8e2ff",
  shadow: "#3fe0d0",
};

/**
 * Gallery 44 on Gallery Row: a white cube under track lights, six pieces on
 * the walls with their labels, a knot and a stack of spheres on plinths, an
 * oak bench down the middle and an easel by the open wall, where the
 * player's own painting hangs.
 */
export function Gallery({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const atlas = useMemo(atlasTex, []);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const room = useRoom(atlas);
  const visitor = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // a visitor drifting slowly along the back wall
    if (!visitor.current || calm) return;
    visitor.current.position.x = Math.sin(clock.elapsedTime * 0.12) * 3.5;
  });
  return (
    <>
      <color attach="background" args={["#e8e4de"]} />
      <hemisphereLight args={["#ffffff", "#c8c0b8", 2.2]} />
      <pointLight
        position={[0, 4, -3]}
        color="#fff6e8"
        intensity={8}
        distance={14}
      />
      <pointLight
        position={[-6, 3.6, 1.6]}
        color="#fff6e8"
        intensity={5}
        distance={8}
      />
      <Floor
        width={W}
        depth={D}
        color="#d8d4ce"
        texture={{ id: "brushed_concrete", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.35 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.gallery} color="#141018" />
      <primitive object={room} />
      <OpenWall />
      <NeonText
        text="gallery 44"
        color="#ff2f9a"
        font={SCRIPT}
        width={2.4}
        k={2}
        position={[OPEN_WALL.x, 4, z0 + 0.06]}
      />
      <TalkingNpc
        name="Odile"
        role="cashier"
        look={CURATOR}
        mood="idle"
        at={[6.4, 0, 3.2]}
        rot={-2.2}
        seed={561}
        greet
        context={{ venue: "gallery", neighborhood: "arts-district" }}
      />
      <group ref={visitor} position={[0, 0, -3]} rotation-y={Math.PI}>
        <CrowdFigure look={VISITOR} seed={562} />
      </group>
    </>
  );
}
