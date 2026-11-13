// City Jail, Block C: the cell block scene with bars, bunks, a yard court, a
// payphone and Officer Dee. Visual only; sentence timing and release live in
// the HUD and src/game/crime/.

import { DEFAULT_LOOK } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Prop } from "./shared/Prop.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

const CONTEXT: DialogueContext = {
  venue: "jail",
  neighborhood: "downtown",
};

const BARS = [-4.5, -3, -1.5, 0, 1.5, 3, 4.5] as const;

// a blacktop yard, painted block
const COURT = surface("asphalt_02", { scale: 0.6, color: "#7ab07a" });
const BLOCK = surface("concrete_wall_008", {
  scale: 0.5,
  color: "#b8bccc",
  roughness: 0.9,
});

/** The guard's desk: its top stands this high (the lamp sits on it). */
const DESK_TOP = 0.95;

/** The cell block's painted cinderblock walls, a
 * ball on the court, a clock and a lamp on the guard's desk. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  b.add(box, BLOCK, { position: [0, 1.6, -4], scale: [12, 3.2, 0.2] });
  b.add(box, BLOCK, { position: [6.1, 1.6, 0], scale: [0.2, 3.2, 8] });
  b.add(painted(new THREE.SphereGeometry(0.12, 10, 8), "#e2652a"), GLOSS, {
    position: [-3, 0.12, 2.6],
  });
  b.add(
    painted(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), "#f4f4f8"),
    GLOSS,
    {
      position: [4.6, 2.6, -3.88],
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  b.add(
    painted(new THREE.CylinderGeometry(0.02, 0.08, 0.4, 8), "#2a2a34"),
    GLOSS,
    {
      position: [4.3, DESK_TOP + 0.2, 1.6],
    },
  );
  return b.build();
}

// City Jail, Block C: a cell block with bars along the back, bunks behind
// them and the guard's desk by the gate. Sentences run in the HUD, not here.
export function Jail({ onPick }: { onPick: PickHandler }) {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#0d0d14"]} />
      <hemisphereLight args={["#dbe4ff", "#3a3a52", 1.4]} />
      <pointLight
        position={[0, 2.8, 0]}
        color="#fff2d6"
        intensity={3}
        distance={12}
      />
      <Floor
        width={12}
        depth={8}
        center={[0, 0]}
        color="#9aa0b4"
        texture={{ id: "brushed_concrete", scale: 0.35 }}
        low={{ metalness: 0, roughness: 0.9 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.jail} color="#ff5c5c" />
      {BARS.map((x) => (
        <mesh key={x} position={[x, 1.4, -3.4]}>
          <boxGeometry args={[0.08, 2.8, 0.08]} />
          <meshStandardMaterial
            color="#9aa3b5"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.4, -3.4]}>
        <boxGeometry args={[9.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#9aa3b5" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* the cells' bunks, a steel toilet between them, the guard's desk and bin
          (House Interior Pack, cooled to institutional grey-blue) */}
      <Suspense fallback={null}>
        {[-2.2, 2.2].map((x) => (
          <Prop
            key={x}
            model="bed-bunk"
            dir="home"
            width={0.95}
            depth={1.9}
            height={1.9}
            yaw={Math.PI / 2}
            shade="#c4cce0"
            position={[x, 0, -3.1]}
          />
        ))}
        <Prop
          model="toilet-2"
          dir="home"
          width={0.5}
          depth={0.7}
          height={0.8}
          shade="#d8dce8"
          position={[0.75, 0, -3.65]}
        />
        <Prop
          model="desk"
          dir="home"
          width={1.4}
          depth={0.9}
          height={DESK_TOP}
          yaw={-Math.PI / 2}
          shade="#b8b4ac"
          position={[4.6, 0, 1.6]}
        />
        <Prop
          model="trash-large"
          dir="home"
          width={0.4}
          depth={0.4}
          height={0.6}
          shade="#9aa0ae"
          position={[5.45, 0, 2.5]}
        />
      </Suspense>
      {/* the yard: a painted court with a hoop at the far left */}
      <mesh
        position={[-3.6, 0.01, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={COURT}
      >
        <planeGeometry args={[4, 3.4]} />
      </mesh>
      <primitive object={dressing} />
      <mesh position={[-5.4, 1.3, 2]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#9aa3b5" />
      </mesh>
      <mesh position={[-5.2, 2.5, 2]}>
        <boxGeometry args={[0.1, 0.7, 0.9]} />
        <meshStandardMaterial color="#f4f4f8" />
      </mesh>
      {/* the payphone by the guard's desk */}
      <mesh position={[5.7, 1.0, -0.4]}>
        <boxGeometry args={[0.35, 1.2, 0.5]} />
        <meshStandardMaterial color="#2c6bd6" emissive="#10306a" />
      </mesh>
      <TalkingNpc
        name="Officer Dee"
        role="guard"
        look={DEFAULT_LOOK}
        mood="idle"
        at={[3.4, 0, 1.6]}
        rot={Math.PI}
        seed={41}
        greet
        situation="greeting-first"
        context={CONTEXT}
      />
    </>
  );
}
