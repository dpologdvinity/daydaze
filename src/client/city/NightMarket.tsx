import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  LANTERNS,
  LANTERN_POLES,
  LANTERN_STRINGS,
  MARKET_CENTER,
  MARKET_FOODS,
  MARKET_PEOPLE,
  STALLS,
  STALL_D,
  STALL_W,
  nearestMarketPeople,
} from "../../game/city/nightMarket.ts";
import { VIEW_RADIUS } from "../../game/city/tuning.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "../rooms/shared/batch.ts";
import type { Player } from "../world/PlayerController.tsx";

/** Full dolls drawn at once: the vendors and shoppers nearest the player. */
const DRAWN = 3;
const PEOPLE_RADIUS = 35;
const REPICK = 0.75;
const PUFFS = 4;
const HANG = 0.4;

// one atlas: row 0 solid white (for the bulbs), then one sign per food
const CELL_W = 512;
const CELL_H = 96;
const ROWS = MARKET_FOODS.length + 1;
const SIGN_INK = ["#ffd166", "#ffffff", "#ffe066", "#7dff6b", "#4fe3ff"];

function signAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W;
  canvas.height = CELL_H * ROWS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas for the market's signs");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CELL_W, CELL_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  MARKET_FOODS.forEach((text, i) => {
    const y = (i + 1) * CELL_H;
    ctx.fillStyle = "#3a0a0e";
    ctx.fillRect(0, y, CELL_W, CELL_H);
    ctx.strokeStyle = "#ffcf5a";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, y + 6, CELL_W - 12, CELL_H - 12);
    let size = 64;
    const font = () => `900 ${size}px "Arial Black", system-ui, sans-serif`;
    ctx.font = font();
    while (ctx.measureText(text).width > CELL_W * 0.86 && size > 20) {
      size -= 4;
      ctx.font = font();
    }
    ctx.fillStyle = SIGN_INK[i % SIGN_INK.length];
    ctx.fillText(text, CELL_W / 2, y + CELL_H / 2 + 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A geometry with every vertex tinted, so one material draws many colours. */
function tinted(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = g.getAttribute("position").count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** A unit plane whose UVs cover one atlas row. */
function atlasPlane(w: number, h: number, row: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    uv.setY(i, 1 - (row + 1 - v) / ROWS);
  }
  return g;
}

/** Every stall, pole and sign, merged: one draw for the solid parts and one
 * for the glowing ones. */
function buildStalls(atlas: THREE.Texture): THREE.Group {
  const solid = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
  });
  const glow = new THREE.MeshBasicMaterial({
    vertexColors: true,
    map: atlas,
    toneMapped: false,
  });
  const batch = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const post = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
  const pot = new THREE.CylinderGeometry(0.26, 0.22, 0.3, 10);
  const bulb = atlasPlane(0.12, 0.12, 0);
  const backGlow = atlasPlane(STALL_W - 0.1, 2.2, 0);
  const add = (
    g: THREE.BufferGeometry,
    color: string,
    m: THREE.Matrix4,
    material: THREE.Material = solid,
  ) => batch.add(tinted(g.clone().applyMatrix4(m), color), material);
  const local = new THREE.Object3D();
  const world = new THREE.Matrix4();
  const part = (
    stall: THREE.Matrix4,
    pos: [number, number, number],
    scale: [number, number, number],
    rotX = 0,
  ) => {
    local.position.set(...pos);
    local.rotation.set(rotX, 0, 0);
    local.scale.set(...scale);
    local.updateMatrix();
    return world.multiplyMatrices(stall, local.matrix);
  };
  const stallM = new THREE.Matrix4();
  const front = STALL_D / 2;
  for (const s of STALLS) {
    stallM.makeRotationY(s.facing === 1 ? 0 : Math.PI);
    stallM.setPosition(s.at[0], 0, s.at[1]);
    // counter and its pale top
    add(box, "#9a5230", part(stallM, [0, 0.5, front - 0.4], [STALL_W, 1, 0.7]));
    add(
      box,
      "#efe2c8",
      part(stallM, [0, 1.03, front - 0.38], [STALL_W + 0.1, 0.06, 0.8]),
    );
    // back cloth, and its inside face lit warm in the awning's colour
    add(box, "#2b1838", part(stallM, [0, 1.15, -front], [STALL_W, 2.3, 0.08]));
    add(
      backGlow,
      `#${new THREE.Color(s.awning).multiplyScalar(0.5).getHexString()}`,
      part(stallM, [0, 1.15, 0.05 - front], [1, 1, 1]),
      glow,
    );
    // the four posts
    for (const [px, pz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      add(
        post,
        "#2a1a1a",
        part(
          stallM,
          [(px * (STALL_W - 0.1)) / 2, 1.25, (pz * (STALL_D - 0.1)) / 2],
          [1, 2.5, 1],
        ),
      );
    }
    // the striped awning, sloping down to the front, and its valance
    const strips = 4;
    const sw = (STALL_W + 0.4) / strips;
    for (let k = 0; k < strips; k++) {
      const x = -(STALL_W + 0.4) / 2 + sw * (k + 0.5);
      add(
        box,
        k % 2 ? "#fff4e6" : s.awning,
        part(stallM, [x, 2.55, 0.15], [sw, 0.06, STALL_D + 0.6], 0.22),
      );
    }
    add(
      box,
      s.awning,
      part(stallM, [0, 2.12, front + 0.36], [STALL_W + 0.4, 0.28, 0.04]),
    );
    // the sign above the valance, lit from its own atlas row
    const row = MARKET_FOODS.indexOf(s.food) + 1;
    batch.add(
      tinted(
        atlasPlane(STALL_W - 0.2, 0.55, row).applyMatrix4(
          part(stallM, [0, 2.62, front + 0.4], [1, 1, 1]),
        ),
        "#ffffff",
      ),
      glow,
    );
    // warm bulbs along the valance
    for (let k = 0; k < 6; k++) {
      add(
        bulb,
        "#ffcf7a",
        part(stallM, [-1.5 + k * 0.6, 1.92, front + 0.39], [1, 1, 1]),
        glow,
      );
    }
    // what's cooking
    if (s.steam) {
      add(pot, "#b9b4c8", part(stallM, [0.4, 1.2, front - 0.4], [1, 1, 1]));
    } else {
      for (let k = 0; k < 3; k++)
        add(
          box,
          ["#ffb3c6", "#c8a2ff", "#fff1a8"][k],
          part(
            stallM,
            [-0.6 + k * 0.45, 1.18, front - 0.4],
            [0.22, 0.26, 0.22],
          ),
        );
    }
  }
  // the lantern poles, lacquer red
  for (const [x, z] of LANTERN_POLES) {
    const top = Math.max(
      ...LANTERN_STRINGS.filter(
        (s) =>
          (s.from[0] === x && s.from[1] === z) ||
          (s.to[0] === x && s.to[1] === z),
      ).map((s) => s.y),
    );
    local.position.set(x, top / 2, z);
    local.rotation.set(0, 0, 0);
    local.scale.set(1.8, top + 0.2, 1.8);
    local.updateMatrix();
    add(post, "#8a1c1c", local.matrix);
  }
  return batch.build();
}

