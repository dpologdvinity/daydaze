// Sucre patisserie scene: the pastry case, cafe tables, a chandelier and the
// marble stand where the macaron tower minigame builds. The tower draws at most
// MAX_LAYERS layers; tower units become meters through UNIT.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { height, WIDTH } from "../../game/macaronTower.ts";
import type { Look } from "../../game/look.ts";
import { BAKER, BOUNDS, CASE, STAND, TABLES } from "../../game/patisserie.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted, plant, poster } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { sliderNow, tower } from "./patisserie/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.2;
/** Meters per tower unit, a macaron's thickness, and the stand's top. */
const UNIT = 0.32;
const LAYER = 0.07;
const STAND_TOP = 1.05;
const MAX_LAYERS = 60;
const MACARON_COLORS = ["#ffb3d9", "#b8f0d8", "#fff0a8", "#d8c0ff", "#ffc8a8"];

const PLASTER = surface("painted_plaster_wall", {
  scale: 0.5,
  color: "#ffd8e4",
});
const PANEL = surface("square_tiled_wall", {
  scale: 0.8,
  color: "#c8fff0",
  roughness: 0.4,
});
const MARBLE = surface("marble_01", { scale: 1, roughness: 0.15 });
const GLASS = new THREE.MeshStandardMaterial({
  color: "#f4fbff",
  transparent: true,
  opacity: 0.2,
  roughness: 0.05,
});
const CRYSTAL = new THREE.MeshBasicMaterial({
  color: hdr("#fff4e8", 2),
  toneMapped: false,
});

const BAKER_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "top-knot",
  hairColor: "#b77a3e",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "sundress",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};
const GUEST: Look = {
  ...BAKER_LOOK,
  skin: "#633c29",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  outfit: "baby-tee-mini",
  outfitColor: "#ff2f9a",
  shadow: "#d23cff",
};

function useRoom() {
  return useMemo(() => {
    const b = new Batch();
    // pink plaster above mint wainscoting
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), PLASTER, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), PLASTER, {
        position: [x, H / 2, 0],
      });
    b.add(new THREE.BoxGeometry(W, 1.1, 0.05), PANEL, {
      position: [0, 0.55, z0 + 0.03],
    });
    for (const x of [x0 + 0.03, x1 - 0.03])
      b.add(new THREE.BoxGeometry(0.05, 1.1, D), PANEL, {
        position: [x, 0.55, 0],
      });
    // the pastry case: mint base, marble top, glass, cakes on two tiers
    const cw = CASE.x1 - CASE.x0;
    const cz = (CASE.z0 + CASE.z1) / 2;
    b.add(new THREE.BoxGeometry(cw, 0.9, CASE.z1 - CASE.z0), PANEL, {
      position: [0, 0.45, cz],
    });
    b.add(new THREE.BoxGeometry(cw + 0.1, 0.05, 0.9), MARBLE, {
      position: [0, 0.92, cz],
    });
    b.add(new THREE.BoxGeometry(cw, 0.55, 0.7), GLASS, {
      position: [0, 1.22, cz],
    });
    const cake = new THREE.CylinderGeometry(0.13, 0.13, 0.14, 16);
    const tart = new THREE.CylinderGeometry(0.1, 0.09, 0.05, 14);
    const mac = new THREE.SphereGeometry(0.05, 10, 6);
    for (let i = 0; i < 14; i++) {
      const x = CASE.x0 + 0.4 + i * 0.6;
      const c = MACARON_COLORS[i % MACARON_COLORS.length] ?? "#ffb3d9";
      b.add(painted(i % 2 ? cake : tart, c), GLOSS, {
        position: [x, i % 2 ? 1.02 : 0.98, cz],
      });
      for (let k = 0; k < 3; k++)
        b.add(
          painted(mac, MACARON_COLORS[(i + k) % MACARON_COLORS.length] ?? c),
          GLOSS,
          {
            position: [x - 0.12 + k * 0.12, 1.3, cz + 0.1],
            scale: [1, 0.6, 1],
          },
        );
    }
    // the back counter and a shelf of cake stands and tins
    b.add(new THREE.BoxGeometry(cw, 0.95, 0.4), PANEL, {
      position: [0, 0.475, -5.8],
    });
    b.add(new THREE.BoxGeometry(cw, 0.04, 0.3), MARBLE, {
      position: [0, 1.95, z0 + 0.15],
    });
    for (let i = 0; i < 9; i++)
      b.add(
        painted(
          new THREE.CylinderGeometry(0.12, 0.12, 0.2, 14),
          ["#ffb3d9", "#b8f0d8", "#f4f0e8"][i % 3] ?? "#ffb3d9",
        ),
        GLOSS,
        { position: [CASE.x0 + 0.6 + i * 1, 2.07, z0 + 0.15] },
      );
    // the marble stand for the tower, gold-footed
    b.add(new THREE.CylinderGeometry(0.42, 0.5, 0.95, 20), MARBLE, {
      position: [STAND[0], 0.475, STAND[1]],
    });
    b.add(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 24), MARBLE, {
      position: [STAND[0], STAND_TOP - 0.05, STAND[1]],
    });
    b.add(new THREE.TorusGeometry(0.46, 0.02, 6, 32), GOLD, {
      position: [STAND[0], STAND_TOP - 0.05, STAND[1]],
      rotation: [Math.PI / 2, 0, 0],
    });
    // cafe tables in marble and gold, with pink-cushioned chairs
    for (const [x, z] of TABLES) {
      b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), MARBLE, {
        position: [x, 0.74, z],
      });
      b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.72, 8), GOLD, {
        position: [x, 0.36, z],
      });
      for (const side of [-1, 1]) {
        b.add(
          painted(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), "#ffb3d9"),
          GLOSS,
          { position: [x + side * 0.75, 0.47, z] },
        );
        b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 6), GOLD, {
          position: [x + side * 0.75, 0.22, z],
        });
        b.add(new THREE.TorusGeometry(0.18, 0.018, 6, 16, Math.PI), GOLD, {
          position: [x + side * 0.92, 0.75, z],
          rotation: [0, Math.PI / 2, 0],
        });
      }
      b.add(painted(new THREE.SphereGeometry(0.06, 10, 6), "#d8c0ff"), GLOSS, {
        position: [x + 0.1, 0.8, z],
        scale: [1, 0.6, 1],
      });
    }
    // the crystal chandelier: a gold ring of glowing drops
    b.add(new THREE.TorusGeometry(0.6, 0.03, 6, 32), GOLD, {
      position: [1.5, H - 0.9, 1.2],
      rotation: [Math.PI / 2, 0, 0],
    });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      b.add(new THREE.OctahedronGeometry(0.05), CRYSTAL, {
        position: [1.5 + Math.cos(a) * 0.6, H - 1.05, 1.2 + Math.sin(a) * 0.6],
        scale: [1, 1.8, 1],
      });
    }
    b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4), GOLD, {
      position: [1.5, H - 0.45, 1.2],
    });
    // framed prints, plants by the door
    for (let i = 0; i < 3; i++)
      poster(
        b,
        { x: x1 - 0.04, y: 2.3, z: -2 + i * 2.2, ry: -Math.PI / 2 },
        i + 2,
      );
    poster(b, { x: x0 + 0.04, y: 2.3, z: 3, ry: Math.PI / 2 }, 6);
    for (const [x, z] of [
      [x0 + 0.6, z1 - 0.8],
      [x1 - 0.6, z1 - 0.8],
    ] as const)
      plant(b, { x, z }, 1.4);
    return b.build();
  }, []);
}

