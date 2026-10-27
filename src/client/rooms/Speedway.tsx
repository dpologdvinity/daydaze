import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { advance } from "../../game/driving/fixedStep.ts";
import type { CarState } from "../../game/driving/car.ts";
import { BUMPER_CAR, carById, STOCK_CAR } from "../../game/driving/roster.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { BotSkill } from "../../game/speedway/bots.ts";
import {
  startBumpers,
  startRace,
  stepSession,
  hudOf,
  type Session,
} from "../../game/speedway/session.ts";
import { ARENA_ORIGIN, TRACK_ORIGINS } from "../../game/speedway/layout.ts";
import { startFriendRace } from "../../game/speedway/friendRace.ts";
import { finishedFriendRace } from "../net/raceFriend.ts";
import { SPEEDWAY_SPOTS } from "../../game/speedway/spots.ts";
import { TRACKS, type Track } from "../../game/speedway/track.ts";
import type { Vec2 } from "../../game/walk.ts";
import {
  driving,
  releaseControls,
  type DriveRequest,
} from "../world/driving.ts";
import { award } from "../ui/prizeDesk.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { surface } from "../city/worldTexture.ts";

// the infield's blacktop, all round the pits and the tracks
const BLACKTOP = surface("asphalt_02", {
  scale: 0.25,
  color: "#5a5380",
  roughness: 0.9,
});
import { PortalPads } from "./shared/PortalPads.tsx";
import { BumperArena } from "./speedway/BumperArena.tsx";
import { CarLineup } from "./speedway/CarLineup.tsx";
import { CarMesh } from "./speedway/CarMesh.tsx";
import { ChaseCamera } from "./speedway/ChaseCamera.tsx";
import { Flagstand } from "./speedway/Flagstand.tsx";
import { Grandstand } from "./speedway/Grandstand.tsx";
import { Infield } from "./speedway/Infield.tsx";
import { Locals } from "./speedway/Locals.tsx";
import { NEON } from "./speedway/neon.ts";
import { PitGarage } from "./speedway/PitGarage.tsx";
import { PitRoad } from "./speedway/PitRoad.tsx";
import { SponsorSignage } from "./speedway/SponsorSignage.tsx";
import { StockCarMesh } from "./speedway/StockCarMesh.tsx";
import { STOCK_LIVERIES } from "./speedway/stockCarArt.ts";
import { RaceTrack } from "./speedway/Track.tsx";

type RaceSetup = { track: Track; origin: Vec2; skill: BotSkill };

// Each race track sits behind the grandstand, in its own place in the world.
const RACES: Record<"race-oval" | "race-boardwalk", RaceSetup> = {
  "race-oval": {
    track: TRACKS[0],
    origin: TRACK_ORIGINS["neon-oval"],
    skill: "easy",
  },
  "race-boardwalk": {
    track: TRACKS[1],
    origin: TRACK_ORIGINS["boardwalk-loop"],
    skill: "medium",
  },
};
const RACE_BOTS = 5;
const KART = carById("zip-kart");
const CAR_COLORS = [
  "#ffffff",
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#b06bff",
  "#7dff6b",
];

/** A session for a control's request, with the world origin it runs at. */
function setupFor(
  request: Exclude<DriveRequest, "leave">,
): { session: Session; origin: Vec2 } | null {
  if (request === "city-drive" || request === "race-harbor") return null;
  if (request === "race-friend") {
    // a race against a friend: their track, green at the agreed moment
    const friend = driving.friendRace;
    const setup = Object.values(RACES).find(
      (r) => r.track.id === friend?.track,
    );
    if (!friend || !setup || !KART) return null;
    return {
      session: startFriendRace(setup.track, KART, friend.startAt, Date.now()),
      origin: setup.origin,
    };
  }
  if (request === "bumper-cars") {
    return { session: startBumpers(), origin: ARENA_ORIGIN };
  }
  if (request === "race-oval") {
    const { track, origin, skill } = RACES["race-oval"];
    return { session: startRace(track, STOCK_CAR, RACE_BOTS, skill), origin };
  }
  if (!KART) return null;
  const { track, origin, skill } = RACES[request];
  return { session: startRace(track, KART, RACE_BOTS, skill), origin };
}