/** The strings the lanterns hang from, as sagging line segments. */
function buildCords(): THREE.LineSegments {
  const SEGMENTS = 14;
  const points: number[] = [];
  const at = (s: (typeof LANTERN_STRINGS)[number], t: number) => [
    s.from[0] + (s.to[0] - s.from[0]) * t,
    s.y - s.sag * 4 * t * (1 - t),
    s.from[1] + (s.to[1] - s.from[1]) * t,
  ];
  for (const s of LANTERN_STRINGS)
    for (let i = 0; i < SEGMENTS; i++)
      points.push(...at(s, i / SEGMENTS), ...at(s, (i + 1) / SEGMENTS));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    g,
    new THREE.LineBasicMaterial({ color: "#1a0a0a" }),
  );
}

/** A paper lantern: a glowing red body between dark caps, coloured per
 * vertex so the one instanced draw needs no lighting. */
function lanternGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.24, 10, 8).scale(1, 1.15, 1);
  const pos = g.getAttribute("position");
  const glow = new THREE.Color("#ff2a1a").multiplyScalar(1.7);
  const rim = new THREE.Color("#ffb03a").multiplyScalar(1.4);
  const cap = new THREE.Color("#3a0606");
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = Math.abs(pos.getY(i)) / (0.24 * 1.15);
    if (y > 0.85) c.copy(cap);
    else c.copy(glow).lerp(rim, Math.max(0, 0.6 - y));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

