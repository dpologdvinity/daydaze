// How Main Avenue wears under the El (game/city/wear.ts lays the marks out):
// tire tracks, oil stains, patched asphalt, curb drains and manhole covers
// drawn from one canvas atlas as one instanced mesh of flat quads, plus the
// deck's shade as a second flat band with sun stripes through the ties. The
// band is a texture, not a shadow: its strength follows the sun and it slides
// across the road with the sun's side (shadeOffset), and by night it is gone.
// Two draws and about a thousand triangles for the whole avenue.
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  avenueWear,
  SHADE,
  shadeOffset,
  WEAR_Y,
  type WearKind,
} from "../../game/city/wear.ts";
import { useDaylight } from "./daylight.ts";

/** The atlas: 4 tiles across, 2 down, 256 px each. */
const TILE = 256;
const TILES: Record<WearKind, number> = {
  track: 0,
  oil: 1,
  patch: 2,
  drain: 3,
  cover: 4,
};

/** A small deterministic generator so the atlas is the same on every load. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawAtlas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE * 4;
  canvas.height = TILE * 2;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the avenue's wear");
  const rand = rng(7);
  const at = (kind: WearKind): [number, number] => [
    (TILES[kind] % 4) * TILE,
    Math.floor(TILES[kind] / 4) * TILE,
  ];
  // tire track: a soft streak across, broken up along its length, fading at the ends
  {
    const [ox, oy] = at("track");
    for (let x = 0; x < TILE; x += 4) {
      const along = Math.min(x, TILE - x) / 28;
      const strength = Math.min(1, along) * (0.45 + 0.55 * rand());
      for (let y = 0; y < TILE; y += 2) {
        const across = Math.exp(-(((y - TILE / 2) / 46) ** 2));
        g.fillStyle = `rgba(8,8,12,${(0.5 * across * strength).toFixed(3)})`;
        g.fillRect(ox + x, oy + y, 4, 2);
      }
    }
  }
  // oil: overlapping dark blots with a faint rainbow rim
  {
    const [ox, oy] = at("oil");
    for (let i = 0; i < 7; i++) {
      const cx = ox + TILE / 2 + (rand() - 0.5) * 80;
      const cy = oy + TILE / 2 + (rand() - 0.5) * 80;
      const r = 30 + rand() * 50;
      const blot = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      blot.addColorStop(0, "rgba(5,6,10,0.7)");
      blot.addColorStop(0.7, "rgba(8,9,14,0.45)");
      blot.addColorStop(1, "rgba(8,9,14,0)");
      g.fillStyle = blot;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    g.strokeStyle = "rgba(110,70,160,0.14)";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(ox + TILE / 2, oy + TILE / 2, 74, 62, 0.4, 0, Math.PI * 2);
    g.stroke();
  }
  // patch: freshly laid, darker asphalt with a hairline seam all round and a crack
  {
    const [ox, oy] = at("patch");
    g.fillStyle = "rgba(14,14,18,0.42)";
    g.fillRect(ox + 8, oy + 20, TILE - 16, TILE - 40);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(0,0,0,${(0.05 + 0.1 * rand()).toFixed(2)})`;
      g.fillRect(
        ox + 10 + rand() * (TILE - 22),
        oy + 22 + rand() * (TILE - 46),
        3,
        3,
      );
    }
    g.strokeStyle = "rgba(6,6,8,0.7)";
    g.lineWidth = 3;
    g.strokeRect(ox + 8, oy + 20, TILE - 16, TILE - 40);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(ox + 40, oy + 60);
    g.lineTo(ox + 110, oy + 100);
    g.lineTo(ox + 90, oy + 150);
    g.stroke();
  }
  // storm drain: a dark mouth behind iron bars
  {
    const [ox, oy] = at("drain");
    g.fillStyle = "rgba(6,6,8,0.92)";
    g.fillRect(ox + 10, oy + 40, TILE - 20, TILE - 80);
    g.fillStyle = "rgba(86,86,92,0.92)";
    for (let x = 24; x < TILE - 14; x += 26)
      g.fillRect(ox + x, oy + 44, 10, TILE - 88);
    g.strokeStyle = "rgba(120,120,126,0.85)";
    g.lineWidth = 4;
    g.strokeRect(ox + 10, oy + 40, TILE - 20, TILE - 80);
  }
  // manhole cover: an iron disc with a rim and a grid
  {
    const [ox, oy] = at("cover");
    const cx = ox + TILE / 2;
    const cy = oy + TILE / 2;
    g.fillStyle = "rgba(34,32,36,0.95)";
    g.beginPath();
    g.arc(cx, cy, 104, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(100,96,102,0.9)";
    g.lineWidth = 7;
    g.beginPath();
    g.arc(cx, cy, 98, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(70,66,72,0.9)";
    g.lineWidth = 4;
    for (let d = -70; d <= 70; d += 28) {
      g.beginPath();
      g.moveTo(cx + d, cy - 78);
      g.lineTo(cx + d, cy + 78);
      g.moveTo(cx - 78, cy + d);
      g.lineTo(cx + 78, cy + d);
      g.stroke();
    }
  }
  return canvas;
}

/** The deck's shade: soft edges across, bright slits between the ties along. */
function drawShade(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the El's shade");
  for (let x = 0; x < 64; x++) {
    // 75% of each tie's span is shade, 25% a slit of sun
    const slit = x > 48 ? 0.2 : 1;
    for (let y = 0; y < 128; y++) {
      const edge = Math.min(y, 127 - y) / 22;
      g.fillStyle = `rgba(0,0,0,${(Math.min(1, edge) * slit).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function AvenueWear(): JSX.Element {
  const day = useDaylight();
  const wear = useMemo(() => {
    const marks = avenueWear();
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const uv = new Float32Array(marks.length * 4);
    marks.forEach((m, i) => {
      const t = TILES[m.kind];
      uv.set([(t % 4) / 4, 1 - (Math.floor(t / 4) + 1) / 2, 0.25, 0.5], i * 4);
    });
    geometry.setAttribute("aUv", new THREE.InstancedBufferAttribute(uv, 4));
    const map = new THREE.CanvasTexture(drawAtlas());
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const material = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    material.customProgramCacheKey = () => "avenue-wear";
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "attribute vec4 aUv;\nvoid main() {")
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
#ifdef USE_MAP
vMapUv = (mapTransform * vec3(uv * aUv.zw + aUv.xy, 1.0)).xy;
#endif`,
        );
    };
    const mesh = new THREE.InstancedMesh(geometry, material, marks.length);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    marks.forEach((w, i) => {
      mesh.setMatrixAt(
        i,
        m.compose(p.set(w.x, WEAR_Y, w.z), q, s.set(w.sx, 1, w.sz)),
      );
    });
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const shade = useMemo(() => {
    const length = SHADE.x1 - SHADE.x0;
    const geometry = new THREE.PlaneGeometry(length, SHADE.width);
    geometry.rotateX(-Math.PI / 2);
    const map = new THREE.CanvasTexture(drawShade());
    map.wrapS = THREE.RepeatWrapping;
    map.repeat.set(length / SHADE.tie, 1);
    const material = new THREE.MeshBasicMaterial({
      map,
      color: "#000000",
      transparent: true,
      depthWrite: false,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((SHADE.x0 + SHADE.x1) / 2, WEAR_Y + 0.003, 0);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  useEffect(() => {
    (shade.material as THREE.MeshBasicMaterial).opacity = 0.5 * day.sun;
    shade.position.z = shadeOffset(day.sunDirection);
  }, [shade, day]);
  useEffect(
    () => () => {
      for (const mesh of [wear, shade]) {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.map?.dispose();
        material.dispose();
      }
    },
    [wear, shade],
  );
  return (
    <>
      <primitive object={wear} />
      <primitive object={shade} />
    </>
  );
}
