// Daydaze Motors, the car showroom: white glass shell, each road car from the
// roster on a spinning LED turntable, and Gia at the sales desk. Display
// positions come from game/dealership.ts; buying happens in the UI panel.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Group } from "three";
import {
  BOUNDS,
  DESK,
  DISPLAY,
  PLINTH,
  SALES,
  SHOWPIECES,
  TABLE,
} from "../../game/dealership.ts";
import { carById } from "../../game/driving/roster.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { CarMesh } from "./speedway/CarMesh.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 6;
const PAINTS = [
  "#c8102e",
  "#141018",
  "#f4f4f8",
  "#3a6bff",
  "#ffd84f",
  "#9b5cff",
];

const WALL = surface("white_plaster_02", { scale: 0.5, color: "#f4f4fa" });
const DESK_TOP = surface("marble_01", {
  scale: 1,
  color: "#f0f0f6",
  roughness: 0.3,
});
const LED = new THREE.MeshBasicMaterial({
  color: hdr("#4fe3ff", 2.2),
  toneMapped: false,
});
const TABLE_MAT = new THREE.MeshStandardMaterial({
  color: "#2a2a34",
  metalness: 0.6,
  roughness: 0.25,
});
const PLINTH_MAT = new THREE.MeshStandardMaterial({
  color: "#f4f2f8",
  metalness: 0.1,
  roughness: 0.2,
});
/** The showpieces' paint, by the model's own material name: the saloon's silver
 * becomes a deep teal, the concept car's pale shell lilac. */
const PAINT: Record<string, string> = {
  PaintSilver: "#16846c",
  s_car: "#a98bff",
};
/** The spotlight's glow: a faint additive cone from the ceiling spot down to
 * the plinth. A real light per showpiece would break the room's light budget. */
const BEAM = new THREE.MeshBasicMaterial({
  color: "#fff6e0",
  transparent: true,
  opacity: 0.07,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
});
const SPOT = new THREE.MeshBasicMaterial({
  color: hdr("#ffffff", 2),
  toneMapped: false,
});

const SALES_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "bob",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};

function useShowroom() {
  return useMemo(() => {
    const b = new Batch();
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // turntables: a dark disc and an LED ring each
    for (const { at } of DISPLAY) {
      b.add(
        new THREE.CylinderGeometry(TABLE[1], TABLE[1], 0.12, 40),
        TABLE_MAT,
        {
          position: [at[0], 0.06, at[1]],
          scale: [TABLE[0] / TABLE[1], 1, 1],
        },
      );
      b.add(new THREE.TorusGeometry(TABLE[1], 0.03, 6, 48), LED, {
        position: [at[0], 0.12, at[1]],
        rotation: [Math.PI / 2, 0, 0],
        scale: [TABLE[0] / TABLE[1], 1, 1],
      });
    }
    // the showpieces' plinths: a marble step with a bright LED edge
    for (const { at } of SHOWPIECES) {
      b.add(
        new THREE.CylinderGeometry(PLINTH[1], PLINTH[1], 0.2, 48),
        PLINTH_MAT,
        {
          position: [at[0], 0.1, at[1]],
          scale: [PLINTH[0] / PLINTH[1], 1, 1],
        },
      );
      b.add(new THREE.TorusGeometry(PLINTH[1], 0.035, 6, 64), LED, {
        position: [at[0], 0.2, at[1]],
        rotation: [Math.PI / 2, 0, 0],
        scale: [PLINTH[0] / PLINTH[1], 1, 1],
      });
      b.add(new THREE.CylinderGeometry(0.3, 0.36, 0.1, 16), SPOT, {
        position: [at[0], H - 0.05, at[1]],
      });
    }
    // the sales desk, and ceiling spots over each car
    b.add(
      new THREE.BoxGeometry(DESK.x1 - DESK.x0, 1.05, DESK.z1 - DESK.z0),
      DESK_TOP,
      { position: [(DESK.x0 + DESK.x1) / 2, 0.525, (DESK.z0 + DESK.z1) / 2] },
    );
    for (const { at } of DISPLAY)
      b.add(new THREE.CylinderGeometry(0.25, 0.3, 0.1, 16), SPOT, {
        position: [at[0], H - 0.05, at[1]],
      });
    return b.build();
  }, []);
}

