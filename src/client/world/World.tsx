import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import type { BodyShape } from "../../game/body.ts";
import type { DanceMoveId, Holds } from "../../game/dance/moves.ts";
import type { HomeSave } from "../../game/home/home.ts";
import type { ParkedCar } from "../../game/city/drive.ts";
import { mayEnter } from "../../game/age.ts";
import { ADULT_OK } from "../adult.ts";
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
import { DrunkState } from "../effects/DrunkState.tsx";
import type { MinigameId } from "../../game/hotspots.ts";
import type { PickHandler } from "../rooms/shared/Floor.tsx";
import { CameraRig, type View } from "./CameraRig.tsx";
import { NeonClamp } from "./NeonClamp.tsx";
import {
  createPlayer,
  PlayerController,
  placePlayer,
  startRide,
  walkTo,
  type Player,
} from "./PlayerController.tsx";
import { QualityContext, type QualityTier } from "./quality.ts";
import { Seats } from "./Seats.tsx";
import { isSceneReady, setSceneReady } from "./ready.ts";
import { Photo } from "./Photo.tsx";
import { OnlinePeers } from "../net/OnlinePeers.tsx";
import { Confetti } from "./Confetti.tsx";
import { CreatorFrame } from "./CreatorFrame.tsx";

// The city is the heaviest scene, so it loads on first visit only.
const VelvetRoom = lazy(() =>
  import("../rooms/VelvetRoom.tsx").then((m) => ({ default: m.VelvetRoom })),
);
const Plaza = lazy(() =>
  import("../rooms/Plaza.tsx").then((m) => ({ default: m.Plaza })),
);
const WaterPark = lazy(() =>
  import("../rooms/WaterPark.tsx").then((m) => ({ default: m.WaterPark })),
);
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
);
const HauntedHouse = lazy(() =>
  import("../rooms/HauntedHouse.tsx").then((m) => ({
    default: m.HauntedHouse,
  })),
);
const Gridiron = lazy(() =>
  import("../rooms/Gridiron.tsx").then((m) => ({ default: m.Gridiron })),
);
const Salon = lazy(() =>
  import("../rooms/Salon.tsx").then((m) => ({ default: m.Salon })),
);
const VideoStore = lazy(() =>
  import("../rooms/VideoStore.tsx").then((m) => ({ default: m.VideoStore })),
);
const BackRoom = lazy(() =>
  import("../rooms/BackRoom.tsx").then((m) => ({ default: m.BackRoom })),
);
const WineBar = lazy(() =>
  import("../rooms/WineBar.tsx").then((m) => ({ default: m.WineBar })),
);
const DriveIn = lazy(() =>
  import("../rooms/DriveIn.tsx").then((m) => ({ default: m.DriveIn })),
);
const BoardwalkArcade = lazy(() =>
  import("../rooms/BoardwalkArcade.tsx").then((m) => ({
    default: m.BoardwalkArcade,
  })),
);
const SurfShack = lazy(() =>
  import("../rooms/SurfShack.tsx").then((m) => ({ default: m.SurfShack })),
);
const Gallery = lazy(() =>
  import("../rooms/Gallery.tsx").then((m) => ({ default: m.Gallery })),
);
const Patisserie = lazy(() =>
  import("../rooms/Patisserie.tsx").then((m) => ({ default: m.Patisserie })),
);
const Bookshop = lazy(() =>
  import("../rooms/Bookshop.tsx").then((m) => ({ default: m.Bookshop })),
);
const HotelRooftop = lazy(() =>
  import("../rooms/HotelRooftop.tsx").then((m) => ({
    default: m.HotelRooftop,
  })),
);
const EspressoLab = lazy(() =>
  import("../rooms/EspressoLab.tsx").then((m) => ({ default: m.EspressoLab })),
);
const ThriftTemple = lazy(() =>
  import("../rooms/ThriftTemple.tsx").then((m) => ({
    default: m.ThriftTemple,
  })),
);
const TikiBar = lazy(() =>
  import("../rooms/TikiBar.tsx").then((m) => ({ default: m.TikiBar })),
);
const VinylVault = lazy(() =>
  import("../rooms/VinylVault.tsx").then((m) => ({ default: m.VinylVault })),
);
const JazzClub = lazy(() =>
  import("../rooms/JazzClub.tsx").then((m) => ({ default: m.JazzClub })),
);
const Dealership = lazy(() =>
  import("../rooms/Dealership.tsx").then((m) => ({ default: m.Dealership })),
);
const Zoo = lazy(() =>
  import("../rooms/Zoo.tsx").then((m) => ({ default: m.Zoo })),
);
const Studio = lazy(() =>
  import("../rooms/Studio.tsx").then((m) => ({ default: m.Studio })),
);
const Paintball = lazy(() =>
  import("../rooms/Paintball.tsx").then((m) => ({ default: m.Paintball })),
);
const Market = lazy(() =>
  import("../rooms/Market.tsx").then((m) => ({ default: m.Market })),
);
const LaserTag = lazy(() =>
  import("../rooms/LaserTag.tsx").then((m) => ({ default: m.LaserTag })),
);
const GreenHaze = lazy(() =>
  import("../rooms/GreenHaze.tsx").then((m) => ({ default: m.GreenHaze })),
);
const Parlor = lazy(() =>
  import("../rooms/Parlor.tsx").then((m) => ({ default: m.Parlor })),
);
const Museum = lazy(() =>
  import("../rooms/Museum.tsx").then((m) => ({ default: m.Museum })),
);
const HaloHaloCafe = lazy(() =>
  import("../rooms/food/HaloHaloCafe.tsx").then((m) => ({
    default: m.HaloHaloCafe,
  })),
);
const SkateDiner = lazy(() =>
  import("../rooms/SkateDiner.tsx").then((m) => ({ default: m.SkateDiner })),
);
const MermaidCove = lazy(() =>
  import("../rooms/MermaidCove.tsx").then((m) => ({
    default: m.MermaidCove,
  })),
);
const Courtside = lazy(() =>
  import("../rooms/Courtside.tsx").then((m) => ({ default: m.Courtside })),
);
const Catwalk = lazy(() =>
  import("../rooms/Catwalk.tsx").then((m) => ({ default: m.Catwalk })),
);
const Marina = lazy(() =>
  import("../rooms/Marina.tsx").then((m) => ({ default: m.Marina })),
);
const DrivingRange = lazy(() =>
  import("../rooms/DrivingRange.tsx").then((m) => ({
    default: m.DrivingRange,
  })),
);
const Gym = lazy(() =>
  import("../rooms/Gym.tsx").then((m) => ({ default: m.Gym })),
);
const Skatepark = lazy(() =>
  import("../rooms/Skatepark.tsx").then((m) => ({ default: m.Skatepark })),
);
const RollerRink = lazy(() =>
  import("../rooms/RollerRink.tsx").then((m) => ({ default: m.RollerRink })),
);
const Galleria = lazy(() =>
  import("../rooms/Galleria.tsx").then((m) => ({ default: m.Galleria })),
);
const KamayanHall = lazy(() =>
  import("../rooms/KamayanHall.tsx").then((m) => ({ default: m.KamayanHall })),
);
const Dome = lazy(() =>
  import("../rooms/Dome.tsx").then((m) => ({ default: m.Dome })),
);
const Stadium = lazy(() =>
  import("../rooms/Stadium.tsx").then((m) => ({ default: m.Stadium })),
);
const MiniGolf = lazy(() =>
  import("../rooms/MiniGolf.tsx").then((m) => ({ default: m.MiniGolf })),
);
const LaNoche = lazy(() =>
  import("../rooms/LaNoche.tsx").then((m) => ({ default: m.LaNoche })),
);
const ArcadeBar = lazy(() =>
  import("../rooms/ArcadeBar.tsx").then((m) => ({ default: m.ArcadeBar })),
);
const Bowling = lazy(() =>
  import("../rooms/Bowling.tsx").then((m) => ({ default: m.Bowling })),
);
const Karaoke = lazy(() =>
  import("../rooms/Karaoke.tsx").then((m) => ({ default: m.Karaoke })),
);
const Warehouse = lazy(() =>
  import("../rooms/Warehouse.tsx").then((m) => ({ default: m.Warehouse })),
);
const SugarRush = lazy(() =>
  import("../rooms/SugarRush.tsx").then((m) => ({ default: m.SugarRush })),
);
const RooftopBar = lazy(() =>
  import("../rooms/RooftopBar.tsx").then((m) => ({ default: m.RooftopBar })),
);
const IceRink = lazy(() =>
  import("../rooms/IceRink.tsx").then((m) => ({ default: m.IceRink })),
);
const Aquarium = lazy(() =>
  import("../rooms/Aquarium.tsx").then((m) => ({ default: m.Aquarium })),
);
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
    // frames under the loading veil (scene hidden, compiling) do not count
    if (count.current >= 10 || !isSceneReady()) return;
    count.current += 1;
    gl.domElement.dataset.frames = String(count.current);
    gl.domElement.dataset.calls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    if (still && count.current < STILL_FRAMES) invalidate();
  });
  return null;
}

