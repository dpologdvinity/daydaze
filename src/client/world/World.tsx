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
import type { DanceMoveId } from "../../game/dance/moves.ts";
import type { HomeSave } from "../../game/home/home.ts";
import type { Intensity } from "../../game/effects/buzz.ts";
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
import { areaOf } from "../../game/area.ts";
import { DrunkPost } from "../effects/DrunkPost.tsx";
import { DrunkState } from "../effects/DrunkState.tsx";
import type { MinigameId } from "../../game/hotspots.ts";
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

// The city is the heaviest scene, so it loads on first visit only.
const CityScene = lazy(() =>
  import("../city/CityScene.tsx").then((m) => ({ default: m.CityScene })),
);

// Enough for the environment map, face textures and reflector to settle.
const STILL_FRAMES = 4;

// The Speedway and the park are big and rarely visited, so their code loads on first arrival.
const Speedway = lazy(() =>
  import("../rooms/Speedway.tsx").then((m) => ({
    default: m.Speedway,
  })),
);
const AmusementPark = lazy(() =>
  import("../rooms/AmusementPark.tsx").then((m) => ({
    default: m.AmusementPark,
  })),
);
// The clubs load on first arrival, like the park: each has its own meshes and dialogue.
const Pulse = lazy(() =>
  import("../rooms/Pulse.tsx").then((m) => ({ default: m.Pulse })),
);
const VioletHour = lazy(() =>
  import("../rooms/VioletHour.tsx").then((m) => ({
    default: m.VioletHour,
  })),
);
// The apartment and the jail are small, but their code loads on first visit too.
const Apartment = lazy(() =>
  import("../rooms/Apartment.tsx").then((m) => ({ default: m.Apartment })),
);
const Jail = lazy(() =>
  import("../rooms/Jail.tsx").then((m) => ({ default: m.Jail })),
// The food rooms load on first arrival, each with its own staff and menu.
const FilipinoJoint = lazy(() =>
  import("../rooms/food/FilipinoJoint.tsx").then((m) => ({
    default: m.FilipinoJoint,
  })),
);
const BobaMatchaCafe = lazy(() =>
  import("../rooms/food/BobaMatchaCafe.tsx").then((m) => ({
    default: m.BobaMatchaCafe,
  })),
);
const UbeBakery = lazy(() =>
  import("../rooms/food/UbeBakery.tsx").then((m) => ({
    default: m.UbeBakery,
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

// Exposes the dance move on the canvas; "none" when the doll is not dancing.
// A still scene only draws on demand, so a new move asks for a frame to show it.
function Dancing({ mood, move }: { mood: Mood; move: DanceMoveId }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const value = mood === "dance" ? move : "none";
  useEffect(() => {
    gl.domElement.dataset.dance = value;
    invalidate();
  }, [gl, invalidate, value]);
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
      <DrunkPost />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

type SceneProps = {
  onPick: PickHandler;
  onRide: (slide: number) => void;
  /** Opens a minigame overlay from a floor hotspot. */
  onGame: (game: MinigameId) => void;
  player: Player;
  home: HomeSave;
  onShelf: () => void;
};

const SCENES: Record<Exclude<RoomId, "city">, ComponentType<SceneProps>> = {
  "velvet-room": VelvetRoom,
  pulse: Pulse,
  "violet-hour": VioletHour,
  plaza: Plaza,
  "water-park": WaterPark,
  "amusement-park": AmusementPark,
  speedway: Speedway,
  apartment: Apartment,
  jail: Jail,
  "filipino-joint": FilipinoJoint,
  "boba-matcha": BobaMatchaCafe,
  "ube-bakery": UbeBakery,
};

export type WorldProps = {
  room: RoomId;
  arrival: Spawn;
  look: Look;
  swim: SwimLook;
  /** Bumped by the UI's ride button; each bump rides the next slide. */
  rides: number;
  /** Opens a minigame overlay from a room's hotspot. */
  onGame: (game: MinigameId) => void;
  /** `?slide=0.4` starts on the first slide that far down, for screenshots. */
  slideAt: number | null;
  mood: Mood;
  dance: DanceMoveId;
  /** The local player's drunk setting; off, low or full. */
  effects: Intensity;
  /** Called when the player starts walking. */
  onMove: () => void;
  view: View;
  tag: RefObject<HTMLDivElement | null>;
  /** A forced tier from the URL or settings; null lets the frame rate decide. */
  quality: QualityTier | null;
  still: boolean;
  onPortal: (portal: Portal) => void;
  home: HomeSave;
  /** The stub shop shelf in the apartment opens the shoplifting test. */
  onShelf: () => void;
};

export function World({
  room,
  arrival,
  look,
  swim,
  rides,
  onGame,
  slideAt,
  mood,
  dance,
  effects,
  onMove,
  view,
  tag,
  quality,
  still,
  onPortal,
  home,
  onShelf,
}: WorldProps) {
  const [auto, setAuto] = useState<QualityTier>("high");
  const tier = quality ?? auto;
  const def = ROOMS[room];
  const area = useMemo(() => areaOf(def), [def]);
  // a fresh player per arrival, so a portal can only fire once per visit
  const player = useMemo(() => createPlayer(arrival), [arrival]);
  const onPick = (point: Vec2) => walkTo(player, area, point);
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
  // the city is its own scene, streamed rather than built as one room
  const Room = room === "city" ? null : SCENES[room];

  return (
    <Canvas
      className="world"
      frameloop={still ? "demand" : "always"}
      dpr={tier === "high" ? [1, 1.5] : 1}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [6.4, 5.4, 10], fov: 38, near: 0.05, far: 600 }}
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
        <DrunkState intensity={effects} />
        <Dancing mood={mood} move={dance} />
        <Wearing style={swimFor(def, swim)?.style ?? "outfit"} />
        {/* the key light, shared so a doll looks the same in every room */}
        <directionalLight
          position={[2, 5, 6]}
          color="#fff1f4"
          intensity={2.2}
        />
        <Suspense fallback={null}>
          {room === "city" ? (
            <CityScene key={room} player={player} onPick={onPick} />
          ) : Room ? (
            <Room
              key={room}
              onPick={onPick}
              onRide={onRide}
              onGame={onGame}
              player={player}
              home={home}
              onShelf={onShelf}
            />
          ) : null}
          <PlayerController
            player={player}
            area={area}
            look={look}
            swim={swimFor(def, swim)}
            mood={mood}
            dance={dance}
            onMove={onMove}
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