/** Each car for sale on its turntable, swaying slowly side to side. */
function Cars() {
  const calm = useReducedMotion();
  const tables = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (calm) return;
    tables.current.forEach((g, i) => {
      // a gentle sway, not a full turn: the cars stand 3.6 m apart
      if (g) g.rotation.y = Math.sin(clock.elapsedTime * 0.3 + i) * 0.3;
    });
  });
  return (
    <>
      {DISPLAY.map(({ id, at }, i) => {
        const spec = carById(id);
        if (!spec) return null;
        return (
          <group
            key={id}
            position={[at[0], 0.12, at[1]]}
            ref={(g) => {
              tables.current[i] = g;
            }}
          >
            <CarMesh
              spec={spec}
              color={PAINTS[i % PAINTS.length] ?? "#c8102e"}
              ref={(g: Group | null) => {
                if (g) g.visible = true;
              }}
            />
          </group>
        );
      })}
    </>
  );
}

/** One showpiece: the unbadged model on its plinth, swaying slowly under its spot. */
function Showpiece({
  id,
  at,
  index,
}: {
  id: "saloon" | "concept";
  at: readonly [number, number];
  index: number;
}) {
  const calm = useReducedMotion();
  const { scene } = useGLTF(`/models/showroom/${id}.glb`);
  // own material copies, the paint in the room's candy colors (a silver saloon
  // and a pale concept car would vanish against the white showroom)
  const car = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = [o.material].flat().map((m) => {
        const own = m.clone();
        const paint = PAINT[own.name];
        if (paint && own instanceof THREE.MeshStandardMaterial)
          own.color.set(paint);
        return own;
      });
      if ((o.material as THREE.Material[]).length === 1)
        o.material = (o.material as THREE.Material[])[0]!;
    });
    return copy;
  }, [scene]);
  useEffect(
    () => () =>
      car.traverse((o) => {
        if (o instanceof THREE.Mesh)
          [o.material].flat().forEach((m) => m.dispose());
      }),
    [car],
  );
  const turn = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!calm && turn.current)
      turn.current.rotation.y =
        Math.sin(clock.elapsedTime * 0.25 + index) * 0.35;
  });
  return (
    <>
      <group ref={turn} position={[at[0], 0.2, at[1]]}>
        <primitive object={car} />
      </group>
      <mesh
        position={[at[0], (H - 0.1) / 2 + 0.1, at[1]]}
        material={BEAM}
        raycast={() => null}
      >
        <cylinderGeometry args={[0.35, 2.3, H - 0.2, 24, 1, true]} />
      </mesh>
    </>
  );
}

/** The showpieces and the placards naming them, hung on the side walls. */
function Showpieces() {
  return (
    <>
      <Suspense fallback={null}>
        {SHOWPIECES.map(({ id, at }, i) => (
          <Showpiece key={id} id={id} at={at} index={i} />
        ))}
      </Suspense>
      {SHOWPIECES.map(({ id, name, at, side }) => (
        <NeonText
          key={id}
          text={name}
          color="#ffd84f"
          font={MARQUEE}
          width={3.4}
          k={1.4}
          position={[side < 0 ? x0 + 0.02 : x1 - 0.02, 3.4, at[1]]}
          rotation-y={side < 0 ? Math.PI / 2 : -Math.PI / 2}
        />
      ))}
    </>
  );
}

/**
 * Daydaze Motors on Park Avenue: a white glass showroom, every road car
 * turning on an LED turntable under its own spotlight, and Gia at the sales
 * desk. Buy a car from the panel; it joins your garage and waits at the curb.
 */
export function Dealership({ onPick }: { onPick: PickHandler }): JSX.Element {
  const showroom = useShowroom();
  return (
    <>
      <color attach="background" args={["#e8eaf4"]} />
      <hemisphereLight args={["#ffffff", "#b8b8c8", 1.7]} />
      <pointLight
        position={[0, 5, -2]}
        color="#ffffff"
        intensity={10}
        distance={24}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#f4f4fa"
        texture={{ id: "marble_tiles", scale: 0.3 }}
        low={{ metalness: 0.1, roughness: 0.25 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.dealership} color="#4fe3ff" />
      <primitive object={showroom} />
      <Cars />
      <Showpieces />
      <NeonText
        text="DAYDAZE MOTORS"
        color="#2e7dff"
        font={MARQUEE}
        width={6}
        k={1.6}
        position={[0, 4.6, z0 + 0.05]}
      />
      <TalkingNpc
        name="Gia"
        role="cashier"
        look={SALES_LOOK}
        mood="idle"
        at={[SALES[0], 0, SALES[1]]}
        rot={0}
        seed={451}
        greet
        context={{ venue: "dealership", neighborhood: "uptown" }}
      />
    </>
  );
}
