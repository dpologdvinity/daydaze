import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeCanvas } from "../../canvas.ts";
import { Batch } from "../shared/batch.ts";
import { PropSet } from "../shared/Prop.tsx";
import type { FoodPalette } from "./FoodRoom.tsx";

/**
 * The fit-out every food room shares: checker floor, tiled backsplash,
 * hanging menu boards, a glass display case with trays, the register, cafe
 * tables with chairs, pendant lamps and a street window. Solid pieces carry
 * vertex colours and lit pieces glow, so the whole fit-out is four draw calls.
 */

type Rgb = THREE.Color;

/** A geometry painted one colour through a vertex colour attribute. */
function painted(geometry: THREE.BufferGeometry, colour: Rgb) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const n = g.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
const CONE = new THREE.ConeGeometry(0.5, 1, 18, 1, true);
const SPHERE = new THREE.SphereGeometry(0.5, 12, 8);

function checkerTexture(a: string, b: string) {
  const { canvas, ctx } = makeCanvas(64, 64);
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// table spots in front of the counter, inside the walkable floor
const TABLES: [number, number][] = [
  [-2.5, 3.4],
  [0, 4.3],
  [2.5, 3.4],
];

export function Fitout({ palette }: { palette: FoodPalette }) {
  const built = useMemo(() => {
    const solid = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
    });
    const glow = new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: "#d8f4ff",
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const floorTex = checkerTexture(
      palette.floor,
      `#${new THREE.Color(palette.floor).lerp(new THREE.Color("#ffffff"), 0.18).getHexString()}`,
    );
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
    });

    const wall = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);
    const light = new THREE.Color(palette.light);
    const tileA = wall.clone().lerp(new THREE.Color("#ffffff"), 0.35);
    const tileB = wall.clone().lerp(accent, 0.25);
    const dark = new THREE.Color("#1a0f18");
    const chrome = new THREE.Color("#c9c4d6");
    const wood = new THREE.Color("#8a5a3c");

    const s = new Batch();
    const g = new Batch();
    const put = (
      b: Batch,
      geo: THREE.BufferGeometry,
      c: Rgb,
      p: [number, number, number],
      sc: [number, number, number],
      rot?: [number, number, number],
    ) =>
      b.add(painted(geo, c), b === g ? glow : solid, {
        position: p,
        scale: sc,
        rotation: rot,
      });

    // tiled backsplash behind the counter, offset rows like subway tiles
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 20; col++) {
        const x = -3.9 + col * 0.41 + (row % 2) * 0.2;
        if (x > 3.95) continue;
        put(
          s,
          BOX,
          (row + col) % 3 ? tileA : tileB,
          [x, 0.15 + row * 0.2, -2.08],
          [0.38, 0.17, 0.03],
        );
      }
    }
    // a chair rail and skirting along both side walls
    for (const x of [-4.08, 4.08]) {
      put(s, BOX, accent, [x, 1.0, 2.4], [0.05, 0.08, 6.3]);
      put(s, BOX, dark, [x, 0.08, 2.4], [0.05, 0.16, 6.3]);
    }
    // counter trim: kick plate and a chrome edge
    put(s, BOX, dark, [0, 0.08, -0.53], [6.05, 0.16, 0.04]);
    put(s, BOX, chrome, [0, 1.09, -0.52], [6.2, 0.04, 0.04]);

    // hanging menu boards, lines of "text" in light bars
    for (const x of [-2, 0, 2]) {
      put(s, BOX, dark, [x, 2.75, -0.45], [1.6, 0.6, 0.05]);
      put(s, CYL, chrome, [x - 0.6, 3.3, -0.45], [0.015, 0.5, 0.015]);
      put(s, CYL, chrome, [x + 0.6, 3.3, -0.45], [0.015, 0.5, 0.015]);
      put(g, BOX, accent, [x, 2.97, -0.42], [1.2, 0.07, 0.01]);
      for (let line = 0; line < 4; line++) {
        put(
          g,
          BOX,
          light,
          [x - 0.15, 2.85 - line * 0.1, -0.42],
          [0.9, 0.035, 0.01],
        );
        put(
          g,
          BOX,
          tileA,
          [x + 0.58, 2.85 - line * 0.1, -0.42],
          [0.18, 0.035, 0.01],
        );
      }
    }

    // display case on the counter: chrome frame, trays of food under glass
    put(s, BOX, chrome, [-1.6, 1.14, -0.85], [2.2, 0.03, 0.62]);
    const treats = [
      accent,
      light,
      tileA,
      new THREE.Color("#7dff6b"),
      new THREE.Color("#4fe3ff"),
    ];
    for (let i = 0; i < 10; i++) {
      const x = -2.55 + (i % 5) * 0.47;
      const z = i < 5 ? -1.0 : -0.72;
      put(s, BOX, chrome, [x, 1.17, z], [0.4, 0.02, 0.22]);
      for (let k = 0; k < 3; k++)
        put(
          s,
          SPHERE,
          treats[(i + k) % treats.length],
          [x - 0.12 + k * 0.12, 1.22, z],
          [0.1, 0.07, 0.1],
        );
    }
    // register and tip jar on the right
    put(s, BOX, dark, [1.9, 1.25, -0.85], [0.45, 0.22, 0.35]);
    put(s, BOX, dark, [1.9, 1.48, -0.95], [0.4, 0.26, 0.04], [-0.35, 0, 0]);
    put(
      g,
      BOX,
      new THREE.Color("#7dff6b"),
      [1.9, 1.48, -0.925],
      [0.32, 0.18, 0.01],
      [-0.35, 0, 0],
    );

    // cafe tables, two stools each, a napkin box and sauce bottles on top
    for (const [x, z] of TABLES) {
      put(s, CYL, chrome, [x, 0.38, z], [0.08, 0.76, 0.08]);
      put(s, CYL, chrome, [x, 0.02, z], [0.5, 0.04, 0.5]);
      put(s, CYL, wood, [x, 0.78, z], [1.0, 0.05, 1.0]);
      put(s, BOX, chrome, [x, 0.86, z], [0.14, 0.1, 0.08]);
      put(s, CYL, accent, [x + 0.18, 0.88, z + 0.05], [0.06, 0.16, 0.06]);
      put(s, CYL, light, [x + 0.28, 0.88, z - 0.04], [0.06, 0.16, 0.06]);
    }

    // pendant lamps over the side tables; one over the middle table would
    // hang in the camera's line to the cashier
    for (const [x, z] of TABLES.filter(([x]) => x !== 0)) {
      put(s, CYL, dark, [x, 3.5, z], [0.015, 1, 0.015]);
      put(s, CONE, accent, [x, 2.85, z], [0.5, 0.3, 0.5]);
      put(
        g,
        SPHERE,
        light.clone().lerp(new THREE.Color("#ffffff"), 0.5),
        [x, 2.72, z],
        [0.16, 0.16, 0.16],
      );
    }

    // street window on the left wall: frame, mullions, a glowing night outside
    put(
      g,
      BOX,
      new THREE.Color("#3a2a6a"),
      [-4.07, 2.1, 3.0],
      [0.02, 1.4, 2.4],
    );
    for (let i = 0; i < 6; i++)
      put(
        g,
        BOX,
        new THREE.Color(i % 2 ? "#ff4fb3" : "#4fe3ff"),
        [-4.06, 1.75 + (i % 3) * 0.3, 2.2 + i * 0.3],
        [0.01, 0.12, 0.2],
      );
    put(s, BOX, dark, [-4.05, 2.85, 3.0], [0.06, 0.08, 2.5]);
    put(s, BOX, dark, [-4.05, 1.35, 3.0], [0.06, 0.08, 2.5]);
    put(s, BOX, dark, [-4.05, 2.1, 3.0], [0.06, 1.5, 0.06]);

    const group = new THREE.Group();
    group.add(s.build(), g.build());
    // glass over the display case, its own transparent pass
    const caseGlass = new THREE.Mesh(BOX, glass);
    caseGlass.position.set(-1.6, 1.36, -0.85);
    caseGlass.scale.set(2.2, 0.42, 0.62);
    group.add(caseGlass);
    // the checker floor sits a hair over the walkable floor; it never takes clicks
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 6.4), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.003, 2.4);
    floor.raycast = () => {};
    group.add(floor);
    return { group, dispose: [solid, glow, glass, floorMat, floorTex] };
  }, [palette]);

  useEffect(
    () => () => {
      built.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.geometry !== BOX) o.geometry.dispose();
      });
      built.dispose.forEach((d) => d.dispose());
    },
    [built],
  );
  return (
    <>
      <primitive object={built.group} />
      <Suspense fallback={null}>
        <PropSet
          model="cafe-chair"
          width={0.5}
          depth={0.5}
          height={0.9}
          at={CHAIRS}
        />
      </Suspense>
    </>
  );
}

// a chair each side of every table, facing it (see foodSeats in seats.ts)
const CHAIRS = TABLES.flatMap(([x, z]) =>
  [-1, 1].map(
    (side) => [x + side * 0.75, 0, z, (-side * Math.PI) / 2] as const,
  ),
);
