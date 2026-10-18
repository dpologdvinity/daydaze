import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { surface } from "../../city/worldTexture.ts";
import { Batch } from "../shared/batch.ts";
import { Bottles, type ShelfRow } from "../shared/Bottles.tsx";
import { poster, shelf } from "../shared/details.ts";
import { PropSet } from "../shared/Prop.tsx";
import { GOLD, hdr } from "../shared/materials.ts";
import {
  BACK_Z,
  BAR_X,
  DJ_BOOTH,
  PODIUM_TOP,
  PODIUMS,
  WALL_X,
} from "./layout.ts";

// rough-cast concrete painted violet
const WALL = surface("concrete_wall_008", {
  scale: 0.5,
  color: "#7a3aa0",
  roughness: 0.9,
});
// the bar: a brushed-steel front under a black marble top
const BAR_FRONT = surface("metal_plate", {
  scale: 1.5,
  color: "#6a4a8a",
  metalness: 0.7,
  roughness: 0.7,
});
const BAR_TOP = surface("marble_01", {
  scale: 0.8,
  color: "#3a3040",
  roughness: 0.35,
});
const SHELF_GLASS = new THREE.MeshStandardMaterial({
  color: "#c8e8ff",
  metalness: 0.4,
  roughness: 0.05,
});
const PODIUM = surface("marble_tiles", {
  scale: 1.2,
  color: "#4a3058",
  roughness: 0.4,
});
const DARK = new THREE.MeshStandardMaterial({
  color: "#0b0310",
  roughness: 0.35,
  metalness: 0.6,
});
const TRUSS = new THREE.MeshStandardMaterial({
  color: "#9aa0b8",
  roughness: 0.3,
  metalness: 1,
});

// One shared glow material per color, so every piece of that color merges
// into a single draw call. Brightness is one value so the colors stay shared.
const glows = new Map<string, THREE.MeshBasicMaterial>();
function glow(hex: string) {
  let m = glows.get(hex);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: hdr(hex, 2.5),
      toneMapped: false,
    });
    glows.set(hex, m);
  }
  return m;
}

const TUBE_Z = [-4.2, -1.4, 1.4, 4.2];
const TRUSS_Z = [-2.2, 3.2];
const LAMP_X = [-4, -2, 0, 2, 4];
const LAMP_COLORS = ["#ff2f9a", "#4fe3ff", "#9b5cff", "#ffb02e", "#4fe3ff"];
const SHELVES = [1.5, 2.1];
// the back bar on the left wall, in the frame of <Bottles>: x runs along
// the wall (minus room z), z out from it
const ROWS: readonly ShelfRow[] = SHELVES.map((y) => ({
  x0: -2.7,
  x1: 2.7,
  y,
  z: 0.24,
  count: 5,
}));

/**
 * Every static piece of Pulse, merged into one mesh per material. Walls, the
 * bar, booths, podiums, the DJ booth, speaker stacks and truss rigs all
 * share a handful of draw calls.
 */
