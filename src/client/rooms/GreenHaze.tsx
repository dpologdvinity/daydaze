import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BOUNDS,
  BUDTENDER,
  COUNTER,
  GROW,
  NOOKS,
} from "../../game/greenHaze.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD, hdr } from "./shared/materials.ts";
import { MARQUEE, Neon, NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const GREEN = "#7dff6b";
const PURPLE = "#b14dff";
const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.2;

const BRICK = surface("brick_wall_02", { scale: 0.6, color: "#4a6a52" });
const WOOD = surface("wood_veneer", {
  scale: 1,
  color: "#8a5a3a",
  roughness: 0.6,
});
const VELVET = surface("velour_velvet", {
  scale: 1.5,
  color: "#2d6a4f",
  roughness: 0.9,
});
const PLUM = surface("velour_velvet", {
  scale: 1.5,
  color: "#5a2a6a",
  roughness: 0.9,
});
const RUG = surface("carpet", { scale: 0.8, color: "#c08a4a" });
const BRASS = GOLD;
const GLASS = new THREE.MeshStandardMaterial({
  color: "#dff8ef",
  transparent: true,
  opacity: 0.22,
  roughness: 0.04,
  metalness: 0.1,
});
const GROW_LIGHT = new THREE.MeshBasicMaterial({
  color: hdr("#d07bff", 2.4),
  toneMapped: false,
});
const LEAF = new THREE.MeshStandardMaterial({
  color: "#3f8f3a",
  roughness: 0.7,
  side: THREE.DoubleSide,
});
const BUD = new THREE.MeshStandardMaterial({
  color: "#8fbf5a",
  roughness: 0.9,
});
const JAR_LID = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.4,
  metalness: 0.4,
});

const BUDTENDER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "braids",
  hairColor: "#1b1014",
  lips: "lips-90s-caramel-ombre",
  brows: "brows-sculpted-espresso",
  outfit: "jeans",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};
const LOUNGER: Look = {
  skin: "#f3d4c4",
  hairStyle: "shag",
  hairColor: "#7b4dff",
  lips: "lips-nude-pink-gloss",
  brows: "brows-y2k-thin",
  outfit: "fur",
  outfitColor: "#9b5cff",
  shadow: "#d23cff",
};
const REGULARS: readonly {
  at: [number, number, number];
  rot: number;
  look: Look;
}[] = [
  {
    at: [3.2, 0, 3.4],
    rot: -2.4,
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-fox-snatched",
      outfit: "flares",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
  },
  {
    at: [-1.8, 0, 2.6],
    rot: 2.6,
    look: {
      skin: "#e6b48e",
      hairStyle: "pixie",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "jeans",
      outfitColor: "#141018",
      shadow: "#ff2f9a",
    },
  },
];

