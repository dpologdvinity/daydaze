// Thrift Temple, the Gallery Row vintage store in an old church hall: the
// batched shell (brick, arches, rose window, rails, counter, fitting rooms),
// instanced garments, today's find on the pedestal and Juno, who opens the
// thrift shop. Positions come from src/game/thriftTemple.ts; the daily find
// comes from thriftFind in shop.ts.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { dayOf } from "../../game/challenges.ts";
import { OUTFIT_COLORS, OUTFITS, type Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { thriftFind } from "../../game/shop.ts";
import {
  BOUNDS,
  CLERK,
  COUNTER,
  FITTING,
  PEDESTAL,
  RAIL_LENGTH,
  RAILS,
} from "../../game/thriftTemple.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { openShop } from "../ui/shopRequest.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted, plant, poster, rug } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 6;

const BRICK = surface("brick_wall_02", { scale: 0.5, color: "#e8b0a0" });
const PLASTER = surface("white_plaster_02", { scale: 0.6, color: "#f0e0d0" });
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#6a3a22",
  roughness: 0.5,
});
const VELVET = surface("velour_velvet", {
  scale: 1,
  color: "#8a1a3a",
  roughness: 0.9,
});
const MARBLE = surface("marble_01", { scale: 1, roughness: 0.2 });
const CHROME = new THREE.MeshStandardMaterial({
  color: "#e8e8f0",
  metalness: 1,
  roughness: 0.15,
});
const MIRROR = new THREE.MeshStandardMaterial({
  color: "#c8d0e0",
  metalness: 1,
  roughness: 0.05,
});
const LAMP = new THREE.MeshBasicMaterial({
  color: hdr("#ffd9a0", 2.2),
  toneMapped: false,
});
const CORD = new THREE.MeshBasicMaterial({ color: "#1a1418" });

/** The secondhand rails are every outfit color, the vintage dyes most. */
const RACK_COLORS = OUTFIT_COLORS.map((c) => c.id);

const CLERK_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "shag",
  hairColor: "#ff8a3d",
  lips: "lips-burgundy-cherry",
  brows: "brows-feathered-honey",
  outfit: "corset-maxi",
  outfitColor: "#6a1a2a",
  shadow: "#ffb02e",
};
const SHOPPER: Look = {
  ...CLERK_LOOK,
  skin: "#633c29",
  hairStyle: "coils",
  hairColor: "#1b1014",
  outfit: "cargo-crop",
  outfitColor: "#6b7a2a",
  shadow: "#3fe0d0",
};

