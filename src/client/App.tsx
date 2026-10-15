import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DanceMoveId } from "../game/dance/moves.ts";
import type { Intensity } from "../game/effects/buzz.ts";
import type { Look, Mood, SwimLook } from "../game/look.ts";
import { arrive } from "../game/portals.ts";
import { ROOMS, type RoomId, type Spawn } from "../game/rooms.ts";
import {
  generateGuestName,
  loadSave,
  SAVE_KEY,
  serializeSave,
  type SaveV1,
} from "../game/save.ts";
import { CityJoystick } from "./city/CityJoystick.tsx";
import { readFlags } from "./flags.ts";
import { ReducedMotionContext, usePrefersReducedMotion } from "./motion.ts";
import { ChatBar } from "./ui/ChatBar.tsx";
import { DebugPanel } from "./ui/DebugPanel.tsx";
import { Overlay } from "./ui/Overlay.tsx";
import type { View } from "./world/CameraRig.tsx";
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
  useEffect(() => writeStorage(save), [save]);

  const [here, setHere] = useState(() => {
    const room = flags.room ?? "velvet-room";
    return visit(room, ROOMS[room].spawn);
  });
  const [fading, setFading] = useState(false);
  const travelling = useRef(false);
  // Fade out, swap rooms behind the curtain, then fade back in.
  const travel = useCallback((room: RoomId, spawn: Spawn) => {
    if (travelling.current) return;
    travelling.current = true;
    setFading(true);
    window.setTimeout(() => {
      setHere(visit(room, spawn));
      setFading(false);
      travelling.current = false;
    }, FADE_MS);
  }, []);

  const tag = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [dance, setDance] = useState<DanceMoveId>("two-step");
  const [view, setView] = useState<View>(flags.view ?? "room");
  const [chat, setChat] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    if (!chat) return;
    const id = window.setTimeout(() => setChat(null), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [chat]);

  const setLook = (look: Look) => setSave((s) => ({ ...s, look }));
  const setSwim = (swim: SwimLook) => setSave((s) => ({ ...s, swim }));
  const setEffects = (effects: Intensity) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, effects } }));
  const [rides, setRides] = useState(0);
  const saved = save.settings.quality;
  const quality = flags.quality ?? (saved === "auto" ? null : saved);

  return (
    <ReducedMotionContext.Provider value={reducedMotion}>
      <main className="app">
        <World
          room={here.room}
          arrival={here.arrival}
          look={save.look}
          swim={save.swim}
          rides={rides}
          slideAt={flags.slide}
          mood={mood}
          dance={dance}
          effects={save.settings.effects}
          // walking ends a dance, so the Dance mood drops back to idle
          onMove={() => setMood((m) => (m === "dance" ? "idle" : m))}
          view={view}
          tag={tag}
          quality={quality}
          still={flags.still}
          onPortal={(portal) => travel(portal.target, portal.targetSpawn)}
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
          onRide={() => setRides((n) => n + 1)}
          mood={mood}
          setMood={setMood}
          dance={dance}
          setDance={setDance}
          effects={save.settings.effects}
          setEffects={setEffects}
          view={view}
          setView={setView}
        />
        {here.room === "city" && touch && <CityJoystick />}
        <ChatBar onSay={(text) => setChat({ text, at: Date.now() })} />
        {flags.debug && (
          <DebugPanel onGo={(room) => travel(room, ROOMS[room].spawn)} />
        )}
      </main>
    </ReducedMotionContext.Provider>
  );
}