/** A psychedelic mushroom mural, painted once. */
function muralTex() {
  return canvasTex(512, 256, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#2a0a4a");
    sky.addColorStop(1, "#0a3a2a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);
    // swirls
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = ["#ff4fb3", "#ffd84f", "#3fe0d0", "#b14dff"][i % 4];
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.1) {
        const r = 4 + a * 5;
        const x = 30 + i * 58 + Math.cos(a) * r * 0.5;
        const y = 70 + Math.sin(a) * r * 0.35;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a row of fat toadstools with spotted caps
    const caps = ["#e63946", "#ff8a3d", "#b14dff", "#ff4fb3", "#ffd84f"];
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 100;
      const s = 0.8 + (i % 2) * 0.35;
      ctx.fillStyle = "#f4ead2";
      ctx.fillRect(x - 12 * s, 170 - 10 * s, 24 * s, 80 * s);
      ctx.fillStyle = caps[i] ?? "#e63946";
      ctx.beginPath();
      ctx.ellipse(x, 170 - 10 * s, 52 * s, 40 * s, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(
          x - 34 * s + k * 13 * s,
          150 - 10 * s - ((k * 7) % 3) * 8 * s,
          5 * s,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  });
}

/** The room's shell and furniture, merged per material. */
function useShell(mural: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const MURAL = new THREE.MeshBasicMaterial({ map: mural });
    // brick walls on three sides
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), BRICK, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), BRICK, {
        position: [x, H / 2, 0],
      });
    // the mural over the east nook
    b.add(new THREE.PlaneGeometry(5.6, 2.8), MURAL, {
      position: [x1 - 0.01, 2.3, 0.6],
      rotation: [0, -Math.PI / 2, 0],
    });
    // the glass counter: a wood base, a glass case with a brass rail
    const cx = (COUNTER.x0 + COUNTER.x1) / 2;
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    const cw = COUNTER.x1 - COUNTER.x0;
    const cd = COUNTER.z1 - COUNTER.z0;
    b.add(new THREE.BoxGeometry(cw, 0.6, cd), WOOD, {
      position: [cx, 0.3, cz],
    });
    b.add(new THREE.BoxGeometry(cw, 0.5, cd), GLASS, {
      position: [cx, 0.85, cz],
    });
    b.add(new THREE.BoxGeometry(cw + 0.06, 0.04, 0.04), BRASS, {
      position: [cx, 1.11, COUNTER.z1],
    });
    // shelves behind the counter
    for (const y of [1.5, 2.1, 2.7])
      b.add(new THREE.BoxGeometry(cw, 0.05, 0.35), WOOD, {
        position: [cx, y, z0 + 0.2],
      });
    // the grow wall: glass front, purple light bars
    const gx = (GROW.x0 + GROW.x1) / 2;
    const gz = (GROW.z0 + GROW.z1) / 2;
    const gd = GROW.z1 - GROW.z0;
    b.add(new THREE.BoxGeometry(0.04, 2.6, gd), GLASS, {
      position: [GROW.x1, 1.3, gz],
    });
    for (const y of [1.2, 2.5])
      b.add(new THREE.BoxGeometry(0.6, 0.05, gd - 0.2), GROW_LIGHT, {
        position: [gx, y, gz],
      });
    // two nooks: an L of couches round a low table on a rug
    NOOKS.forEach(({ table: [tx, tz] }, i) => {
      const side = tx < 0 ? -1 : 1;
      const fabric = i === 0 ? VELVET : PLUM;
      b.add(new THREE.BoxGeometry(2.8, 0.02, 2.8), RUG, {
        position: [tx, 0.01, tz],
      });
      // back couch along the wall, and one along the nook's front
      b.add(new THREE.BoxGeometry(0.9, 0.45, 2.6), fabric, {
        position: [tx + side * 1.4, 0.23, tz],
      });
      b.add(new THREE.BoxGeometry(0.25, 0.55, 2.6), fabric, {
        position: [tx + side * 1.8, 0.65, tz],
      });
      b.add(new THREE.BoxGeometry(2, 0.45, 0.9), fabric, {
        position: [tx + side * 0.2, 0.23, tz - 1.5],
      });
      b.add(new THREE.BoxGeometry(2, 0.55, 0.25), fabric, {
        position: [tx + side * 0.2, 0.65, tz - 1.9],
      });
      // the low table, its brass ashtray and a glass bong
      b.add(new THREE.BoxGeometry(1.1, 0.06, 1.1), WOOD, {
        position: [tx, 0.4, tz],
      });
      for (const [lx, lz] of [
        [-0.45, -0.45],
        [0.45, -0.45],
        [-0.45, 0.45],
        [0.45, 0.45],
      ] as const)
        b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.37, 6), BRASS, {
          position: [tx + lx, 0.19, tz + lz],
        });
      b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.03, 16), BRASS, {
        position: [tx + 0.25, 0.445, tz + 0.2],
      });
      b.add(
        new THREE.LatheGeometry(
          [
            [0.08, 0],
            [0.09, 0.08],
            [0.03, 0.16],
            [0.025, 0.45],
            [0.04, 0.5],
          ].map(([r, y]) => new THREE.Vector2(r, y)),
          14,
        ),
        GLASS,
        { position: [tx - 0.2, 0.43, tz - 0.1] },
      );
    });
    return b.build();
  }, [mural]);
}

