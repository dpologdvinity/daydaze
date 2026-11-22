// The root component: owns the save (loaded from and written to localStorage on
// every change), the current room and travel fades, chat bubbles, shoplifting
// arrests and jail, minigame and prize payouts, and the online panels behind
// ?online=1. Everything else gets state and setters through props.

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { recordCaught } from "../game/crime/record.ts";
import { penaltyFor, type Penalty } from "../game/crime/shoplift.ts";
import type { BodyShape } from "../game/body.ts";
import { CAREER_DEFS } from "../game/careers.ts";
import {
  DEFAULT_HOLDS,
  type DanceMoveId,
  type Holds,
} from "../game/dance/moves.ts";
import { chatDistort, type Intensity } from "../game/effects/buzz.ts";
import type { Graphics } from "../game/graphics.ts";
import { getBuzz } from "./effects/drunk.ts";
import { LazyPanel } from "./ui/ReloadBoundary.tsx";
import { ONLINE, onlineSession, useOnlineRoom } from "./net/online.ts";
import { leaveParty } from "./net/party.ts";
import { endVisit, homeVisit, listenForHomes } from "./net/home.ts";
import { chatPrefs } from "./net/chatPrefs.ts";
import { useCloudSave } from "./net/cloudSave.ts";
import type { MinigameId } from "../game/hotspots.ts";
import { isJailed } from "../game/jail/jail.ts";
import { jailAfterArrest } from "../game/police/arrest.ts";
import {
  encodeSwim,
  type Look,
  type Mood,
  type SwimLook,
} from "../game/look.ts";
import type { HomeSave } from "../game/home/home.ts";
import { parkedOrHome, type ParkedCar } from "../game/city/drive.ts";
import { mayEnter } from "../game/age.ts";
import { buyCar } from "../game/garage.ts";
import { buyRecord } from "../game/records.ts";
import { ADULT_NOTICE, ADULT_OK } from "./adult.ts";
import { arrive } from "../game/portals.ts";
import { DIVE_NOTICE, mayDive, wearsGear } from "../game/dive.ts";
import { afloat, scuba } from "./avatar/human/afloat.ts";
import { ROOMS, type RoomId, type Spawn } from "../game/rooms.ts";
import {
  generateGuestName,
  loadSave,
  SAVE_KEY,
  serializeSave,
  type SaveV1,
} from "../game/save.ts";
import { spend, type PayGrade } from "../game/wallet.ts";
import { buyItem } from "../game/shop.ts";
import { CityJoystick } from "./city/CityJoystick.tsx";
import { readFlags } from "./flags.ts";
import { ReducedMotionContext, usePrefersReducedMotion } from "./motion.ts";
import { ChatBar } from "./ui/ChatBar.tsx";
import { Overlay } from "./ui/Overlay.tsx";
import { GameOverlay } from "./ui/Minigames.tsx";
import type { Caught } from "./ui/ShopliftPanel.tsx";
import type { View } from "./world/CameraRig.tsx";
import { LoadingVeil } from "./ui/LoadingVeil.tsx";
import { preloadLook } from "./avatar/human/HumanDoll.tsx";
import { RoomAudio } from "./RoomAudio.tsx";
import { playSoundFile } from "../audio/soundFiles.ts";
import { playFanfare } from "../audio/worldSounds.ts";
import {
  applyPrize,
  finishShift,
  scorePrize,
  rewardSteal,
  rewardVisit,
  rewardLegacy,
} from "../game/progression/activities.ts";
import {
  levelOf,
  totalXp,
  titleLabel,
  selectTitle,
} from "../game/progression/progression.ts";
import { RankMoment } from "./ui/Progression.tsx";
import { PrizeCard } from "./ui/PrizeCard.tsx";
import { UpdatePrompt } from "./ui/UpdatePrompt.tsx";
import { Collections } from "./ui/Collections.tsx";
import { claimSet } from "../game/collections.ts";
import { Onboarding } from "./ui/Onboarding.tsx";
import { postPrize, prizeDesk } from "./ui/prizeDesk.ts";
import { shiftDesk } from "./ui/shiftDesk.ts";
import { petDesk } from "./rooms/zoo/petDesk.ts";
import { pottery } from "./rooms/pottery/session.ts";
import { farmDesk } from "./rooms/farm/farmSession.ts";
import { floristDesk } from "./rooms/florist/session.ts";
import { gardenDesk } from "./rooms/garden/gardenSession.ts";
import { pouchDesk } from "./inventory/pouchDesk.ts";
import { World } from "./world/World.tsx";
import type { ClosetSave } from "../game/closet.ts";

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

