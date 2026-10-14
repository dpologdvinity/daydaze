import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from "react";
import {
  swimFor,
  type Look,
  type Mood,
  type SwimLook,
} from "../../game/look.ts";
import {
  ROOMS,
  type Portal,
  type RoomId,
  type Spawn,
} from "../../game/rooms.ts";
import type { Vec2 } from "../../game/walk.ts";
import { SLIDES } from "../../game/waterPark.ts";
import { VelvetRoom } from "../rooms/VelvetRoom.tsx";
import { Plaza } from "../rooms/Plaza.tsx";
import type { PickHandler } from "../rooms/shared/Floor.tsx";
import { WaterPark } from "../rooms/WaterPark.tsx";
import { CameraRig, type View } from "./CameraRig.tsx";
import { NeonClamp } from "./NeonClamp.tsx";
import {
  createPlayer,
  PlayerController,
  startRide,
  walkTo,
  type Player,
} from "./PlayerController.tsx";
import { QualityContext, type QualityTier } from "./quality.ts";

// Enough for the environment map, face textures and reflector to settle.
const STILL_FRAMES = 4;

// The park is big and rarely visited, so its code loads on first arrival.
const AmusementPark = lazy(() =>
  import("../rooms/AmusementPark.tsx").then((m) => ({
    default: m.AmusementPark,
  })),
);

/**
 * Counts rendered frames into `canvas[data-frames]` (up to 10) so tests and
 * screenshots can wait for a real picture. In still mode it also asks for
 * the few on-demand frames the scene needs to settle. The first frames also
 * record draw calls and triangles in `data-calls` and `data-triangles`.
 */
function FrameCount({ still }: { still: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const count = useRef(0);
  useFrame(({ gl }) => {
    if (count.current >= 10) return;
    count.current += 1;
    gl.domElement.dataset.frames = String(count.current);
    gl.domElement.dataset.calls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    if (still && count.current < STILL_FRAMES) invalidate();
  });
  return null;
}

// Exposes what the doll wears on the canvas, so tests can read it by role.
function Wearing({ style }: { style: string }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.domElement.dataset.wearing = style;
  }, [gl, style]);
  return null;
}

function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.2}
        intensity={1.15}
        radius={0.72}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

type SceneProps = {
  onPick: PickHandler;
  onRide: (slide: number) => void;
  player: Player;
};

const SCENES: Record<RoomId, ComponentType<SceneProps>> = {
  "velvet-room": VelvetRoom,
  plaza: Plaza,
  "water-park": WaterPark,
  "amusement-park": AmusementPark,
};

export type WorldProps = {
  room: RoomId;
  arrival: Spawn;
  look: Look;
  swim: SwimLook;
  /** Bumped by the UI's ride button; each bump rides the next slide. */
  rides: number;
  /** `?slide=0.4` starts on the first slide that far down, for screenshots. */
  slideAt: number | null;
  mood: Mood;
  view: View;
  tag: RefObject<HTMLDivElement | null>;
  /** A forced tier from the URL or settings; null lets the frame rate decide. */
  quality: QualityTier | null;
  still: boolean;
  onPortal: (portal: Portal) => void;
};

export function World({
  room,
  arrival,
  look,
  swim,
  rides,
  slideAt,
  mood,
  view,
  tag,
  quality,
  still,
  onPortal,
}: WorldProps) {
  const [auto, setAuto] = useState<QualityTier>("high");
  const tier = quality ?? auto;
  const def = ROOMS[room];
  // a fresh player per arrival, so a portal can only fire once per visit
  const player = useMemo(() => createPlayer(arrival), [arrival]);
  const onPick = (point: Vec2) => walkTo(player, def, point);
  const onRide = (slide: number, t = 0) => {
    const s = SLIDES[slide];
    if (def.id === "water-park" && s) startRide(player, s, t);
  };
  useEffect(() => {
    if (rides > 0) onRide((rides - 1) % SLIDES.length);
  }, [rides]);
  useEffect(() => {
    if (slideAt !== null) onRide(0, slideAt);
  }, [player, slideAt]);
  const Room = SCENES[room];

  return (
    <Canvas
      className="world"
      frameloop={still ? "demand" : "always"}
      dpr={tier === "high" ? [1, 1.5] : 1}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [6.4, 5.4, 10], fov: 38, near: 0.05, far: 200 }}
      onCreated={({ gl }) => {
        gl.domElement.setAttribute("role", "img");
        gl.domElement.setAttribute("aria-label", "3D room view");
      }}
    >
      <QualityContext.Provider value={tier}>
        {quality === null && !still && (
          <PerformanceMonitor
            bounds={() => [45, 60]}
            onDecline={() => setAuto("low")}
          />
        )}
        <FrameCount still={still} />
        <Wearing style={swimFor(def, swim)?.style ?? "outfit"} />
        {/* the key light, shared so a doll looks the same in every room */}
        <directionalLight
          position={[2, 5, 6]}
          color="#fff1f4"
          intensity={2.2}
        />
        <Suspense fallback={null}>
          <Room key={room} onPick={onPick} onRide={onRide} player={player} />
          <PlayerController
            player={player}
            room={def}
            look={look}
            swim={swimFor(def, swim)}
            mood={mood}
            tag={tag}
            onPortal={onPortal}
          />
          <CameraRig player={player} view={view} room={room} />
          {tier === "high" ? <Effects /> : <NeonClamp key={`clamp-${room}`} />}
        </Suspense>
      </QualityContext.Provider>
    </Canvas>
  );
}
