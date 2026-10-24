// Espresso Lab on Gallery Row: tiled cafe shell, the espresso machine, pastry
// case, a canvas chalkboard menu listing the barista drinks from
// game/barista.ts, Rafi the barista and a regular.

import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { ESPRESSO } from "../../game/barista.ts";
import {
  BARISTA,
  BOUNDS,
  COUNTER,
  MACHINE_X,
  TABLES,
} from "../../game/espressoLab.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted, plant, shelf } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4;

const PLASTER = surface("painted_plaster_wall", {
  scale: 0.5,
  color: "#f4ece0",
});
const TILE = surface("square_tiled_wall", { scale: 0.8, color: "#e8f4ee" });
const WOOD = surface("oak_wood_planks", {
  scale: 1,
  color: "#b07a4a",
  roughness: 0.5,
});
const MARBLE = surface("marble_01", { scale: 1, roughness: 0.15 });
// brushed steel rather than mirror chrome: the low tier has no environment
// map for a fully metallic surface to reflect, so it would read black
const CHROME = new THREE.MeshStandardMaterial({
  color: "#d8dce4",
  metalness: 0.45,
  roughness: 0.25,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.4,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#dff4ff",
  transparent: true,
  opacity: 0.22,
  roughness: 0.05,
});
const BULB = new THREE.MeshBasicMaterial({
  color: hdr("#ffcf8a", 2.4),
  toneMapped: false,
});

const BARISTA_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-y2k-thin",
  outfit: "jeans",
  outfitColor: "#6b7a2a",
  shadow: "#ffb02e",
};
const REGULAR: Look = {
  ...BARISTA_LOOK,
  skin: "#f3d4c4",
  hairStyle: "waves",
  hairColor: "#b77a3e",
  outfit: "hoodie-bikers",
  outfitColor: "#f2e6c8",
  shadow: "#7b4dff",
};

/** The chalkboard: every drink on the menu and what goes in it. */
function menuTex() {
  return canvasTex(512, 384, (ctx) => {
    ctx.fillStyle = "#1e2420";
    ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, 512, 384);
    ctx.fillStyle = "#f4f0e0";
    ctx.textAlign = "center";
    ctx.font = "italic bold 34px serif";
    ctx.fillText("Today's Menu", 256, 50);
    ctx.textAlign = "left";
    const short = (id: string) =>
      (
        ESPRESSO.ingredients.find((i) => i.id === id)?.label ?? id
      ).toLowerCase();
    ESPRESSO.menu.forEach((d, i) => {
      const y = 92 + i * 32;
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = ["#ffd166", "#f4f0e0", "#ff9ec2"][i % 3] ?? "#fff";
      ctx.fillText(d.name, 28, y);
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#c8d0c8";
      ctx.fillText(d.recipe.map(short).join(" + "), 230, y);
    });
  });
}