// Panels the first frame doesn't need (online invites, room and event
// panels): each loads when first rendered, behind a Suspense that shows nothing.
const DuelPanel = lazy(() =>
  import("./net/DuelPanel.tsx").then((m) => ({ default: m.DuelPanel })),
);
const TogetherPanel = lazy(() =>
  import("./net/TogetherPanel.tsx").then((m) => ({ default: m.TogetherPanel })),
);
const CookOffInvite = lazy(() =>
  import("./net/CookOffInvite.tsx").then((m) => ({ default: m.CookOffInvite })),
);
const PartyPanel = lazy(() =>
  import("./net/PartyPanel.tsx").then((m) => ({ default: m.PartyPanel })),
);
const RidePanel = lazy(() =>
  import("./net/RidePanel.tsx").then((m) => ({ default: m.RidePanel })),
);
const RacePanel = lazy(() =>
  import("./net/RacePanel.tsx").then((m) => ({ default: m.RacePanel })),
);
const ConnectionNote = lazy(() =>
  import("./net/ConnectionNote.tsx").then((m) => ({
    default: m.ConnectionNote,
  })),
);
const FriendsPanel = lazy(() =>
  import("./net/FriendsPanel.tsx").then((m) => ({ default: m.FriendsPanel })),
);
const PeerCard = lazy(() =>
  import("./net/PeerCard.tsx").then((m) => ({ default: m.PeerCard })),
);
const ApartmentPanel = lazy(() =>
  import("./ui/ApartmentPanel.tsx").then((m) => ({
    default: m.ApartmentPanel,
  })),
);
const ArrestSequence = lazy(() =>
  import("./ui/ArrestSequence.tsx").then((m) => ({
    default: m.ArrestSequence,
  })),
);
const DebugPanel = lazy(() =>
  import("./ui/DebugPanel.tsx").then((m) => ({ default: m.DebugPanel })),
);
const JailHud = lazy(() =>
  import("./ui/JailHud.tsx").then((m) => ({ default: m.JailHud })),
);
const ShopliftPanel = lazy(() =>
  import("./ui/ShopliftPanel.tsx").then((m) => ({ default: m.ShopliftPanel })),
);

/** The dev panel (press `), loaded only in development; production drops it. */
const DevPanel = import.meta.env.DEV
  ? lazy(() =>
      import("./world/DevTools.tsx").then((m) => ({ default: m.DevPanel })),
    )
  : null;

/** The streak calendar and celebration, loaded on first use. */
const StreakPanel = lazy(() =>
  import("./ui/StreakPanel.tsx").then((m) => ({ default: m.StreakPanel })),
);

/**
 * The whole game: the 3D World, the overlay UI and the panels around it. Travel
 * to an 18+ room is refused with a notice unless the age gate allows it.
 */