/** Lerps one car between the last two ticks, turning the short way round. */
function place(
  group: Group | null | undefined,
  a: CarState,
  b: CarState,
  alpha: number,
  origin: Vec2,
) {
  if (!group) return;
  group.visible = true;
  group.position.set(
    origin[0] + a.position[0] + (b.position[0] - a.position[0]) * alpha,
    0,
    origin[1] + a.position[1] + (b.position[1] - a.position[1]) * alpha,
  );
  const turn = b.yaw - a.yaw;
  group.rotation.y = a.yaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * alpha;
}

/** A bumper car game ends when you climb out: its bumps go to the prize desk. */
function cashBumpers() {
  const s = driving.session;
  if (s?.kind === "bumpers" && s.cars[0].hits > 0)
    award("bumper-cars", s.cars[0].hits);
}

/** The Speedway: a pit apron, the race tracks, a bumper arena and a grandstand. */
export function Speedway({ onPick }: { onPick: PickHandler }) {
  const canvas = useThree((s) => s.gl.domElement);
  const origin = useRef<Vec2>(ARENA_ORIGIN);
  const step = useRef<() => void>(() => {});
  const raceCars = useRef<(Group | null)[]>([]);
  const stockCars = useRef<(Group | null)[]>([]);
  const bumperCars = useRef<(Group | null)[]>([]);
  const player = useRef<Group | null>(null);
  // Set while mounted. A request taken before the mount effect has run would
  // be wiped by StrictMode's simulated unmount, so frames wait for this.
  const live = useRef(false);
  // Set once a frame has run while mounted, so a StrictMode remount keeps a pending request.
  const framed = useRef(false);
  // The race whose finish has been handed to the prize desk.
  const awarded = useRef<Session | null>(null);

  useEffect(() => {
    live.current = true;
    // Mirrors the drive for the browser tests, outside the frame loop.
    const id = window.setInterval(() => {
      const s = driving.session;
      canvas.dataset.racePhase =
        s === null ? "walk" : s.kind === "race" ? s.race.phase : "bumpers";
      canvas.dataset.carX = player.current
        ? player.current.position.x.toFixed(1)
        : "";
    }, 100);
    return () => {
      window.clearInterval(id);
      live.current = false;
      cashBumpers();
      driving.session = null;
      if (framed.current) driving.request = null;
      framed.current = false;
      releaseControls();
    };
  }, [canvas]);

  useFrame((_, dt) => {
    if (!live.current) return;
    framed.current = true;
    const request = driving.request;
    if (request !== null) {
      driving.request = null;
      releaseControls();
      cashBumpers();
      if (request === "leave") {
        driving.session = null;
        driving.friendRace = null;
      } else {
        const started = setupFor(request);
        if (started) {
          driving.session = started.session;
          origin.current = started.origin;
          const session = started.session;
          step.current = () => stepSession(session, driving.input);
        }
      }
    }
    const session = driving.session;
    if (!session) {
      for (const g of raceCars.current) if (g) g.visible = false;
      for (const g of stockCars.current) if (g) g.visible = false;
      for (const g of bumperCars.current) if (g) g.visible = false;
      player.current = null;
      return;
    }
    const alpha = advance(session.clock, dt, step.current);
    if (
      session.kind === "race" &&
      session.race.phase === "finished" &&
      awarded.current !== session
    ) {
      awarded.current = session;
      // a friend race has no bots to beat: its result is your time against
      // theirs, not a place for the prize desk
      if (driving.friendRace) {
        const you = session.race.cars[0];
        finishedFriendRace(you.lap.lapTimesMs.reduce((a, b) => a + b, 0));
      } else award("speedway", hudOf(session).place);
    }
    if (session.kind === "race") {
      const isOval = session.track.id === "neon-oval";
      const active = isOval ? stockCars.current : raceCars.current;
      const inactive = isOval ? raceCars.current : stockCars.current;
      const cars = session.race.cars;
      for (let i = 0; i < cars.length; i++) {
        place(
          active[i],
          session.prev.cars[i].state,
          cars[i].state,
          alpha,
          origin.current,
        );
      }
      for (let i = cars.length; i < active.length; i++) {
        const g = active[i];
        if (g) g.visible = false;
      }
      for (const g of inactive) if (g) g.visible = false;
      for (const g of bumperCars.current) if (g) g.visible = false;
      player.current = active[0] ?? null;
    } else if (session.kind === "bumpers") {
      const cars = session.cars;
      for (let i = 0; i < cars.length; i++) {
        place(
          bumperCars.current[i],
          session.prev[i].state,
          cars[i].state,
          alpha,
          origin.current,
        );
      }
      for (const g of raceCars.current) if (g) g.visible = false;
      for (const g of stockCars.current) if (g) g.visible = false;
      player.current = bumperCars.current[0] ?? null;
    }
  });

  return (
    <>
      <color attach="background" args={["#0d0820"]} />
      <fog attach="fog" args={["#241a44", 80, 420]} />
      {/* a night race under floodlights: sky wash, and a light from the masts
          that reads the crowd, the pits, the flagstand and the numbered cars */}
      <hemisphereLight args={["#9a8cff", "#352a66", 1.5]} />
      <directionalLight
        position={[30, 90, -40]}
        intensity={2.4}
        color="#fff1dc"
      />
      <pointLight
        position={[-14, 9, -18]}
        color="#ff4fb3"
        intensity={260}
        distance={80}
        decay={2}
      />
      <pointLight
        position={[14, 9, -18]}
        color="#4fe3ff"
        intensity={260}
        distance={80}
        decay={2}
      />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.02, -40]}
        material={BLACKTOP}
      >
        <planeGeometry args={[600, 600]} />
      </mesh>
      <Floor
        width={20}
        depth={13}
        center={[0, 0.5]}
        color="#6a6080"
        texture={{ id: "garage_floor", scale: 0.4 }}
        low={{ metalness: 0.1, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.speedway} color="#ff4fb3" />
      <Locals />
      <PitGarage />
      <Grandstand />
      <Infield origin={RACES["race-oval"].origin} />
      <Flagstand origin={RACES["race-oval"].origin} />
      <SponsorSignage origin={RACES["race-oval"].origin} />
      <PitRoad origin={RACES["race-oval"].origin} />
      <RaceTrack
        track={RACES["race-oval"].track}
        origin={RACES["race-oval"].origin}
      />
      <RaceTrack
        track={RACES["race-boardwalk"].track}
        origin={RACES["race-boardwalk"].origin}
      />
      <BumperArena />
      {STOCK_LIVERIES.map((livery, i) => (
        <StockCarMesh
          key={`stock-car-${i}`}
          index={i}
          livery={livery}
          ref={(g: Group | null) => {
            stockCars.current[i] = g;
          }}
        />
      ))}
      {KART &&
        CAR_COLORS.map((color, i) => (
          <CarMesh
            key={`race-${i}`}
            spec={KART}
            color={color}
            ref={(g: Group | null) => {
              raceCars.current[i] = g;
            }}
          />
        ))}
      {CAR_COLORS.map((color, i) => (
        <CarMesh
          key={`bumper-${i}`}
          spec={BUMPER_CAR}
          color={color}
          ref={(g: Group | null) => {
            bumperCars.current[i] = g;
          }}
        />
      ))}
      {SPEEDWAY_SPOTS.map((spot) => (
        <mesh
          key={spot.id}
          position={[spot.position[0], 0.03, spot.position[1]]}
          rotation-x={-Math.PI / 2}
          onClick={(e) => {
            if (e.delta > 6) return;
            e.stopPropagation();
            driving.request = spot.id;
          }}
        >
          <ringGeometry args={[spot.radius * 0.6, spot.radius, 40]} />
          <meshBasicMaterial
            color={spot.id === "bumper-cars" ? NEON.gold : NEON.cyan}
            toneMapped={false}
          />
        </mesh>
      ))}
      <CarLineup />
      <ChaseCamera target={player} />
    </>
  );
}
