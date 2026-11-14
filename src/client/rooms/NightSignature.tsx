// The one strong visual each weekly night carries (src/game/nightLook.ts):
// - NightGrade darkens the room's own lights and sky, and (blacklight) makes
//   saturated colors and whites fluoresce, so the room reads as that night.
// - Lasers: a canopy of colored beams sweeping the hall from the ceiling.
// - Cannons: confetti cannons that take turns firing big bursts.
// One draw call each (instanced beams, a point cloud of confetti, instanced
// barrels); the sweep and the motion run allocation-free in useFrame.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  cannonAge,
  confettiAt,
  laserAim,
  type NightLook,
} from "../../game/nightLook.ts";
import { useReducedMotion } from "../motion.ts";
import { patchBlacklight, uvGlow } from "./shared/blacklight.ts";
import { rand, shapeTexture } from "./shared/nightSprites.ts";

/** The floor extents of a room and how high its ceiling is. */
export type Hall = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  ceiling: number;
};

/** A light the grade has dimmed: what the room set, and what we set. */
type Dimmed = { light: THREE.Light; base: number; set: number };

/** A cold blue the shaded sky and scenery are multiplied by. */
const COOL = new THREE.Color(0.6, 0.72, 1);

/** Frames between sweeps for lights and materials the room has added. */
const SWEEP_EVERY = 15;

/**
 * Applies a night's look to whatever the room has put in the scene: dims its
 * lights, takes the sky and fog to the backdrop color, and patches materials
 * for the blacklight glow. Rooms mount after the night, so the sweep repeats
 * every few frames; a light is dimmed once, so one the room keeps animating
 * is left to it after that.
 */
export function NightGrade({ look }: { look: NightLook }) {
  const scene = useThree((s) => s.scene);
  const state = useMemo(
    () => ({
      frame: 0,
      dimmed: [] as Dimmed[],
      seen: new Set<THREE.Light>(),
      shaded: [] as { material: THREE.MeshBasicMaterial; base: THREE.Color }[],
      shadedSeen: new Set<THREE.Material>(),
      squashed: [] as { mesh: THREE.Object3D; scale: number; y: number }[],
      backdrop: new THREE.Color(),
      saved: null as null | {
        background: THREE.Color | null;
        bg: number;
        fog: THREE.Fog | THREE.FogExp2 | null;
        fogHex: number;
      },
    }),
    [],
  );
  const visit = useMemo(() => {
    const touch = (m: THREE.Material) => {
      if (look.signature === "blacklight") patchBlacklight(m);
      // unlit sky art and flat scenery: lights can't dim it, so scale it
      if (
        look.shade !== undefined &&
        m instanceof THREE.MeshBasicMaterial &&
        (m.toneMapped || !m.fog) &&
        !state.shadedSeen.has(m)
      ) {
        state.shadedSeen.add(m);
        state.shaded.push({ material: m, base: m.color.clone() });
        // the sky dome itself goes nearly black; scenery and the sun, not
        const k = m.side === THREE.BackSide ? look.shade * 0.3 : look.shade;
        m.color.multiplyScalar(k).multiply(COOL);
      }
    };
    return (o: THREE.Object3D) => {
      if (o instanceof THREE.Light) {
        // the night's own fill light is marked, and left alone
        if (o.userData.nightKeep || state.seen.has(o)) return;
        state.seen.add(o);
        const k = o instanceof THREE.DirectionalLight ? look.key : look.lights;
        const entry = { light: o, base: o.intensity, set: o.intensity * k };
        o.intensity = entry.set;
        state.dimmed.push(entry);
        return;
      }
      if (
        look.skyline !== undefined &&
        typeof o.userData.skyline === "number" &&
        !state.squashed.some((q) => q.mesh === o)
      ) {
        // squash toward the street it stands on, so the towers drop out of the sky
        state.squashed.push({ mesh: o, scale: o.scale.y, y: o.position.y });
        o.scale.y *= look.skyline;
        o.position.y =
          o.userData.skyline * (1 - look.skyline) + o.position.y * look.skyline;
      }
      if (o instanceof THREE.Mesh) {
        if (Array.isArray(o.material)) o.material.forEach(touch);
        else touch(o.material);
      }
    };
  }, [look, state]);

  useEffect(() => {
    if (look.signature === "blacklight") uvGlow.value = 1;
    const dimmed = state.dimmed;
    const seen = state.seen;
    const shaded = state.shaded;
    return () => {
      for (const q of state.squashed) {
        q.mesh.scale.y = q.scale;
        q.mesh.position.y = q.y;
      }
      state.squashed.length = 0;
      for (const s of shaded) s.material.color.copy(s.base);
      shaded.length = 0;
      state.shadedSeen.clear();
      uvGlow.value = 0;
      // put back what the room set, for the lights still in the scene
      for (const d of dimmed)
        if (d.light.intensity === d.set) d.light.intensity = d.base;
      dimmed.length = 0;
      seen.clear();
      const s = state.saved;
      if (s) {
        if (s.background && scene.background === s.background)
          s.background.setHex(s.bg);
        if (s.fog && scene.fog === s.fog) s.fog.color.setHex(s.fogHex);
        state.saved = null;
      }
    };
  }, [look, scene, state]);

  useFrame(() => {
    if (state.frame++ % SWEEP_EVERY !== 0) return;
    scene.traverse(visit);
    if (look.backdrop) {
      const bg =
        scene.background instanceof THREE.Color ? scene.background : null;
      const fog = scene.fog;
      // a room may have a sky color, a fog, or both (the hotel's is fog only)
      if (
        !state.saved ||
        state.saved.background !== bg ||
        state.saved.fog !== fog
      )
        state.saved = {
          background: bg,
          bg: bg?.getHex() ?? 0,
          fog,
          fogHex: fog?.color.getHex() ?? 0,
        };
      state.backdrop.set(look.backdrop);
      bg?.copy(state.backdrop);
      fog?.color.copy(state.backdrop);
    }
  });
  return null;
}