function buildSet() {
  const b = new Batch();
  for (const x of [-WALL_X, WALL_X])
    b.add(new THREE.BoxGeometry(0.2, 4, 14), WALL, { position: [x, 2, 0] });

  // vertical neon tubes up each side wall, alternating pink and teal
  const tube = new THREE.BoxGeometry(0.05, 2.6, 0.05);
  TUBE_Z.forEach((z, i) => {
    b.add(tube, glow(i % 2 ? "#4fe3ff" : "#ff2f9a"), {
      position: [-WALL_X + 0.14, 1.9, z],
    });
    b.add(tube, glow(i % 2 ? "#ff2f9a" : "#4fe3ff"), {
      position: [WALL_X - 0.14, 1.9, z],
    });
  });
  // glowing trim along the top of each wall
  b.add(new THREE.BoxGeometry(WALL_X * 2, 0.05, 0.04), glow("#ff2f9a"), {
    position: [0, 3.92, BACK_Z + 0.12],
  });
  b.add(new THREE.BoxGeometry(0.04, 0.05, 14), glow("#b06bff"), {
    position: [-WALL_X + 0.12, 3.92, 0],
  });
  b.add(new THREE.BoxGeometry(0.04, 0.05, 14), glow("#4fe3ff"), {
    position: [WALL_X - 0.12, 3.92, 0],
  });

  // the bar counter, its marble top and brass rail; glass shelves of
  // bottles behind it (see Bottles)
  b.add(new THREE.BoxGeometry(0.6, 1, 6.4), BAR_FRONT, {
    position: [BAR_X, 0.5, 0],
  });
  b.add(new THREE.BoxGeometry(0.66, 0.05, 6.44), BAR_TOP, {
    position: [BAR_X, 1.025, 0],
  });
  b.add(new THREE.BoxGeometry(0.03, 0.03, 6.44), GOLD, {
    position: [BAR_X + 0.34, 0.9, 0],
  });
  for (const y of SHELVES)
    shelf(b, { x: -WALL_X + 0.24, y, ry: Math.PI / 2 }, 5.6, SHELF_GLASS, 0.3);
  // gig flyers over the banquettes and by the door
  [-4.4, -0.3, 4.2].forEach((z, i) =>
    poster(
      b,
      { x: WALL_X - 0.12, y: 2.2, z, ry: -Math.PI / 2 },
      i * 2,
      0.7,
      0.95,
    ),
  );
  poster(
    b,
    { x: -WALL_X + 0.12, y: 2.3, z: 4.6, ry: Math.PI / 2 },
    5,
    0.6,
    0.8,
  );
  [1.5, 2.1, 2.7].forEach((y, i) =>
    b.add(
      new THREE.BoxGeometry(0.04, 0.05, 5.6),
      glow(i === 1 ? "#ff8a3d" : "#ff4fb3"),
      {
        position: [-WALL_X + 0.14, y, 0],
      },
    ),
  );

  // two banquettes along the right wall (models, see Set), each with a
  // glowing pink table
  for (const z of [-2.4, 1.8]) {
    b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), glow("#ff4fb3"), {
      position: [WALL_X - 1.4, 0.82, z],
    });
  }

  // coat rail and counter by the street door, with colored tags above
  b.add(new THREE.BoxGeometry(1.6, 1.1, 0.5), BAR_FRONT, {
    position: [-4.9, 0.55, 6],
  });
  b.add(new THREE.BoxGeometry(1.66, 0.04, 0.54), GOLD, {
    position: [-4.9, 1.12, 6],
  });
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), TRUSS, {
    position: [-4.9, 2.2, 5.8],
    rotation: [0, 0, Math.PI / 2],
  });
  [-0.55, 0, 0.55].forEach((x, i) =>
    b.add(
      new THREE.BoxGeometry(0.36, 0.9, 0.12),
      glow(["#ffb02e", "#9b5cff", "#3fe0d0"][i]),
      {
        position: [-4.9 + x, 1.7, 5.8],
      },
    ),
  );

  // dancers' podiums with a lit rim each
  PODIUMS.forEach((p, i) => {
    b.add(new THREE.CylinderGeometry(0.8, 0.9, PODIUM_TOP, 24), PODIUM, {
      position: [p.x, PODIUM_TOP / 2, p.z],
    });
    b.add(
      new THREE.CylinderGeometry(0.82, 0.82, 0.02, 24),
      glow(i === 0 ? "#ffb02e" : "#9b5cff"),
      {
        position: [p.x, PODIUM_TOP + 0.01, p.z],
      },
    );
  });

  // the DJ booth is a model (see Set)

  // speaker stacks flank the DJ booth, woofers facing the floor
  for (const x of [-5.2, 5.2]) {
    b.add(new THREE.BoxGeometry(0.9, 1.5, 0.8), DARK, {
      position: [x, 0.75, -6.2],
    });
    for (const y of [0.5, 1.1]) {
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), DARK, {
        position: [x, y, -5.79],
        rotation: [Math.PI / 2, 0, 0],
      });
      b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 16), glow("#4fe3ff"), {
        position: [x, y, -5.77],
        rotation: [Math.PI / 2, 0, 0],
      });
    }
  }

  // two truss rigs across the ceiling, each with five lamp heads
  for (const z of TRUSS_Z) {
    b.add(new THREE.BoxGeometry(12.4, 0.12, 0.12), TRUSS, {
      position: [0, 3.55, z],
    });
    LAMP_X.forEach((x, i) => {
      b.add(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 8), DARK, {
        position: [x, 3.4, z],
      });
      b.add(
        new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8),
        glow(LAMP_COLORS[i]),
        {
          position: [x, 3.3, z],
        },
      );
    });
  }
  return b.build();
}

/** Pulse's static dressing, built once and drawn as a few merged meshes. */
export function PulseSet() {
  const set = useMemo(buildSet, []);
  return (
    <>
      <primitive object={set} />
      <group position={[-WALL_X, 0, 0]} rotation-y={Math.PI / 2}>
        <Bottles rows={ROWS} seed={5} />
      </group>
      <Suspense fallback={null}>
        <PropSet
          model="banquette"
          width={2.4}
          depth={0.9}
          height={1.2}
          at={[-2.4, 1.8].map(
            (z) => [WALL_X - 0.45, 0, z, -Math.PI / 2] as const,
          )}
        />
        <PropSet
          model="dj-booth"
          width={3.2}
          depth={0.9}
          height={1.25}
          at={[[DJ_BOOTH.x, 0, DJ_BOOTH.z + 0.1, 0]]}
        />
      </Suspense>
    </>
  );
}
