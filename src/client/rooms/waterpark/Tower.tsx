// The Water Park's slide tower and its three slides from SLIDES in
// src/game/waterPark.ts: half-pipe troughs swept along each path, instanced
// ribs and supports, gangways, flags and landing foam. Tapping the tower rides
// slide 0; tapping a slide rides that one. A drag of more than 6 px is an
// orbit, not a tap.

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { gradientMap } from "../../avatar/toon.ts";
import {
  POOL,
  SLIDES,
  TOWER,
  type Slide,
  type Vec3,
} from "../../../game/waterPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { useQuality, type QualityTier } from "../../world/quality.ts";
import { instanced, Props } from "./build.ts";
import { PROPS, stripes, toon } from "./materials.ts";

const UP = new THREE.Vector3(0, 1, 0);
const SIDES = 14;
const TROUGH_R = 0.42;

function curveOf(path: readonly Vec3[]) {
  return new THREE.CatmullRomCurve3(
    path.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
}

/**
 * The trough's center at arc length u, with its frame: `side` across the path,
 * `down` and `t` along it. The rider's hips sit `r` above the path.
 */
function frameAt(curve: THREE.CatmullRomCurve3, u: number, r: number) {
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u);
  const side = new THREE.Vector3().crossVectors(t, UP).normalize();
  const down = new THREE.Vector3().crossVectors(side, t).normalize().negate();
  p.addScaledVector(down, -r * 0.9);
  return { p, side, down, t };
}

/** An open half-pipe along the rider's path. */
function troughGeometry(curve: THREE.CatmullRomCurve3, r: number) {
  const rings = Math.ceil(curve.getLength() * 3);
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const { p, side, down } = frameAt(curve, i / rings, r);
    // a little over a half circle, so the lip curls in
    for (let j = 0; j <= SIDES; j++) {
      const a = -0.25 + (j / SIDES) * (Math.PI + 0.5);
      pos.push(
        p.x + (side.x * Math.cos(a) + down.x * Math.sin(a)) * r,
        p.y + (side.y * Math.cos(a) + down.y * Math.sin(a)) * r,
        p.z + (side.z * Math.cos(a) + down.z * Math.sin(a)) * r,
      );
      if (i < rings && j < SIDES) {
        const a0 = i * (SIDES + 1) + j;
        const b0 = a0 + SIDES + 1;
        index.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Posts under a slide every few meters, down to the deck. */
function supports(path: readonly Vec3[]) {
  return path.filter((p, i) => i % 10 === 5 && p[1] > 0.9);
}

/** Ribs across the trough, one arc per frame; LOD sets their spacing. */
function ribMatrices(curve: THREE.CatmullRomCurve3, quality: QualityTier) {
  const spacing = quality === "high" ? 0.6 : 1.2;
  const n = Math.max(2, Math.round(curve.getLength() / spacing));
  return Array.from({ length: n }, (_, i) => {
    const { p, side, down, t } = frameAt(curve, (i + 0.5) / n, TROUGH_R);
    return new THREE.Matrix4().makeBasis(side, down, t).setPosition(p);
  });
}

/** Everything one slide needs: trough, ribs, supports and the gangway from the tower. */
function buildSlide(s: Slide, quality: QualityTier) {
  const curve = curveOf(s.path);
  const rib = new THREE.TorusGeometry(
    TROUGH_R * 1.03,
    0.022,
    4,
    18,
    Math.PI + 0.5,
  );
  rib.rotateZ(-0.25);
  const ribs = ribMatrices(curve, quality);
  const ribMesh = instanced(rib, toon("#ffffff"), ribs.length);
  ribs.forEach((m, i) => ribMesh.setMatrixAt(i, m));

  const sup = supports(s.path);
  const supMesh = instanced(
    new THREE.CylinderGeometry(0.08, 0.08, 1, 8),
    toon("#f4f4f4"),
    sup.length,
  );
  sup.forEach(([x, y, z], k) =>
    supMesh.setMatrixAt(
      k,
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, (y - 0.3) / 2, z),
        new THREE.Quaternion(),
        new THREE.Vector3(1, y - 0.3, 1),
      ),
    ),
  );

  // a gangway from the tower to the top of the slide
  const [x0, y0, z0] = s.path[0];
  const dx = x0 - TOWER.x;
  const dz = z0 - TOWER.z;
  const reach = Math.hypot(dx, dz);
  const gangway = new Props()
    .add(
      new THREE.BoxGeometry(0.9, 0.12, reach + 0.4),
      "#ffffff",
      [TOWER.x + dx / 2, y0 - 0.14, TOWER.z + dz / 2],
      [0, Math.atan2(dx, dz), 0],
    )
    .geometry();

  return {
    trough: troughGeometry(curve, TROUGH_R),
    troughMaterial: new THREE.MeshToonMaterial({
      color: s.color,
      gradientMap,
      side: THREE.DoubleSide,
    }),
    ribs: ribMesh,
    supports: supMesh,
    gangway,
  };
}

const ROOF = stripes(["#ff3f9e", "#ffffff", "#ffd23f", "#ffffff"], 4);

/** Flag poles on the tower, as tower-local positions. Each flag is animated on its own. */
const FLAGS: readonly { at: Vec3; color: string }[] = [
  { at: [0, TOWER.top + 2.6, 0], color: "#ff3f9e" },
  { at: [0.95, TOWER.top + 1.3, 0.95], color: "#ffd23f" },
  { at: [-0.95, TOWER.top + 1.3, 0.95], color: "#3fc2ff" },
];

function Flag({ position, color }: { position: Vec3; color: string }) {
  const flag = useRef<THREE.Mesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (flag.current && !calm)
      flag.current.rotation.y =
        Math.sin(clock.elapsedTime * 3.2 + position[0]) * 0.35;
  });
  return (
    <group position={position}>
      <mesh ref={flag} position-y={1.05} material={toon(color)}>
        <coneGeometry args={[0.16, 0.6, 3]} />
      </mesh>
    </group>
  );
}