const BEAM_COLORS = [
  "#3dff8a",
  "#ff3df0",
  "#3df0ff",
  "#ffd13d",
  "#8a5cff",
  "#ff5a4f",
];
const FIXTURES = 3;
const PER_FIXTURE = BEAM_COLORS.length;

/** A canopy of laser beams: fixtures along the ceiling, each a turning fan. */
export function Lasers({ hall }: { hall: Hall }) {
  const calm = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const length = hall.ceiling * 1.8;
  const geometry = useMemo(() => {
    // apex at the fixture, pointing down; brightest at the source, fading out
    const g = new THREE.CylinderGeometry(0.015, 0.06, length, 5, 1, true);
    g.translate(0, -length / 2, 0);
    const pos = g.getAttribute("position");
    const fade = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const f = 1 - 0.8 * (-pos.getY(i) / length);
      fade.set([f, f, f], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(fade, 3));
    return g;
  }, [length]);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < FIXTURES * PER_FIXTURE; i++)
      m.setColorAt(
        i,
        c.set(BEAM_COLORS[i % PER_FIXTURE] ?? "#ffffff").multiplyScalar(1.2),
      );
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime * (calm ? 0.25 : 1);
    const w = hall.x1 - hall.x0;
    for (let f = 0; f < FIXTURES; f++) {
      for (let i = 0; i < PER_FIXTURE; i++) {
        // alternate fixtures turn opposite ways, so the fans weave
        const [yaw, tilt] = laserAim(i, PER_FIXTURE, f % 2 === 0 ? t : -t + f);
        scratch.position.set(
          hall.x0 + ((f + 0.5) / FIXTURES) * w,
          hall.ceiling - 0.3,
          (hall.z0 + hall.z1) / 2,
        );
        scratch.rotation.set(tilt, yaw, 0, "YXZ");
        scratch.updateMatrix();
        m.setMatrixAt(f * PER_FIXTURE + i, scratch.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, FIXTURES * PER_FIXTURE]}
      frustumCulled={false}
    />
  );
}

/**
 * Keeps a points material's sprites from filling the screen: caps their size
 * in pixels and fades them out within a few meters of the camera.
 */
function nearFade(m: THREE.PointsMaterial, maxPx: number) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <fog_vertex>",
      `gl_PointSize = min(gl_PointSize, ${maxPx.toFixed(1)});
      #ifdef USE_COLOR
      vColor.rgb *= smoothstep(1.5, 5.0, -mvPosition.z);
      #endif
      #include <fog_vertex>`,
    );
  };
  m.customProgramCacheKey = () => `near-fade-${maxPx}`;
}

const CANNONS = 4;
const SCRAPS = 56;
const CONFETTI = [
  "#ff4fd8",
  "#4fe3ff",
  "#c3ff3d",
  "#ffd84f",
  "#9b5cff",
  "#ffffff",
];

/** Four confetti cannons by the corners, firing in turn. */
export function Cannons({ hall, low }: { hall: Hall; low: boolean }) {
  const calm = useReducedMotion();
  const per = low ? SCRAPS / 2 : SCRAPS;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = CANNONS * per;
    const colors = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.set(CONFETTI[i % CONFETTI.length] ?? "#ffffff").multiplyScalar(1.5);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    );
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [per]);
  const material = useMemo(() => {
    const m = new THREE.PointsMaterial({
      map: shapeTexture("square"),
      size: 0.2 + hall.ceiling * 0.03,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    nearFade(m, 22);
    return m;
  }, [hall.ceiling]);
  // each cannon stands at a corner, a little in from the walls
  const spots = useMemo(
    () =>
      [
        [hall.x0 + 2, hall.z0 + 4],
        [hall.x1 - 2, hall.z0 + 4],
        [hall.x0 + 2, hall.z1 - 2],
        [hall.x1 - 2, hall.z1 - 2],
      ] as const,
    [hall],
  );
  const barrels = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = barrels.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach(([x, z], k) => {
      o.position.set(x, 0.55, z);
      // lean in toward the middle of the hall
      o.rotation.set(
        ((hall.z0 + hall.z1) / 2 - z) * 0.03,
        0,
        -((hall.x0 + hall.x1) / 2 - x) * 0.03,
      );
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots, hall]);
  const out = useMemo<[number, number, number]>(() => [0, 0, 0], []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.25 : 1);
    const pos = geometry.getAttribute("position");
    for (let k = 0; k < CANNONS; k++) {
      const age = cannonAge(k, t);
      const spot = spots[k];
      if (!spot) continue;
      for (let j = 0; j < per; j++) {
        const i = k * per + j;
        // scraps leave the barrel together, a hair apart in time
        confettiAt(
          age - rand(i, 5) * 0.25,
          rand(i, 1),
          rand(i, 2),
          hall.ceiling,
          out,
        );
        pos.setXYZ(i, spot[0] + out[0], out[1] + 0.9, spot[1] + out[2]);
      }
    }
    pos.needsUpdate = true;
  });
  return (
    <>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <instancedMesh ref={barrels} args={[undefined, undefined, CANNONS]}>
        <cylinderGeometry args={[0.16, 0.26, 1.1, 10]} />
        <meshBasicMaterial color="#ff4fd8" toneMapped={false} />
      </instancedMesh>
    </>
  );
}
