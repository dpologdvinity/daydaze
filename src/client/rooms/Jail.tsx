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
        color="#5d6275"
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
      {/* the yard: a painted court with a hoop at the far left */}
      <mesh position={[-3.6, 0.01, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 3.4]} />
        <meshStandardMaterial color="#4f7a52" />
      </mesh>
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