/** Jars of buds in the glass case, and cannabis plants on the grow wall. */
function Stock() {
  const jars = useRef<THREE.InstancedMesh>(null);
  const lids = useRef<THREE.InstancedMesh>(null);
  const buds = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    // a fan leaf: seven narrow blades spread from the stem
    const blade = new THREE.PlaneGeometry(0.035, 0.22).translate(0, 0.11, 0);
    const parts = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].map((a) =>
      blade
        .clone()
        .scale(1, 1 - Math.abs(a) * 0.35, 1)
        .rotateZ(a),
    );
    const leaf = new THREE.BufferGeometry();
    const pos: number[] = [];
    const nor: number[] = [];
    for (const p of parts) {
      const g = p.toNonIndexed();
      pos.push(...g.attributes.position.array);
      nor.push(...g.attributes.normal.array);
    }
    leaf.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    leaf.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    return {
      jar: new THREE.CylinderGeometry(0.08, 0.08, 0.2, 14),
      lid: new THREE.CylinderGeometry(0.085, 0.085, 0.04, 14),
      bud: new THREE.IcosahedronGeometry(0.05, 0),
      leaf,
    };
  }, []);
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
    },
    [geo],
  );
  const JARS = 10;
  const PLANTS = 6;
  const LEAVES = 14;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < JARS; i++) {
      const x =
        COUNTER.x0 + 0.4 + i * ((COUNTER.x1 - COUNTER.x0 - 0.8) / (JARS - 1));
      const z = (COUNTER.z0 + COUNTER.z1) / 2;
      jars.current?.setMatrixAt(i, m.makeTranslation(x, 0.72, z));
      lids.current?.setMatrixAt(i, m.makeTranslation(x, 0.84, z));
      for (let k = 0; k < 3; k++)
        buds.current?.setMatrixAt(
          i * 3 + k,
          m.compose(
            v.set(
              x + (k - 1) * 0.03,
              0.67 + k * 0.02,
              z + ((k * 7) % 3) * 0.01,
            ),
            q.setFromEuler(e.set(k, i, 0)),
            one,
          ),
        );
    }
    // plants up the grow wall, a stem of fan leaves each
    for (let p = 0; p < PLANTS; p++) {
      const pz = GROW.z0 + 0.3 + p * ((GROW.z1 - GROW.z0 - 0.6) / (PLANTS - 1));
      const px = (GROW.x0 + GROW.x1) / 2;
      for (let k = 0; k < LEAVES; k++) {
        const y = 0.25 + k * 0.13;
        const turn = k * 2.4 + p;
        const tilt = 0.5 + (k % 3) * 0.2;
        leaves.current?.setMatrixAt(
          p * LEAVES + k,
          m.compose(
            v.set(px + Math.cos(turn) * 0.08, y, pz + Math.sin(turn) * 0.08),
            q.setFromEuler(e.set(tilt, turn, 0, "YXZ")),
            v.clone().setScalar(1.2 - k * 0.04),
          ),
        );
      }
    }
    for (const r of [jars, lids, buds, leaves])
      if (r.current) {
        r.current.instanceMatrix.needsUpdate = true;
        r.current.computeBoundingSphere();
      }
  }, []);
  return (
    <>
      <instancedMesh ref={jars} args={[geo.jar, GLASS, JARS]} />
      <instancedMesh ref={lids} args={[geo.lid, JAR_LID, JARS]} />
      <instancedMesh ref={buds} args={[geo.bud, BUD, JARS * 3]} />
      <instancedMesh ref={leaves} args={[geo.leaf, LEAF, PLANTS * LEAVES]} />
    </>
  );
}