/** The tower's structure in tower-local space: posts, decks, stairs, rails, hoop and flag poles. */
function towerGeometry() {
  const deck = ["#3fc2ff", "#ff3f9e", "#7cf0c8"];
  const props = new Props();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      props.add(new THREE.CylinderGeometry(0.13, 0.15, 7.8, 10), "#ffd23f", [
        sx * 0.95,
        3.9,
        sz * 0.95,
      ]);
    }
  }
  [2.2, 4.4, TOWER.top - 0.12].forEach((y, i) =>
    props.add(new THREE.BoxGeometry(2.3, 0.16, 2.3), deck[i], [0, y, 0]),
  );
  // zigzag stairs on the open (+z) side
  for (let i = 0; i < 12; i++) {
    props.add(
      new THREE.BoxGeometry(1.1, 0.08, 0.5),
      "#ffffff",
      [-0.5 + (i % 2), 0.28 + i * 0.53, 1.25],
      [0, 0, (i % 2 ? -1 : 1) * 0.5],
    );
  }
  // a flat rail round the top deck, on four posts
  props.add(
    new THREE.TorusGeometry(1.5, 0.04, 6, 32),
    "#ffffff",
    [0, TOWER.top + 0.5, 0],
    [Math.PI / 2, 0, 0],
  );
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    props.add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), "#ffffff", [
      Math.cos(a) * 1.5,
      TOWER.top + 0.25,
      Math.sin(a) * 1.5,
    ]);
  }
  props.add(
    new THREE.TorusGeometry(2.05, 0.08, 6, 32),
    "#ff3f9e",
    [0, TOWER.top + 1.38, 0],
    [Math.PI / 2, 0, 0],
  );
  for (const f of FLAGS) {
    props.add(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), "#ffffff", [
      f.at[0],
      f.at[1] + 0.6,
      f.at[2],
    ]);
  }
  return props.geometry();
}

/** Foam rings where each slide meets the pool, one instanced mesh. */
function landingFoam() {
  const geo = new THREE.RingGeometry(0.42, 0.78, 28);
  geo.rotateX(-Math.PI / 2);
  const mesh = instanced(
    geo,
    new THREE.MeshBasicMaterial({
      color: "#f4ffff",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
    SLIDES.length,
  );
  SLIDES.forEach((s, i) => {
    const [x, , z] = s.path[s.path.length - 1];
    mesh.setMatrixAt(
      i,
      new THREE.Matrix4().makeTranslation(x, POOL.water + 0.1, z),
    );
  });
  return mesh;
}

/** One slide: its trough is the click target that rides it. */
function SlideRide({
  slide,
  quality,
  onTap,
}: {
  slide: Slide;
  quality: QualityTier;
  onTap: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const built = useMemo(() => buildSlide(slide, quality), [slide, quality]);
  return (
    <group onClick={onTap}>
      <mesh geometry={built.trough} material={built.troughMaterial} />
      <primitive object={built.ribs} />
      <primitive object={built.supports} />
      <mesh geometry={built.gangway} material={PROPS} />
    </group>
  );
}

/**
 * The slide tower: a candy-striped scaffold with three slides spiralling
 * down into the wave pool. Tapping the tower or a slide rides it.
 */
export function Tower({ onRide }: { onRide: (slide: number) => void }) {
  const quality = useQuality();
  const structure = useMemo(towerGeometry, []);
  const foam = useMemo(landingFoam, []);
  const tap = (slide: number) => (e: ThreeEvent<MouseEvent>) => {
    // a drag is an orbit, not a tap
    if (e.delta > 6) return;
    e.stopPropagation();
    onRide(slide);
  };
  return (
    <group>
      <group position={[TOWER.x, 0, TOWER.z]} onClick={tap(0)}>
        <mesh geometry={structure} material={PROPS} />
        <mesh position-y={TOWER.top + 2.05}>
          <coneGeometry args={[2.1, 1.3, 16, 1, true]} />
          <meshToonMaterial map={ROOF} side={THREE.DoubleSide} />
        </mesh>
        {FLAGS.map((f) => (
          <Flag key={f.color} position={f.at} color={f.color} />
        ))}
      </group>
      {SLIDES.map((s, i) => (
        <SlideRide key={s.id} slide={s} quality={quality} onTap={tap(i)} />
      ))}
      <primitive object={foam} />
    </group>
  );
}
