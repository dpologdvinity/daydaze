import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBanned, recordCaught } from "../game/crime/record.ts";
import { penaltyFor, type Penalty } from "../game/crime/shoplift.ts";
import type { BodyShape } from "../game/body.ts";
import {
  DEFAULT_HOLDS,
  type DanceMoveId,
  type Holds,
} from "../game/dance/moves.ts";
import type { Intensity } from "../game/effects/buzz.ts";
import type { MinigameId } from "../game/hotspots.ts";
import { isJailed } from "../game/jail/jail.ts";
import { jailAfterArrest } from "../game/police/arrest.ts";
import type { Look, Mood, SwimLook } from "../game/look.ts";
import type { HomeSave } from "../game/home/home.ts";
import { parkedOrHome, type ParkedCar } from "../game/city/drive.ts";
import { arrive } from "../game/portals.ts";
import { ROOMS, type RoomId, type Spawn } from "../game/rooms.ts";
import {
  generateGuestName,
  loadSave,
  SAVE_KEY,
  serializeSave,
  type SaveV1,
} from "../game/save.ts";
import { earn, spend, payoutFor, type PayGrade } from "../game/wallet.ts";
import { buyItem } from "../game/shop.ts";
import { CityJoystick } from "./city/CityJoystick.tsx";
import { readFlags } from "./flags.ts";
import { ReducedMotionContext, usePrefersReducedMotion } from "./motion.ts";
import { ApartmentPanel } from "./ui/ApartmentPanel.tsx";
import { ArrestSequence } from "./ui/ArrestSequence.tsx";
import { ChatBar } from "./ui/ChatBar.tsx";
import { DebugPanel } from "./ui/DebugPanel.tsx";
import { JailHud } from "./ui/JailHud.tsx";
import { GameOverlay } from "./ui/Minigames.tsx";
import { Overlay } from "./ui/Overlay.tsx";
import { type Caught, ShopliftPanel } from "./ui/ShopliftPanel.tsx";
import type { View } from "./world/CameraRig.tsx";
import { LoadingVeil } from "./ui/LoadingVeil.tsx";
import { preloadLook } from "./avatar/human/HumanDoll.tsx";
import { RoomAudio } from "./RoomAudio.tsx";
import { playFanfare, playWhoosh } from "../audio/worldSounds.ts";
import { completeChallenge, dayOf } from "../game/challenges.ts";
import { prizeFor } from "../game/prizes.ts";
import { PrizeCard } from "./ui/PrizeCard.tsx";
import { postPrize, prizeDesk } from "./ui/prizeDesk.ts";
import { World } from "./world/World.tsx";

const FADE_MS = 300;
const BUBBLE_MS = 6000;

function readStorage() {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    // storage blocked (private mode, sandboxed iframe): start fresh
    return null;
  }
}

function writeStorage(save: SaveV1) {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(save));
  } catch {
    // storage full or blocked; the session still works, it just won't persist
  }
}

type Visit = { room: RoomId; arrival: Spawn };

function visit(room: RoomId, spawn: Spawn): Visit {
  return { room, arrival: arrive(ROOMS[room], spawn) };
}