export function App() {
  const flags = useMemo(() => readFlags(window.location.search), []);
  const touch = useMemo(
    () => window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const reducedMotion = usePrefersReducedMotion();
  const [save, setSave] = useState(() => {
    const loaded = loadSave(readStorage(), generateGuestName(Math.random));
    // the player's own doll parts start downloading with the page (a cached
    // fetch, so StrictMode's second call costs nothing)
    preloadLook(loaded.look);
    return loaded;
  });
  useEffect(() => writeStorage(save), [save]);
  const previousCoins = useRef(save.coins);
  useEffect(() => {
    if (save.coins > previousCoins.current) void playSoundFile("coin");
    previousCoins.current = save.coins;
  }, [save.coins]);

  const [here, setHere] = useState(() => {
    // a sentence still running resumes in the cell block
    const jailed = isJailed(save.jail, Date.now());
    // new players (and returning ones) start out on Downtown's square
    // a sentence can't be skipped with ?room=
    const asked = jailed ? "jail" : (flags.room ?? flags.join?.room ?? "city");
    const room = mayEnter(asked, ADULT_OK) ? asked : "city";
    return visit(room, (room === asked && flags.at) || ROOMS[room].spawn);
  });
  // online play (?online=1): be in the same room as everyone else here,
  // the swimsuit along so others see it in swimwear rooms
  const onlineLook = useMemo(
    () => ({ ...save.look, swim: encodeSwim(save.swim) }),
    [save.look, save.swim],
  );
  useOnlineRoom(here.room, onlineLook, save.home);
  // visiting a friend's place: theirs is the home you see, read-only
  const visiting = homeVisit.use();
  useEffect(() => (ONLINE ? listenForHomes() : undefined), []);
  // Discovery and real event visits commit their saved claim with the XP.
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setSave((s) => rewardVisit(s, here.room, now, ADULT_OK));
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [here.room]);
  const [fading, setFading] = useState(false);
  const traveling = useRef(false);
  // Fade out, swap rooms behind the curtain, then fade back in.
  // a short line about a shut door, such as an 18+ venue's
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);
  const travel = useCallback((room: RoomId, spawn: Spawn) => {
    if (!mayEnter(room, ADULT_OK)) {
      setNotice(ADULT_NOTICE);
      return;
    }
    if (!mayDive(room, scuba.get().rented)) {
      setNotice(DIVE_NOTICE);
      return;
    }
    if (traveling.current) return;
    traveling.current = true;
    void playSoundFile("door");
    setFading(true);
    window.setTimeout(() => {
      setHere(visit(room, spawn));
      setFading(false);
      traveling.current = false;
    }, FADE_MS);
  }, []);

  // following a party leader through a door; a sentence in the cells
  // can't be walked out of that way
  const goWithParty = useCallback(
    (room: RoomId) => {
      if (here.room === "jail") leaveParty();
      else travel(room, ROOMS[room].spawn);
    },
    [travel, here.room],
  );

  // the session's sea state is set in one place on every arrival, however
  // she got here (a door, an arrest, a visit, a party): rented gear is on
  // only in the sea rooms, and she is never left afloat in a dry room
  useEffect(() => {
    scuba.set({ wearing: wearsGear(here.room, scuba.get().rented) });
    afloat.on = false;
  }, [here.room]);

  // walking out of a friend's apartment ends the visit (only a real exit:
  // starting a visit from elsewhere mustn't cancel it)
  const lastRoom = useRef(here.room);
  useEffect(() => {
    if (lastRoom.current === "apartment" && here.room !== "apartment")
      endVisit();
    lastRoom.current = here.room;
  }, [here.room]);
  // a visit starts: off to the apartment; turned away: back to the city
  useEffect(() => {
    if (visiting.owner && here.room !== "apartment")
      travel("apartment", ROOMS.apartment.spawn);
  }, [visiting.owner, here.room, travel]);
  useEffect(() => {
    if (!visiting.bounced) return;
    homeVisit.set({ bounced: false });
    setNotice(visiting.note);
    if (here.room === "apartment") travel("city", ROOMS.city.spawn);
  }, [visiting.bounced, visiting.note, here.room, travel]);
  const shownHome =
    visiting.owner && here.room === "apartment"
      ? (visiting.home ?? { locked: false, furniture: [] })
      : save.home;

  const tag = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [dance, setDance] = useState<DanceMoveId>("groove");
  const [holds, setHolds] = useState<Holds>(DEFAULT_HOLDS);
  const [view, setView] = useState<View>(flags.view ?? "room");
  const [chat, setChat] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    if (!chat) return;
    const bubbleMs = flags.still || flags.debug ? 60_000 : BUBBLE_MS;
    const id = window.setTimeout(() => setChat(null), bubbleMs);
    return () => window.clearTimeout(id);
  }, [chat, flags.still, flags.debug]);

  const setLook = (look: Look) => setSave((s) => ({ ...s, look }));
  const setSwim = (swim: SwimLook) => setSave((s) => ({ ...s, swim }));
  const setBody = (body: BodyShape) => setSave((s) => ({ ...s, body }));
  const setCloset = (closet: ClosetSave) => setSave((s) => ({ ...s, closet }));
  const setMuted = (muted: boolean) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, muted } }));
  const setEffects = (effects: Intensity) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, effects } }));
  const setHighAudio = (highAudio: boolean) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, highAudio } }));
  const setGraphics = (graphics: Graphics) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, graphics } }));
  // signed in, every change goes up to the account a few seconds later.
  // A restored account save remounts the rank-up watcher, so ranks it brings
  // back aren't celebrated as new ones.
  const [restores, setRestores] = useState(0);
  const restoreSave = useCallback((next: SaveV1) => {
    setSave(next);
    setRestores((n) => n + 1);
  }, []);
  useCloudSave(save, restoreSave);
  // the strict chat filter: set in the Friends panel, read by the chat
  const setStrictChat = (strictChat: boolean) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, strictChat } }));
  useEffect(
    () => chatPrefs.set({ strict: save.settings.strictChat }),
    [save.settings.strictChat],
  );
  const setPanelOpen = useCallback(
    (panelOpen: boolean) =>
      setSave((s) => ({ ...s, settings: { ...s.settings, panelOpen } })),
    [],
  );
  // the Zoo's adoption panel reads the saved pet and changes it through `act`
  useEffect(() => petDesk.set({ pet: save.pet }), [save.pet]);
  useEffect(
    () =>
      petDesk.set({
        act: (change) => setSave((s) => ({ ...s, pet: change(s.pet) })),
      }),
    [],
  );
  // Sunny Acres Farm's panel reads the saved farm and coins and writes them back
  useEffect(
    () => farmDesk.set({ farm: save.farm, coins: save.coins }),
    [save.farm, save.coins],
  );
  useEffect(
    () =>
      farmDesk.set({
        commit: (next) =>
          setSave((s) => ({ ...s, farm: next.farm, coins: next.coins })),
      }),
    [],
  );
  useEffect(() => pottery.set({ saved: save.pottery }), [save.pottery]);
  useEffect(() => {
    pottery.set({
      commit: (piece) => setSave((s) => ({ ...s, pottery: piece })),
    });
    return () => pottery.set({ commit: null });
  }, []);
  // Petal & Stem's panel reads the saved bouquet and coins and writes them back
  useEffect(
    () => floristDesk.set({ bouquet: save.bouquet, coins: save.coins }),
    [save.bouquet, save.coins],
  );
  useEffect(
    () =>
      floristDesk.set({
        commit: (next) =>
          setSave((s) => ({ ...s, bouquet: next.bouquet, coins: next.coins })),
      }),
    [],
  );
  // Suburbia Community Garden panel reads the saved garden and coins and writes them back
  useEffect(
    () => gardenDesk.set({ garden: save.garden, coins: save.coins }),
    [save.garden, save.coins],
  );
  useEffect(
    () =>
      gardenDesk.set({
        commit: (next) =>
          setSave((s) => ({ ...s, garden: next.garden, coins: next.coins })),
      }),
    [],
  );
  // The weed pouch, the gift day and coins: the pouch panels, shops and the
  // lounger read them from pouchDesk and write back through `commit`
  useEffect(
    () =>
      pouchDesk.set({
        inventory: save.inventory,
        giftDay: save.giftDay,
        coins: save.coins,
      }),
    [save.inventory, save.giftDay, save.coins],
  );
  useEffect(
    () =>
      pouchDesk.set({
        commit: (next) =>
          setSave((s) => ({
            ...s,
            inventory: next.inventory,
            giftDay: next.giftDay,
            coins: next.coins,
          })),
      }),
    [],
  );
  const setHome = (home: HomeSave) => setSave((s) => ({ ...s, home }));
  const setCar = (car: ParkedCar) => setSave((s) => ({ ...s, car }));
  const setJail = (jail: SaveV1["jail"]) => setSave((s) => ({ ...s, jail }));
  // The practice shelf opens the shoplift panel; a caught attempt runs the arrest first.
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
    if (grade && game) setSave((s) => rewardLegacy(s, game, grade));
  };
  // a finished sports game pays its grade, and a bonus for a personal best
  const { pending } = prizeDesk.use();
  useEffect(() => prizeDesk.set({ bests: save.bests }), [save.bests]);
  // the save as of the last render, for grading a prize when one comes in
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  }, [save]);
  useEffect(() => {
    if (!pending) return;
    const now = Date.now();
    const result = scorePrize(latest.current, pending.game, pending.score, now);
    if (!result) {
      prizeDesk.set({ pending: null });
      return;
    }
    setSave((s) => applyPrize(s, pending.game, result));
    postPrize(result.prize, result.daily, result.xp);
    if (!latest.current.settings.muted)
      playFanfare(
        result.prize.grade === "S" ? 1 : result.prize.grade === "A" ? 0.6 : 0,
      );
  }, [pending]);
  // a finished paid shift pays its wage and Hustle XP, and posts the slip
  const shiftPending = shiftDesk.use().pending;
  useEffect(() => {
    if (!shiftPending) return;
    const now = Date.now();
    const { job, result } = shiftPending;
    // the slip is read from the last render; the save itself is updated from
    // its latest state, so a prize paid in the same tick is not overwritten
    const r = finishShift(latest.current, job, result, now);
    setSave((s) => finishShift(s, job, result, now).save);
    shiftDesk.set({
      pending: null,
      slip: {
        job,
        coins: r.coins,
        xp: r.xp,
        clean: r.clean,
        slow: r.slow,
        promotion: r.promotion
          ? `${CAREER_DEFS[r.promotion.career].label} · ${r.promotion.name}`
          : null,
        bonus: r.promotion?.bonus ?? 0,
      },
    });
  }, [shiftPending]);
  // opening the game on a new day counts toward the streak (and again if the
  // tab stays open past midnight); a milestone pays and celebrates
  useEffect(() => {
    let live = true;
    const count = () =>
      // the rules load on demand, not with the first download
      void import("./streakCheckIn.ts").then(
        (m) => live && m.countToday(latest, setSave),
      );
    count();
    const id = window.setInterval(count, 60_000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <ReducedMotionContext.Provider value={reducedMotion}>
      <main className="app">
        <LoadingVeil />
        <PrizeCard />
        <RankMoment
          key={restores}
          progression={save.progression}
          muted={save.settings.muted}
        />
        <LazyPanel>
          <StreakPanel streak={save.streak} />
        </LazyPanel>
        <UpdatePrompt />
        <Collections
          visited={save.visited}
          wardrobe={save.wardrobe}
          claimed={save.sets}
          bests={save.bests}
          onClaim={(id) =>
            setSave((s) => {
              const claim = claimSet(s, id);
              return claim.ok
                ? { ...s, coins: claim.coins, sets: claim.sets }
                : s;
            })
          }
        />
        {!save.onboarded && (
          <Onboarding
            name={save.name}
            look={save.look}
            inCity={here.room === "city"}
            onName={(name) => setSave((s) => ({ ...s, name }))}
            onLook={setLook}
            onCustomize={() => setPanelOpen(true)}
            onDone={() => setSave((s) => ({ ...s, onboarded: true }))}
          />
        )}
        <RoomAudio room={here.room} muted={save.settings.muted} />
        <World
          dressing={save.settings.panelOpen}
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
          highAudio={save.settings.highAudio}
          // walking ends a dance, so the Dance mood drops back to idle
          onMove={() => setMood((m) => (m === "dance" ? "idle" : m))}
          view={view}
          tag={tag}
          quality={flags.quality}
          graphics={save.settings.graphics}
          still={flags.still}
          onPortal={(portal) => travel(portal.target, portal.targetSpawn)}
          home={shownHome}
          onShelf={() => setShopping(true)}
          car={parkedOrHome(save.car)}
          onPark={setCar}
          pet={save.pet}
        />
        <div className="tag" ref={tag} data-chat={chat?.text}>
          {chat && (
            <p className="bubble" role="status">
              {chat.text}
            </p>
          )}
          <p className="nametag">
            {save.name} · Lv {levelOf(totalXp(save.progression))}
            {titleLabel(save.progression) && (
              <small className="player-title">
                {titleLabel(save.progression)}
              </small>
            )}
          </p>
        </div>
        <LazyPanel>
          <PeerCard />
        </LazyPanel>
        {ONLINE && (
          <>
            <LazyPanel>
              <FriendsPanel
                onGo={(room) => travel(room, ROOMS[room].spawn)}
                strictChat={save.settings.strictChat}
                onStrictChat={setStrictChat}
                save={save}
                onSave={setSave}
              />
            </LazyPanel>
            <LazyPanel>
              <DuelPanel />
            </LazyPanel>
            <LazyPanel>
              <TogetherPanel />
            </LazyPanel>
            <LazyPanel>
              <CookOffInvite />
            </LazyPanel>
            <LazyPanel>
              <PartyPanel onGo={goWithParty} />
            </LazyPanel>
            <LazyPanel>
              <RidePanel />
            </LazyPanel>
            <LazyPanel>
              <RacePanel />
            </LazyPanel>
            <LazyPanel>
              <ConnectionNote />
            </LazyPanel>
          </>
        )}
        <div className="fade" data-on={fading} aria-hidden="true" />
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <Overlay
          room={here.room}
          roomName={
            here.room === "apartment" && visiting.owner
              ? `${visiting.owner.name}'s apartment`
              : ROOMS[here.room].name
          }
          look={save.look}
          setLook={setLook}
          swim={save.swim}
          setSwim={setSwim}
          body={save.body}
          setBody={setBody}
          closet={save.closet}
          setCloset={setCloset}
          progression={save.progression}
          shifts={save.shifts}
          onTitle={(title) =>
            setSave((s) => ({
              ...s,
              progression: selectTitle(s.progression, title),
            }))
          }
          coins={save.coins}
          wardrobe={save.wardrobe}
          onBuy={(id, store, day) => {
            const r = buyItem(
              { coins: save.coins, wardrobe: save.wardrobe },
              id,
              store,
              day,
            );
            if (r.ok)
              setSave((s) => ({
                ...s,
                coins: r.state.coins,
                wardrobe: [...r.state.wardrobe],
              }));
            return r;
          }}
          crime={save.crime}
          onSteal={(id, storeId) => setSave((s) => rewardSteal(s, id, storeId))}
          onCaught={caught}
          onRide={() => setRides((n) => n + 1)}
          onPlayGame={setGame}
          onCityTravel={(spawn) => travel("city", spawn)}
          muted={save.settings.muted}
          setMuted={setMuted}
          graphics={save.settings.graphics}
          setGraphics={setGraphics}
          mood={mood}
          setMood={setMood}
          dance={dance}
          setDance={setDance}
          holds={holds}
          setHolds={setHolds}
          effects={save.settings.effects}
          setEffects={setEffects}
          highAudio={save.settings.highAudio}
          setHighAudio={setHighAudio}
          view={view}
          setView={setView}
          panelOpen={save.settings.panelOpen}
          challenges={save.challenges}
          setPanelOpen={setPanelOpen}
          car={parkedOrHome(save.car)}
          setCar={setCar}
          records={save.records}
          onBuyRecord={(id) => {
            const r = buyRecord(save.coins, save.records, id);
            if (r.ok)
              setSave((s) => ({ ...s, coins: r.coins, records: r.records }));
          }}
          garage={save.garage}
          onBuyCar={(id) => {
            const r = buyCar(save.coins, save.garage, id);
            if (!r.ok) return;
            // the new car waits at the home curb, ready to drive
            setSave((s) => ({
              ...s,
              coins: r.coins,
              garage: r.garage,
              car: {
                ...parkedOrHome(null),
                id,
                color: s.car?.color ?? "#ff4fb3",
              },
            }));
          }}
          onSpend={(price) => {
            const left = spend(save.coins, price);
            if (left === null) return false;
            setSave((s) => ({ ...s, coins: left }));
            return true;
          }}
        />
        {here.room === "apartment" && visiting.owner && (
          <p className="notice" role="status">
            You&apos;re at {visiting.owner.name}&apos;s place.
          </p>
        )}
        {/* a panel that fails to load shows the Reload card for itself only,
            and an arrest still ends with its penalty saved */}
        {here.room === "apartment" && !visiting.owner && (
          <LazyPanel>
            <ApartmentPanel
              home={save.home}
              onChange={setHome}
              onShelf={() => setShopping(true)}
            />
          </LazyPanel>
        )}
        {here.room === "jail" && (
          <LazyPanel>
            <JailHud
              jail={save.jail}
              coins={save.coins}
              onChange={setJail}
              onPayBail={(coins) => setSave((s) => ({ ...s, coins }))}
              onRelease={release}
            />
          </LazyPanel>
        )}
        {game && (
          <LazyPanel onContinue={() => endGame(null)}>
            <GameOverlay game={game} onClose={endGame} />
          </LazyPanel>
        )}
        {here.room === "apartment" && shopping && (
          <LazyPanel onContinue={() => setShopping(false)}>
            <ShopliftPanel
              crime={save.crime}
              now={now}
              onCaught={caught}
              onClose={() => setShopping(false)}
            />
          </LazyPanel>
        )}
        {arrest && (
          <LazyPanel onContinue={finishArrest}>
            <ArrestSequence onDone={finishArrest} />
          </LazyPanel>
        )}
        {here.room === "city" && touch && <CityJoystick />}
        <ChatBar
          onSay={(text) => {
            const at = Date.now();
            // a few drinks in, vowels stretch ("heyyy"); online, the server
            // stretches what others see, by the buzz your moves show
            setChat({ text: chatDistort(text, getBuzz(), at), at });
            onlineSession()?.sendChat(text);
          }}
        />
        {DevPanel && (
          <Suspense fallback={null}>
            <DevPanel
              onGo={(room) => travel(room, ROOMS[room].spawn)}
              onGame={setGame}
              save={save}
              onCoins={(n) => setSave((s) => ({ ...s, coins: s.coins + n }))}
            />
          </Suspense>
        )}
        {flags.debug && (
          <Suspense fallback={null}>
            <DebugPanel onGo={(room) => travel(room, ROOMS[room].spawn)} />
          </Suspense>
        )}
      </main>
    </ReducedMotionContext.Provider>
  );
}