/**
 * Compiles every shader in the freshly loaded room off the main thread
 * (KHR_parallel_shader_compile) before showing it. Drawing a room for the
 * first time otherwise compiles 30-odd shader programs in one blocking
 * frame, and the screen sits black until it ends. Meanwhile the scene stays
 * hidden (the room's background color shows) under the loading veil.
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let live = true;
    setSceneReady(false);
    // compileAsync starts every compile now, then resolves as they finish
    const pending = gl.compileAsync(scene, camera);
    scene.visible = false;
    pending
      .catch(() => undefined)
      .then(() => {
        if (!live) return;
        scene.visible = true;
        setSceneReady(true);
        invalidate();
      });
    return () => {
      live = false;
      scene.visible = true;
    };
  }, [gl, scene, camera, invalidate]);
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

const Effects = lazy(() => import("./Effects.tsx"));

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
  aquarium: Aquarium,
  "ice-rink": IceRink,
  "rooftop-bar": RooftopBar,
  "sugar-rush": SugarRush,
  warehouse: Warehouse,
  karaoke: Karaoke,
  bowling: Bowling,
  "arcade-bar": ArcadeBar,
  "la-noche": LaNoche,
  "mini-golf": MiniGolf,
  dome: Dome,
  "kamayan-hall": KamayanHall,
  galleria: Galleria,
  "roller-rink": RollerRink,
  skatepark: Skatepark,
  gridiron: Gridiron,
  "driving-range": DrivingRange,
  marina: Marina,
  courtside: Courtside,
  catwalk: Catwalk,
  "mermaid-cove": MermaidCove,
  "skate-diner": SkateDiner,
  museum: Museum,
  salon: Salon,
  piercing: Parlor,
  "green-haze": GreenHaze,
  "laser-tag": LaserTag,
  market: Market,
  paintball: Paintball,
  "music-studio": Studio,
  zoo: Zoo,
  dealership: Dealership,
  "jazz-club": JazzClub,
  "vinyl-vault": VinylVault,
  "back-room": BackRoom,
  "tiki-bar": TikiBar,
  "thrift-temple": ThriftTemple,
  "espresso-lab": EspressoLab,
  "hotel-rooftop": HotelRooftop,
  bookshop: Bookshop,
  patisserie: Patisserie,
  gallery: Gallery,
  "surf-shack": SurfShack,
  "boardwalk-arcade": BoardwalkArcade,
  "drive-in": DriveIn,
  "wine-bar": WineBar,
  "video-store": VideoStore,
  "halo-halo-cafe": HaloHaloCafe,
  gym: Gym,
  stadium: Stadium,
  "haunted-house": HauntedHouse,
  "filipino-joint": FilipinoJoint,
  "boba-matcha": BobaMatchaCafe,
  "ube-bakery": UbeBakery,
};

export type WorldProps = {
  room: RoomId;
  arrival: Spawn;
  look: Look;
  swim: SwimLook;
  body: BodyShape;
  /** Bumped by the UI's ride button; each bump rides the next slide. */
  rides: number;
  /** Opens a minigame overlay from a room's hotspot. */
  onGame: (game: MinigameId) => void;
  /** `?slide=0.4` starts on the first slide that far down, for screenshots. */
  slideAt: number | null;
  mood: Mood;
  dance: DanceMoveId;
  holds: Holds;
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
  /** Your car, parked in the city, and where to save it when you park. */
  car: ParkedCar;
  onPark: (car: ParkedCar) => void;
};