function useRoom(menu: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const BOARD = new THREE.MeshStandardMaterial({ map: menu, roughness: 0.9 });
    // plaster walls, a tiled splashback behind the counter
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), PLASTER, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), PLASTER, {
        position: [x, H / 2, 0],
      });
    const cw = COUNTER.x1 - COUNTER.x0;
    const cx = (COUNTER.x0 + COUNTER.x1) / 2;
    b.add(new THREE.BoxGeometry(cw, 1.4, 0.04), TILE, {
      position: [cx, 1.6, z0 + 0.02],
    });
    // the back counter and two shelves of bean bags over it
    b.add(new THREE.BoxGeometry(cw, 0.95, 0.5), WOOD, {
      position: [cx, 0.475, -5.75],
    });
    for (const [row, y] of [2.5, 3.1].entries()) {
      shelf(b, { x: cx + 2.2, y, z: z0 + 0.15 }, 3.6, WOOD);
      for (let i = 0; i < 9; i++)
        b.add(
          painted(
            new THREE.BoxGeometry(0.22, 0.32, 0.12),
            ["#c8a06a", "#3a2a1a", "#e8dcc8", "#ff9ec2"][(i + row * 3) % 4] ??
              "#c8a06a",
          ),
          GLOSS,
          { position: [cx + 0.6 + i * 0.38, y + 0.16, z0 + 0.15] },
        );
    }
    // the chalkboard menu
    b.add(new THREE.PlaneGeometry(2.6, 1.95), BOARD, {
      position: [-3.3, 2.75, z0 + 0.03],
    });
    // the counter: tiled front, marble top
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    const cd = COUNTER.z1 - COUNTER.z0;
    b.add(new THREE.BoxGeometry(cw, 1.0, cd), TILE, {
      position: [cx, 0.5, cz],
    });
    b.add(new THREE.BoxGeometry(cw + 0.1, 0.06, cd + 0.1), MARBLE, {
      position: [cx, 1.03, cz],
    });
    // the espresso machine: chrome body, two group heads, a steam wand
    b.add(new THREE.BoxGeometry(1.1, 0.5, 0.55), CHROME, {
      position: [MACHINE_X, 1.31, cz - 0.1],
    });
    b.add(new THREE.BoxGeometry(1.1, 0.06, 0.55), BLACK, {
      position: [MACHINE_X, 1.59, cz - 0.1],
    });
    for (const dx of [-0.25, 0.25]) {
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), CHROME, {
        position: [MACHINE_X + dx, 1.12, cz + 0.2],
      });
      b.add(new THREE.BoxGeometry(0.03, 0.03, 0.22), BLACK, {
        position: [MACHINE_X + dx, 1.08, cz + 0.32],
      });
      b.add(
        painted(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10), "#2a2420"),
        GLOSS,
        {
          position: [MACHINE_X + dx, 1.095, cz + 0.2],
        },
      );
    }
    b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), CHROME, {
      position: [MACHINE_X + 0.5, 1.2, cz + 0.2],
      rotation: [0.3, 0, 0],
    });
    // the grinder: a black body under a clear hopper
    b.add(new THREE.BoxGeometry(0.22, 0.4, 0.28), BLACK, {
      position: [MACHINE_X - 0.9, 1.26, cz - 0.1],
    });
    b.add(new THREE.CylinderGeometry(0.14, 0.06, 0.24, 12), GLASS, {
      position: [MACHINE_X - 0.9, 1.58, cz - 0.1],
    });
    // the pastry case and what's in it
    b.add(new THREE.BoxGeometry(1.6, 0.5, 0.6), GLASS, {
      position: [2.6, 1.31, cz],
    });
    for (let i = 0; i < 8; i++)
      b.add(
        painted(
          new THREE.SphereGeometry(0.07, 10, 6),
          ["#d8a050", "#9b5cff", "#f4d8a0", "#ff9ec2"][i % 4] ?? "#d8a050",
        ),
        GLOSS,
        {
          position: [2.0 + (i % 4) * 0.4, 1.13 + Math.floor(i / 4) * 0.2, cz],
          scale: [1.3, 0.6, 1],
        },
      );
    // cups stacked on the machine's warmer
    for (let i = 0; i < 6; i++)
      b.add(
        painted(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 10), "#f4f0e8"),
        GLOSS,
        {
          position: [MACHINE_X - 0.35 + (i % 3) * 0.12, 1.66, cz - 0.15],
        },
      );
    // pendant lamps over the counter
    for (let x = COUNTER.x0 + 1; x < COUNTER.x1; x += 2.2) {
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 1.4, 4), BLACK, {
        position: [x, H - 0.7, cz],
      });
      b.add(new THREE.ConeGeometry(0.22, 0.24, 16, 1, true), GOLD, {
        position: [x, H - 1.5, cz],
      });
      b.add(new THREE.SphereGeometry(0.07, 10, 8), BULB, {
        position: [x, H - 1.6, cz],
      });
    }
    // marble cafe tables and bentwood chairs
    for (const [x, z] of TABLES) {
      b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), MARBLE, {
        position: [x, 0.74, z],
      });
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), BLACK, {
        position: [x, 0.36, z],
      });
      b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 16), BLACK, {
        position: [x, 0.01, z],
      });
      for (const side of [-1, 1]) {
        b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), WOOD, {
          position: [x + side * 0.75, 0.47, z],
        });
        for (const [dx, dz] of [
          [-0.12, -0.12],
          [0.12, -0.12],
          [-0.12, 0.12],
          [0.12, 0.12],
        ] as const)
          b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.46, 6), BLACK, {
            position: [x + side * 0.75 + dx, 0.23, z + dz],
          });
        b.add(new THREE.TorusGeometry(0.17, 0.015, 6, 16, Math.PI), BLACK, {
          position: [x + side * 0.9, 0.78, z],
          rotation: [0, Math.PI / 2, 0],
        });
      }
      b.add(
        painted(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 10), "#f4f0e8"),
        GLOSS,
        { position: [x + 0.1, 0.8, z] },
      );
    }
    for (const [x, z] of [
      [x0 + 0.5, z0 + 0.6],
      [x1 - 0.5, z0 + 0.6],
      [x0 + 0.5, z1 - 0.8],
      [x1 - 0.5, z1 - 0.8],
    ] as const)
      plant(b, { x, z }, 1.5);
    return b.build();
  }, [menu]);
}

/**
 * Espresso Lab on Gallery Row: a bright third-wave coffee bar, white tile
 * and plaster, a chrome two-group machine, a pastry case, a chalkboard of
 * the drinks and what goes in them, bean bags on the shelves and marble
 * cafe tables. Rafi pulls shots; the player can take a shift.
 */
export function EspressoLab({ onPick }: { onPick: PickHandler }): JSX.Element {
  const menu = useMemo(menuTex, []);
  useEffect(() => () => menu.dispose(), [menu]);
  const room = useRoom(menu);
  return (
    <>
      <color attach="background" args={["#2a2420"]} />
      <hemisphereLight args={["#fff6e8", "#6a5a4a", 2.1]} />
      <pointLight
        position={[0, 3.2, -3.4]}
        color="#ffd9a0"
        intensity={8}
        distance={12}
      />
      <pointLight
        position={[1, 3.2, 2]}
        color="#fff0d8"
        intensity={6}
        distance={12}
      />
      <Floor
        width={W}
        depth={D}
        color="#e8e0d8"
        texture={{ id: "terrazzo_tiles", scale: 0.6 }}
        low={{ metalness: 0, roughness: 0.4 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["espresso-lab"]} color="#ffd166" />
      <primitive object={room} />
      <NeonText
        text="espresso lab"
        color="#ffd166"
        font={SCRIPT}
        width={2.4}
        k={2}
        position={[1.9, 3.72, z0 + 0.05]}
      />
      <TalkingNpc
        name="Rafi"
        role="server"
        look={BARISTA_LOOK}
        mood="idle"
        at={[BARISTA[0], 0, BARISTA[1]]}
        rot={0}
        seed={511}
        greet
        context={{ venue: "espresso-lab", neighborhood: "arts-district" }}
      />
      <group position={[1.6, 0, 3.6]} rotation-y={-2.6}>
        <CrowdFigure look={REGULAR} move="chatting" seed={512} />
      </group>
    </>
  );
}