/** The tower going up on the stand, and the macaron sliding over it. */
function Tower() {
  const s = tower.use();
  const layers = useRef<THREE.InstancedMesh>(null);
  const slider = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    const m = layers.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    // the base layer is the stand itself; macarons from 1 up
    const list = s.on ? s.tower.layers.slice(1, MAX_LAYERS + 1) : [];
    list.forEach((l, i) => {
      o.position.set(
        STAND[0] + l.x * UNIT,
        STAND_TOP + LAYER / 2 + i * LAYER,
        STAND[1],
      );
      o.scale.set(l.width * UNIT, LAYER, WIDTH * UNIT);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(
        i,
        c.set(MACARON_COLORS[i % MACARON_COLORS.length] ?? "#fff"),
      );
    });
    m.count = list.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [s]);
  useFrame(() => {
    const m = slider.current;
    if (!m) return;
    const live = tower.get();
    m.visible = live.on && !live.tower.over;
    if (!m.visible) return;
    const top = live.tower.layers[live.tower.layers.length - 1];
    m.position.set(
      STAND[0] + sliderNow(performance.now()) * UNIT,
      STAND_TOP + LAYER / 2 + Math.min(height(live.tower), MAX_LAYERS) * LAYER,
      STAND[1],
    );
    m.scale.set((top?.width ?? WIDTH) * UNIT, LAYER, WIDTH * UNIT);
  });
  return (
    <>
      <instancedMesh
        ref={layers}
        args={[undefined, undefined, MAX_LAYERS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.5, 16, 8]} />
        <meshStandardMaterial roughness={0.45} />
      </instancedMesh>
      <mesh ref={slider} visible={false}>
        <sphereGeometry args={[0.5, 16, 8]} />
        <meshStandardMaterial color="#ffb3d9" roughness={0.45} />
      </mesh>
    </>
  );
}

/**
 * Sucre on Park Avenue: a pink and mint salon de the, a long glass case of
 * cakes, tarts and macarons, marble tables under a crystal chandelier, and
 * the marble stand where you can build a macaron tower. Colette bakes.
 */
export function Patisserie({ onPick }: { onPick: PickHandler }): JSX.Element {
  const room = useRoom();
  return (
    <>
      <color attach="background" args={["#2a1a20"]} />
      <hemisphereLight args={["#fff4f8", "#8a6a70", 2]} />
      <pointLight
        position={[1.5, 3, 1.2]}
        color="#fff0e0"
        intensity={8}
        distance={12}
      />
      <pointLight
        position={[0, 2.6, -3]}
        color="#ffd8e8"
        intensity={6}
        distance={10}
      />
      <Floor
        width={W}
        depth={D}
        color="#f4ecec"
        texture={{ id: "checkered_pavement_tiles", scale: 0.6 }}
        low={{ metalness: 0, roughness: 0.4 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.patisserie} color="#ffc8dd" />
      <primitive object={room} />
      <Tower />
      <NeonText
        text="sucre"
        color="#ff8ac8"
        font={SCRIPT}
        width={2.2}
        k={2.4}
        position={[0, 2.95, z0 + 0.06]}
      />
      <TalkingNpc
        name="Colette"
        role="server"
        look={BAKER_LOOK}
        mood="idle"
        at={[BAKER[0], 0, BAKER[1]]}
        rot={0}
        seed={551}
        greet
        context={{ venue: "patisserie", neighborhood: "uptown" }}
      />
      <group position={[5.6, 0, 2.2]} rotation-y={-2.2}>
        <CrowdFigure look={GUEST} move="chatting" seed={552} />
      </group>
    </>
  );
}