export function World({
  room,
  arrival,
  look,
  swim,
  body,
  rides,
  onGame,
  slideAt,
  mood,
  dance,
  holds,
  effects,
  onMove,
  view,
  tag,
  quality,
  still,
  onPortal,
  home,
  onShelf,
  car,
  onPark,
}: WorldProps) {
  const [auto, setAuto] = useState<QualityTier>("high");
  // a struggling machine first gives up the extra resolution, then the
  // high tier's effects: two steps down instead of one big one
  const [sharp, setSharp] = useState(true);
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
      // sharp: full device resolution (up to 2x) on the high tier, stepping
      // down to 1x before the effects go; native MSAA smooths edges on low
      dpr={tier === "high" && sharp ? [1, 2] : 1}
      gl={{ antialias: true, powerPreference: "high-performance" }}
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
            onDecline={() => (sharp ? setSharp(false) : setAuto("low"))}
          />
        )}
        <FrameCount still={still} />
        <Photo />
        <OnlinePeers player={player} mood={mood} dance={dance} />
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
            <CityScene
              key={room}
              player={player}
              onPick={onPick}
              car={car}
              onPark={onPark}
            />
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
          <Seats room={room} player={player} area={area} home={home} />
          <PlayerController
            player={player}
            area={area}
            look={look}
            swim={swimFor(def, swim)}
            body={body}
            mood={mood}
            dance={dance}
            holds={holds}
            onMove={onMove}
            tag={tag}
            onPortal={(portal) => {
              // a shut door (an 18+ venue): step back off it and stay
              if (!mayEnter(portal.target, ADULT_OK)) {
                const back = 1.6;
                placePlayer(
                  player,
                  player.walk.pos[0] - Math.sin(player.walk.yaw) * back,
                  player.walk.pos[1] - Math.cos(player.walk.yaw) * back,
                );
                player.walk.leaving = false;
              }
              onPortal(portal);
            }}
          />
          <CameraRig player={player} view={view} room={room} />
          <CreatorFrame />
          <Confetti />
          {tier === "high" ? <Effects /> : <NeonClamp key={`clamp-${room}`} />}
          <Warmup key={`warm-${room}`} />
        </Suspense>
      </QualityContext.Provider>
    </Canvas>
  );
}
