import { useMemo } from "react";
import * as THREE from "three";
import { Batch } from "../shared/batch.ts";
import { GOLD, hdr, LACQUER } from "../shared/materials.ts";
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
const BANQUETTE = new THREE.MeshStandardMaterial({
  color: "#3a0f3a",
  roughness: 0.7,
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

// One shared glow material per colour, so every piece of that colour merges
// into a single draw call. Brightness is one value so the colours stay shared.
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
const BOTTLE_TALL = new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8);
const BOTTLE_SQUAT = new THREE.CylinderGeometry(0.11, 0.12, 0.22, 8);
const BOTTLE_NECK = new THREE.CylinderGeometry(0.025, 0.04, 0.14, 6);

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

  // the bar counter, its brass top, and bottles of three shapes lit from inside
  b.add(new THREE.BoxGeometry(0.6, 1, 6.4), LACQUER, {
    position: [BAR_X, 0.5, 0],
  });
  b.add(new THREE.BoxGeometry(0.66, 0.04, 6.44), GOLD, {
    position: [BAR_X, 1.02, 0],
  });
  const bottleColors = ["#ff8a3d", "#ff2f9a", "#4fe3ff", "#ffb02e"];
  [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].forEach((z, i) => {
    const color = glow(bottleColors[i % 4]);
    const pos: [number, number, number] = [-WALL_X + 0.35, 1.7, z];
    if (i % 3 === 1) b.add(BOTTLE_SQUAT, color, { position: pos });
    else {
      b.add(BOTTLE_TALL, color, { position: pos });
      b.add(BOTTLE_NECK, color, { position: [pos[0], 1.97, z] });
    }
  });
  [1.5, 2.1, 2.7].forEach((y, i) =>
    b.add(
      new THREE.BoxGeometry(0.04, 0.05, 5.6),
      glow(i === 1 ? "#ff8a3d" : "#ff4fb3"),
      {
        position: [-WALL_X + 0.14, y, 0],
      },
    ),
  );

  // two banquettes along the right wall, each with a glowing pink table
  for (const z of [-2.4, 1.8]) {
    b.add(new THREE.BoxGeometry(0.8, 0.6, 2.4), BANQUETTE, {
      position: [WALL_X - 0.45, 0.3, z],
    });
    b.add(new THREE.BoxGeometry(0.25, 0.9, 2.4), BANQUETTE, {
      position: [WALL_X - 0.1, 0.95, z],
    });
    b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), glow("#ff4fb3"), {
      position: [WALL_X - 1.4, 0.82, z],
    });
  }

  // coat rail and counter by the street door, with coloured tags above
  b.add(new THREE.BoxGeometry(1.6, 1.1, 0.5), LACQUER, {
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
    b.add(new THREE.CylinderGeometry(0.8, 0.9, PODIUM_TOP, 32), LACQUER, {
      position: [p.x, PODIUM_TOP / 2, p.z],
    });
    b.add(
      new THREE.CylinderGeometry(0.82, 0.82, 0.02, 32),
      glow(i === 0 ? "#ffb02e" : "#9b5cff"),
      {
        position: [p.x, PODIUM_TOP + 0.01, p.z],
      },
    );
  });

  // the DJ booth: a lacquer counter, a cyan edge and two decks
  b.add(new THREE.BoxGeometry(3.2, 1.1, 0.9), LACQUER, {
    position: [DJ_BOOTH.x, 0.55, DJ_BOOTH.z + 0.1],
  });
  b.add(new THREE.BoxGeometry(3.3, 0.04, 0.95), glow("#4fe3ff"), {
    position: [DJ_BOOTH.x, 1.12, DJ_BOOTH.z + 0.1],
  });
  for (const x of [-0.75, 0.75])
    b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 28), DARK, {
      position: [DJ_BOOTH.x + x, 1.17, DJ_BOOTH.z + 0.15],
    });

  // speaker stacks flank the DJ booth, woofers facing the floor
  for (const x of [-5.2, 5.2]) {
    b.add(new THREE.BoxGeometry(0.9, 1.5, 0.8), DARK, {
      position: [x, 0.75, -6.2],
    });
    for (const y of [0.5, 1.1]) {
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), DARK, {
        position: [x, y, -5.79],
        rotation: [Math.PI / 2, 0, 0],
      });
      b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 24), glow("#4fe3ff"), {
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
      b.add(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 12), DARK, {
        position: [x, 3.4, z],
      });
      b.add(
        new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12),
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
  return <primitive object={set} />;
}