const STEAMERS = STALLS.filter((s) => s.steam);
const scratch = new THREE.Object3D();

function MarketPerson({ index }: { index: number }) {
  const p = MARKET_PEOPLE[index];
  return (
    <group position={[p.at[0], 0, p.at[1]]} rotation-y={p.yaw}>
      <Doll look={p.look} mood="idle" seed={300 + index} />
    </group>
  );
}

/**
 * The Chinatown and Koreatown night market: striped stalls with lit signs,
 * steam over the cooking, red lanterns swaying over the lane and across the
 * street, and the nearest few vendors and shoppers as dolls. About six draws
 * plus the dolls, and none at all once the player is out of the city's view
 * radius.
 */
export function NightMarket({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const lanterns = useRef<THREE.InstancedMesh>(null);
  const steam = useRef<THREE.InstancedMesh>(null);
  const [shown, setShown] = useState<readonly number[]>([]);
  const last = useRef(-Infinity);
  const atlas = useMemo(() => signAtlas(), []);
  const stalls = useMemo(() => buildStalls(atlas), [atlas]);
  const cords = useMemo(() => buildCords(), []);
  const lanternGeom = useMemo(() => lanternGeometry(), []);
  const puffGeom = useMemo(() => new THREE.SphereGeometry(0.3, 8, 6), []);
  useEffect(
    () => () => {
      atlas.dispose();
      lanternGeom.dispose();
      puffGeom.dispose();
      cords.geometry.dispose();
      stalls.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
    [atlas, stalls, cords, lanternGeom, puffGeom],
  );

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const px = player.pos.x;
    const pz = player.pos.z;
    const near =
      Math.hypot(px - MARKET_CENTER[0], pz - MARKET_CENTER[1]) < VIEW_RADIUS;
    g.visible = near;
    const t = clock.elapsedTime;
    if (t - last.current >= REPICK) {
      last.current = t;
      const next = near
        ? nearestMarketPeople([px, pz], DRAWN, PEOPLE_RADIUS)
        : [];
      const same =
        next.length === shown.length && next.every((i) => shown.includes(i));
      if (!same) setShown(next);
    }
    if (!near) return;
    const l = lanterns.current;
    if (l) {
      LANTERNS.forEach((lantern, i) => {
        // a pendulum off the string, across it
        const a = calm ? 0 : Math.sin(t * 1.3 + lantern.phase) * 0.14;
        scratch.position.set(
          lantern.x,
          lantern.y - Math.cos(a) * HANG,
          lantern.z + Math.sin(a) * HANG,
        );
        scratch.rotation.set(-a, 0, 0);
        scratch.scale.setScalar(1);
        scratch.updateMatrix();
        l.setMatrixAt(i, scratch.matrix);
      });
      l.instanceMatrix.needsUpdate = true;
    }
    const s = steam.current;
    if (s) {
      STEAMERS.forEach((stall, si) => {
        const front = stall.facing * (STALL_D / 2 - 0.4);
        const potX = stall.at[0] + 0.4 * stall.facing;
        for (let k = 0; k < PUFFS; k++) {
          // each puff rises, swells and thins out, then starts again
          const life = calm
            ? (k + 0.5) / PUFFS
            : (t * 0.4 + k / PUFFS + si * 0.37) % 1;
          scratch.position.set(
            potX + Math.sin(life * 5 + si) * 0.15,
            1.45 + life * 1.1,
            stall.at[1] + front,
          );
          scratch.rotation.set(life * 2, si, 0);
          scratch.scale.setScalar((0.5 + life) * Math.min(1, (1 - life) * 3));
          scratch.updateMatrix();
          s.setMatrixAt(si * PUFFS + k, scratch.matrix);
        }
      });
      s.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={root} visible={false}>
        <primitive object={stalls} />
        <primitive object={cords} />
        <instancedMesh
          ref={lanterns}
          args={[lanternGeom, undefined, LANTERNS.length]}
          frustumCulled={false}
        >
          <meshBasicMaterial vertexColors toneMapped={false} />
        </instancedMesh>
        <instancedMesh
          ref={steam}
          args={[puffGeom, undefined, STEAMERS.length * PUFFS]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            color="#fff0e0"
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      </group>
      {shown.map((i) => (
        <MarketPerson key={i} index={i} />
      ))}
    </>
  );
}
