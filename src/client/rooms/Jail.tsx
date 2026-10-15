import { DEFAULT_LOOK } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "jail",
  neighborhood: "downtown",
};

const BARS = [-4.5, -3, -1.5, 0, 1.5, 3, 4.5] as const;

// City Jail, Block C: a cell block with bars along the back, bunks behind
// them and the guard's desk by the gate. Sentences run in the HUD, not here.
export function Jail({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#0d0d14"]} />
      <hemisphereLight args={["#c8d4ff", "#1a1a26", 0.8]} />
      <pointLight position={[0, 2.8, 0]} color="#fff2d6" intensity={3} distance={12} />
      <Floor width={12} depth={8} center={[0, 0]} color="#3b3f4d" onPick={onPick} />
      <PortalPads room={ROOMS.jail} color="#ff5c5c" />
      {BARS.map((x) => (
        <mesh key={x} position={[x, 1.4, -3.4]}>
          <boxGeometry args={[0.08, 2.8, 0.08]} />
          <meshStandardMaterial color="#9aa3b5" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.4, -3.4]}>
        <boxGeometry args={[9.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#9aa3b5" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-2.2, 0.35, -3.1]}>
        <boxGeometry args={[1.8, 0.7, 0.9]} />
        <meshStandardMaterial color="#c9472f" />
      </mesh>
      <mesh position={[2.2, 0.35, -3.1]}>
        <boxGeometry args={[1.8, 0.7, 0.9]} />
        <meshStandardMaterial color="#c9472f" />
      </mesh>
      <mesh position={[4.6, 0.9, 1.6]}>
        <boxGeometry args={[1.4, 1.8, 0.9]} />
        <meshStandardMaterial color="#6b5a3a" />
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