/** A rose window: petals of stained glass round a gold center. */
function roseTex() {
  return canvasTex(256, 256, (ctx) => {
    const glass = ["#ff2f9a", "#3fe0d0", "#ffb02e", "#9b5cff", "#7dff6b"];
    ctx.fillStyle = "#1a1018";
    ctx.fillRect(0, 0, 256, 256);
    for (let ring = 3; ring > 0; ring--) {
      const n = ring * 6;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = glass[(i + ring) % glass.length] ?? "#ff2f9a";
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.arc(
          128,
          128,
          ring * 40,
          (i / n) * Math.PI * 2 + 0.03,
          ((i + 1) / n) * Math.PI * 2 - 0.03,
        );
        ctx.fill();
      }
      ctx.strokeStyle = "#1a1018";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(128, 128, ring * 40 - 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd84f";
    ctx.beginPath();
    ctx.arc(128, 128, 18, 0, Math.PI * 2);
    ctx.fill();
  });
}

function useRoom(rose: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const GLASS = new THREE.MeshBasicMaterial({
      map: rose,
      color: hdr("#ffffff", 1.4),
      toneMapped: false,
    });
    // brick walls with a plaster band, gothic-ish arches down the sides
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), BRICK, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), BRICK, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    for (const x of [x0 + 0.02, x1 - 0.02])
      for (let z = z0 + 3; z < z1; z += 3.6) {
        b.add(new THREE.BoxGeometry(0.04, 2.6, 1.6), PLASTER, {
          position: [x, 3.4, z],
        });
        b.add(
          new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16, 1, false, 0, Math.PI),
          PLASTER,
          {
            position: [x, 4.7, z],
            rotation: [0, 0, Math.PI / 2],
          },
        );
      }
    // the rose window over the pedestal, in a stone ring
    b.add(new THREE.CircleGeometry(1.5, 32), GLASS, {
      position: [0, 4.2, z0 + 0.02],
    });
    b.add(new THREE.TorusGeometry(1.55, 0.1, 8, 32), PLASTER, {
      position: [0, 4.2, z0 + 0.05],
    });
    // the pedestal for the find of the day
    b.add(new THREE.CylinderGeometry(0.6, 0.7, 0.45, 24), MARBLE, {
      position: [PEDESTAL[0], 0.225, PEDESTAL[1]],
    });
    b.add(new THREE.TorusGeometry(0.62, 0.03, 6, 32), GOLD, {
      position: [PEDESTAL[0], 0.45, PEDESTAL[1]],
      rotation: [Math.PI / 2, 0, 0],
    });
    // chrome rails on uprights
    for (const { x, z } of RAILS) {
      b.add(new THREE.CylinderGeometry(0.02, 0.02, RAIL_LENGTH, 8), CHROME, {
        position: [x, 1.6, z],
        rotation: [0, 0, Math.PI / 2],
      });
      for (const dx of [-RAIL_LENGTH / 2, RAIL_LENGTH / 2]) {
        b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), CHROME, {
          position: [x + dx, 0.8, z],
        });
        b.add(new THREE.BoxGeometry(0.06, 0.03, 0.6), CHROME, {
          position: [x + dx, 0.015, z],
        });
      }
    }
    // the counter, its till, and jars of the vintage dyes along it
    const cw = COUNTER.x1 - COUNTER.x0;
    const cd = COUNTER.z1 - COUNTER.z0;
    const cz = (COUNTER.z0 + COUNTER.z1) / 2;
    b.add(new THREE.BoxGeometry(cw, 1.05, cd), WOOD, {
      position: [(COUNTER.x0 + COUNTER.x1) / 2, 0.525, cz],
    });
    b.add(new THREE.BoxGeometry(0.4, 0.3, 0.35), GOLD, {
      position: [COUNTER.x0 + 0.5, 1.2, COUNTER.z0 + 0.5],
    });
    const jar = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12);
    OUTFIT_COLORS.slice(-6).forEach((c, i) =>
      b.add(painted(jar, c.id), GLOSS, {
        position: [COUNTER.x0 + 0.5, 1.16, COUNTER.z0 + 1.1 + i * 0.22],
      }),
    );
    // fitting rooms: posts, rings, velvet curtains and a long mirror
    const fx = (FITTING.x0 + FITTING.x1) / 2;
    for (const z of [FITTING.z0, (FITTING.z0 + FITTING.z1) / 2, FITTING.z1])
      b.add(new THREE.BoxGeometry(FITTING.x1 - FITTING.x0, 2.4, 0.06), WOOD, {
        position: [fx, 1.2, z],
      });
    for (const z of [
      FITTING.z0 + (FITTING.z1 - FITTING.z0) * 0.25,
      FITTING.z0 + (FITTING.z1 - FITTING.z0) * 0.75,
    ]) {
      b.add(new THREE.BoxGeometry(0.08, 2.2, 1.5), VELVET, {
        position: [FITTING.x0, 1.15, z],
      });
      b.add(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), GOLD, {
        position: [FITTING.x0, 2.3, z],
        rotation: [Math.PI / 2, 0, 0],
      });
    }
    b.add(new THREE.PlaneGeometry(0.7, 1.8), MIRROR, {
      position: [FITTING.x0 - 0.5, 1.1, FITTING.z1 + 0.04],
    });
    // pendant lamps in two rows either side of the nave
    for (const x of [-2.6, 2.6])
      for (let z = z0 + 2; z < z1 - 1; z += 3) {
        b.add(new THREE.CylinderGeometry(0.008, 0.008, 2.4, 4), CORD, {
          position: [x, H - 1.2, z],
        });
        b.add(new THREE.SphereGeometry(0.2, 14, 10), LAMP, {
          position: [x, H - 2.5, z],
        });
      }
    // rugs down the aisle, posters and plants
    rug(b, { x: 0, z: -2.4 }, 2.6, 3.4, "#c9a227");
    rug(b, { x: 0, z: 2.4 }, 2.6, 3.4, "#b5502a");
    for (let i = 0; i < 4; i++) {
      poster(b, { x: x0 + 0.04, y: 2.2, z: -3 + i * 2.6, ry: Math.PI / 2 }, i);
      poster(
        b,
        { x: x1 - 0.04, y: 2.2, z: -1.4 + i * 2.2, ry: -Math.PI / 2 },
        i + 4,
      );
    }
    for (const [x, z] of [
      [-2.2, z0 + 0.6],
      [2.2, z0 + 0.6],
      [x0 + 0.6, z1 - 1],
      [x1 - 0.6, z1 - 1],
    ] as const)
      plant(b, { x, z }, 1.4);
    return b.build();
  }, [rose]);
}