export function App() {
  const flags = useMemo(() => readFlags(window.location.search), []);
  const touch = useMemo(
    () => window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const reducedMotion = usePrefersReducedMotion();
  const [save, setSave] = useState(() =>
    loadSave(readStorage(), generateGuestName(Math.random)),
  );
  // the player's own doll parts start downloading with the page
  useEffect(() => preloadLook(save.look), []);
  useEffect(() => writeStorage(save), [save]);

  const [here, setHere] = useState(() => {
    // a sentence still running resumes in the cell block
    const jailed = isJailed(save.jail, Date.now());
    // new players (and returning ones) start out on Downtown's square
    const room = flags.room ?? (jailed ? "jail" : "city");
    return visit(room, flags.at ?? ROOMS[room].spawn);
  });
  const [fading, setFading] = useState(false);
  const traveling = useRef(false);
  // Fade out, swap rooms behind the curtain, then fade back in.
  const travel = useCallback((room: RoomId, spawn: Spawn) => {
    if (traveling.current) return;
    traveling.current = true;
    playWhoosh();
    setFading(true);
    window.setTimeout(() => {
      setHere(visit(room, spawn));
      setFading(false);
      traveling.current = false;
    }, FADE_MS);
  }, []);

  const tag = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [dance, setDance] = useState<DanceMoveId>("groove");
  const [holds, setHolds] = useState<Holds>(DEFAULT_HOLDS);
  const [view, setView] = useState<View>(flags.view ?? "room");
  const [chat, setChat] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    if (!chat) return;
    const id = window.setTimeout(() => setChat(null), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [chat]);

  const setLook = (look: Look) => setSave((s) => ({ ...s, look }));
  const setSwim = (swim: SwimLook) => setSave((s) => ({ ...s, swim }));
  const setBody = (body: BodyShape) => setSave((s) => ({ ...s, body }));
  const setMuted = (muted: boolean) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, muted } }));
  const setEffects = (effects: Intensity) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, effects } }));
  const setPanelOpen = useCallback(
    (panelOpen: boolean) =>
      setSave((s) => ({ ...s, settings: { ...s.settings, panelOpen } })),
    [],
  );
  const setHome = (home: HomeSave) => setSave((s) => ({ ...s, home }));
  const setCar = (car: ParkedCar) => setSave((s) => ({ ...s, car }));
  const setJail = (jail: SaveV1["jail"]) => setSave((s) => ({ ...s, jail }));
  // Stealing opens the stub shelf; a caught attempt runs the arrest first.
  const [shopping, setShopping] = useState(false);
  const [arrest, setArrest] = useState<{
    caught: Caught;
    penalty: Penalty;
  } | null>(null);
  const caught = useCallback(
    (found: Caught) => {
      setShopping(false);
      const penalty = penaltyFor(found.store, found.price, save.crime.offences);
      setArrest({ caught: found, penalty });
    },
    [save.crime.offences],
  );
  const finishArrest = useCallback(() => {
    if (!arrest) return;
    const now = Date.now();
    const { store } = arrest.caught;
    const { penalty } = arrest;
    setSave((s) => ({
      ...s,
      crime: recordCaught(s.crime, store.id, now, penalty),
      jail: jailAfterArrest(now, penalty) ?? s.jail,
      // the fine takes what the player has, up to the fine
      coins:
        penalty.kind === "fine"
          ? (spend(s.coins, penalty.coins) ?? 0)
          : s.coins,
    }));
    setArrest(null);
    if (penalty.kind === "jail") {
      travel("jail", ROOMS.jail.spawn);
    } else {
      setChat({
        text:
          penalty.kind === "warning"
            ? `Officer: a warning, and a day's ban from ${store.name}.`
            : `Officer: a ${penalty.coins} coin fine, paid on the spot.`,
        at: now,
      });
    }
  }, [arrest, travel]);
  // Released players arrive outside the jail, by the gate.
  const release = useCallback(() => {
    setSave((s) => ({ ...s, jail: { endsAt: null } }));
    travel("city", ROOMS.jail.portals[0].targetSpawn);
  }, [travel]);
  const now = Date.now();
  const [rides, setRides] = useState(0);
  const [game, setGame] = useState<MinigameId | null>(null);
  // a finished game pays its grade; quitting early (null) pays nothing
  const endGame = (grade: PayGrade | null) => {
    setGame(null);
    if (grade)
      setSave((s) => ({ ...s, coins: earn(s.coins, payoutFor(grade)) }));
  };
  // a finished sports game pays its grade, and a bonus for a personal best
  const { pending } = prizeDesk.use();
  useEffect(() => prizeDesk.set({ bests: save.bests }), [save.bests]);
  useEffect(() => {
    if (!pending) return;
    const prize = prizeFor(
      pending.game,
      pending.score,
      save.bests[pending.game],
    );
    const daily = completeChallenge(
      save.challenges,
      dayOf(Date.now()),
      pending.game,
      pending.score,
    );
    setSave((s) => ({
      ...s,
      coins: earn(s.coins, prize.coins + daily.coins),
      bests: prize.best ? { ...s.bests, [prize.game]: prize.score } : s.bests,
      challenges: daily.save,
    }));
    postPrize(prize, daily.coins);
    playFanfare(prize.grade === "S" ? 1 : prize.grade === "A" ? 0.6 : 0);
  }, [pending]);
  const saved = save.settings.quality;
  const quality = flags.quality ?? (saved === "auto" ? null : saved);

  return (
    <ReducedMotionContext.Provider value={reducedMotion}>
      <main className="app">
        <LoadingVeil />
        <PrizeCard />
        <RoomAudio room={here.room} muted={save.settings.muted} />
        <World
          room={here.room}
          arrival={here.arrival}
          look={save.look}
          swim={save.swim}
          body={save.body}
          rides={rides}
          onGame={setGame}
          slideAt={flags.slide}
          mood={mood}
          dance={dance}
          holds={holds}
          effects={save.settings.effects}
          // walking ends a dance, so the Dance mood drops back to idle
          onMove={() => setMood((m) => (m === "dance" ? "idle" : m))}
          view={view}
          tag={tag}
          quality={quality}
          still={flags.still}
          onPortal={(portal) => travel(portal.target, portal.targetSpawn)}
          home={save.home}
          onShelf={() => setShopping(true)}
          car={parkedOrHome(save.car)}
          onPark={setCar}
        />
        <div className="tag" ref={tag}>
          {chat && (
            <p className="bubble" role="status">
              {chat.text}
            </p>
          )}
          <p className="nametag">{save.name}</p>
        </div>
        <div className="fade" data-on={fading} aria-hidden="true" />
        <Overlay
          room={here.room}
          roomName={ROOMS[here.room].name}
          look={save.look}
          setLook={setLook}
          swim={save.swim}
          setSwim={setSwim}
          body={save.body}
          setBody={setBody}
          coins={save.coins}
          wardrobe={save.wardrobe}
          onBuy={(id) => {
            const r = buyItem(
              { coins: save.coins, wardrobe: save.wardrobe },
              id,
            );
            if (r.ok)
              setSave((s) => ({
                ...s,
                coins: r.state.coins,
                wardrobe: [...r.state.wardrobe],
              }));
            return r;
          }}
          onRide={() => setRides((n) => n + 1)}
          onPlayGame={setGame}
          onCityTravel={(spawn) => travel("city", spawn)}
          muted={save.settings.muted}
          setMuted={setMuted}
          mood={mood}
          setMood={setMood}
          dance={dance}
          setDance={setDance}
          holds={holds}
          setHolds={setHolds}
          effects={save.settings.effects}
          setEffects={setEffects}
          view={view}
          setView={setView}
          panelOpen={save.settings.panelOpen}
          challenges={save.challenges}
          setPanelOpen={setPanelOpen}
          car={parkedOrHome(save.car)}
          setCar={setCar}
        />
        {here.room === "apartment" && (
          <ApartmentPanel
            home={save.home}
            onChange={setHome}
            onShelf={() => setShopping(true)}
          />
        )}
        {here.room === "apartment" && shopping && (
          <ShopliftPanel
            crime={save.crime}
            now={now}
            onCaught={caught}
            onClose={() => setShopping(false)}
          />
        )}
        {arrest && <ArrestSequence onDone={finishArrest} />}
        {here.room === "jail" && (
          <JailHud
            jail={save.jail}
            coins={save.coins}
            onChange={setJail}
            onPayBail={(coins) => setSave((s) => ({ ...s, coins }))}
            onRelease={release}
          />
        )}
        {game && <GameOverlay game={game} onClose={endGame} />}
        {here.room === "city" && touch && <CityJoystick />}
        <ChatBar onSay={(text) => setChat({ text, at: Date.now() })} />
        {flags.debug && (
          <DebugPanel onGo={(room) => travel(room, ROOMS[room].spawn)} />
        )}
      </main>
    </ReducedMotionContext.Provider>
  );
}