/** A green neon leaf: seven blades, outlined. */
function leafPoints(): THREE.Vector3[][] {
  return [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].map((a) => {
    const len = 1 - Math.abs(a) * 0.35;
    const tip = new THREE.Vector3(Math.sin(a) * len, Math.cos(a) * len, 0);
    const side = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0).multiplyScalar(
      0.07,
    );
    const mid = tip.clone().multiplyScalar(0.5);
    return [
      new THREE.Vector3(0, 0, 0),
      mid.clone().add(side),
      tip,
      mid.clone().sub(side),
      new THREE.Vector3(0, 0, 0),
    ];
  });
}

/**
 * Green Haze on Gallery Row, 18+ only: exposed brick, a glass counter of
 * jars, a grow wall under purple lights, two velvet couch nooks, a mushroom
 * mural and a neon leaf. Light up, eat an edible or sip shroom tea from the
 * dock; age.ts keeps the door shut until the age check ships.
 */
export function GreenHaze({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const mural = useMemo(muralTex, []);
  useEffect(() => () => mural.dispose(), [mural]);
  const shell = useShell(mural);
  const leaf = useMemo(leafPoints, []);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glow.current && !calm)
      glow.current.intensity = 5 + Math.sin(clock.elapsedTime * 0.8) * 1.2;
  });
  return (
    <>
      <color attach="background" args={["#08120c"]} />
      <fog attach="fog" args={["#10261a", 9, 24]} />
      <hemisphereLight args={["#c8ffd8", "#2a0a3a", 1.5]} />
      <pointLight
        position={[0, 3.4, 1]}
        color="#ffd8a0"
        intensity={7}
        distance={14}
      />
      <pointLight
        ref={glow}
        position={[GROW.x1 + 0.6, 2, (GROW.z0 + GROW.z1) / 2]}
        color={PURPLE}
        intensity={5}
        distance={7}
      />
      <Floor
        width={W}
        depth={D}
        color="#8a6a5a"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.7 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["green-haze"]} color={GREEN} />
      <primitive object={shell} />
      <Stock />
      <group position={[-3.4, 2.7, z0 + 0.05]} scale={0.7}>
        {leaf.map((pts, i) => (
          <Neon key={i} points={pts} color={GREEN} k={3} radius={0.02} />
        ))}
      </group>
      <NeonText
        text="GREEN HAZE"
        color={GREEN}
        font={MARQUEE}
        width={4.4}
        k={3.2}
        position={[1.2, 3.4, z0 + 0.05]}
      />
      <NeonText
        text="stay lifted"
        color={PURPLE}
        font={SCRIPT}
        width={2.2}
        k={2.6}
        position={[1.2, 2.75, z0 + 0.05]}
        flicker
      />
      <NeonText
        text="18+"
        color="#ff4fb3"
        font={MARQUEE}
        width={0.9}
        k={3}
        position={[x0 + 0.05, 3.2, 3.6]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <Sparkles
        count={90}
        scale={[W - 1, 2.6, D - 1]}
        position={[0, 1.8, 0]}
        size={3}
        speed={calm ? 0 : 0.12}
        color="#d8ffe0"
        opacity={0.35}
      />
      <TalkingNpc
        name="Jade"
        role="coat-check"
        look={BUDTENDER_LOOK}
        mood="idle"
        at={[BUDTENDER[0], 0, BUDTENDER[1]]}
        rot={0}
        seed={391}
        greet
        context={{ venue: "green-haze", neighborhood: "arts-district" }}
      />
      {/* a regular stretched out on the west couch */}
      <group
        position={[
          NOOKS[0].table[0] - 1.4,
          0.45 - 0.48,
          NOOKS[0].table[1] + 0.4,
        ]}
        rotation-y={Math.PI / 2}
      >
        <Doll look={LOUNGER} mood="sit" hold="sit-reclined" seed={392} />
      </group>
      {REGULARS.map((r, i) => (
        <group key={i} position={r.at} rotation-y={r.rot}>
          <CrowdFigure look={r.look} move="chatting" seed={393 + i} />
        </group>
      ))}
    </>
  );
}