/** The secondhand clothes on the rails, every garment its own color. */
function Garments() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = 12;
  const count = RAILS.length * per;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let i = 0;
    RAILS.forEach(({ x, z }, r) => {
      for (let k = 0; k < per; k++) {
        const long = (k * 7 + r) % 3 === 0;
        o.position.set(
          x - RAIL_LENGTH / 2 + 0.12 + (k * (RAIL_LENGTH - 0.24)) / (per - 1),
          long ? 1.0 : 1.2,
          z,
        );
        o.rotation.set(0, 0, ((k * 13) % 5) * 0.02 - 0.04);
        o.scale.set(1, long ? 1.2 : 0.8, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(
          i,
          c.set(RACK_COLORS[(k * 5 + r * 3) % RACK_COLORS.length] ?? "#fff"),
        );
        i++;
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.06, 0.8, 0.5]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}

/**
 * Thrift Temple on Gallery Row: a vintage store in an old church hall,
 * brick and plaster arches, rails of secondhand clothes down the nave, a
 * rose window over today's find on its marble pedestal, a dye bar at
 * Juno's counter and velvet-curtained fitting rooms.
 */
export function ThriftTemple({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const rose = useMemo(roseTex, []);
  useEffect(() => () => rose.dispose(), [rose]);
  const room = useRoom(rose);
  const find = useMemo(() => {
    const id = thriftFind(dayOf(Date.now())).id;
    return OUTFITS.find((o) => o.id === id)?.id ?? "flares";
  }, []);
  const shopper = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // a shopper drifts along the west rails, flicking through
    if (!shopper.current || calm) return;
    shopper.current.position.x = -5 + Math.sin(clock.elapsedTime * 0.25) * 0.9;
  });
  const shop = () => openShop("thrift", "Thrift Temple");
  return (
    <>
      <color attach="background" args={["#1a1018"]} />
      <hemisphereLight args={["#fff0e0", "#4a2a30", 1.7]} />
      <pointLight
        position={[0, 3.6, -5]}
        color="#ffb0e0"
        intensity={9}
        distance={10}
      />
      <pointLight
        position={[0, 3.6, 2]}
        color="#ffe0b0"
        intensity={8}
        distance={12}
      />
      <Floor
        width={W}
        depth={D}
        color="#c8a888"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["thrift-temple"]} color="#ff2f9a" />
      <primitive object={room} />
      <Garments />
      <NeonText
        text="thrift temple"
        color="#ff2f9a"
        font={SCRIPT}
        width={3.2}
        k={2.4}
        position={[0, 2.2, z0 + 0.06]}
        flicker
      />
      <group position={[PEDESTAL[0], 0.45, PEDESTAL[1]]}>
        <CrowdFigure
          look={{ ...CLERK_LOOK, outfit: find, outfitColor: "#c9a227" }}
          seed={502}
        />
      </group>
      <TalkingNpc
        name="Juno"
        role="cashier"
        look={CLERK_LOOK}
        mood="idle"
        at={[CLERK[0], 0, CLERK[1]]}
        rot={Math.PI / 2}
        seed={501}
        greet
        onTap={shop}
        context={{ venue: "thrift-temple", neighborhood: "arts-district" }}
      />
      <group ref={shopper} position={[-5, 0, 0.35]} rotation-y={Math.PI}>
        <CrowdFigure look={SHOPPER} move="chatting" seed={503} />
      </group>
    </>
  );
}
