import { useEffect, useRef, useState } from "react";
import { eventTrack } from "../game/events.ts";
import { nightClock } from "./city/eventClocks.ts";
import { getSharedAudioBus } from "../audio/audioBus.ts";
import {
  getSharedJukeboxController,
  type TrackId,
} from "../audio/proceduralJukebox.ts";
import {
  playClick,
  startAmbience,
  unlockAudio,
  type Ambience,
} from "../audio/worldSounds.ts";
import {
  AMBIENCE_IDS,
  ambienceFor,
  filesCover,
  soundsFor,
  type AmbienceId,
} from "../audio/ambience.ts";
import { submergedView } from "./world/submerged.ts";
import { preloadSounds, setFileAmbience } from "../audio/soundFiles.ts";
import { cityHour } from "./city/daylight.ts";
import type { RoomId } from "../game/rooms.ts";
import { useInPark, useNeighborhood } from "./city/here.ts";
import { musicPick } from "./musicPick.ts";
import { carExtras } from "./city/carExtras.ts";

// what plays where: venues get a jukebox track, open places an ambience bed
const MUSIC: Partial<Record<RoomId, TrackId>> = {
  "velvet-room": "canopy-lofi",
  "violet-hour": "canopy-lofi",
  pulse: "savanna-nightclub",
  plaza: "canopy-lofi",
  "amusement-park": "carnival-calliope",
  "water-park": "waterhole-twilight",
  "filipino-joint": "canopy-lofi",
  "boba-matcha": "canopy-lofi",
  "ube-bakery": "canopy-lofi",
  "ice-rink": "waterhole-twilight",
  "rooftop-bar": "canopy-lofi",
  "sugar-rush": "sugar-rush-pop",
  warehouse: "warehouse-acid",
  bowling: "savanna-nightclub",
  "arcade-bar": "player-two-chiptune",
  "la-noche": "la-noche-salsa",
  "mini-golf": "waterhole-twilight",
  dome: "savanna-nightclub",
  "kamayan-hall": "canopy-lofi",
  galleria: "sugar-rush-pop",
  "roller-rink": "roller-disco",
  skatepark: "warehouse-acid",
  gym: "sugar-rush-pop",
  "driving-range": "canopy-lofi",
  marina: "canopy-lofi",
  courtside: "sugar-rush-pop",
  catwalk: "sugar-rush-pop",
  "mermaid-cove": "waterhole-twilight",
  "open-water": "canopy-lofi",
  "reef-dive": "waterhole-twilight",
  "skate-diner": "roller-disco",
  museum: "canopy-lofi",
  salon: "sugar-rush-pop",
  piercing: "warehouse-acid",
  "green-haze": "canopy-lofi",
  "laser-tag": "warehouse-acid",
  market: "canopy-lofi",
  paintball: "warehouse-acid",
  zoo: "canopy-lofi",
  dealership: "sugar-rush-pop",
  "jazz-club": "waterhole-twilight",
  "vinyl-vault": "canopy-lofi",
  "back-room": "waterhole-twilight",
  "tiki-bar": "canopy-lofi",
  "thrift-temple": "roller-disco",
  "espresso-lab": "canopy-lofi",
  "hotel-rooftop": "sugar-rush-pop",
  bookshop: "canopy-lofi",
  patisserie: "roller-disco",
  gallery: "canopy-lofi",
  "surf-shack": "sugar-rush-pop",
  "boardwalk-arcade": "player-two-chiptune",
  "drive-in": "roller-disco",
  "wine-bar": "waterhole-twilight",
  "video-store": "player-two-chiptune",
  "halo-halo-cafe": "canopy-lofi",
  "ramen-shop": "canopy-lofi",
  "sushi-bar": "canopy-lofi",
  lune: "waterhole-twilight",
  bistro: "canopy-lofi",
  // a backing track to sing over
  karaoke: "sugar-rush-pop",
};
const AMBIENCE: Partial<Record<RoomId, Ambience>> = {
  aquarium: "aquarium",
  "ice-rink": "rink",
  "haunted-house": "haunted",
  "mini-golf": "beach",
  marina: "beach",
  courtside: "city",
  "mermaid-cove": "beach",
  "open-water": "beach",
  stadium: "city",
  gridiron: "city",
  // the city's hum, thirty floors down
  "rooftop-bar": "city",
};

/**
 * The world's sound: music for the room you're in, an ambience bed for open
 * places (surf on the beach, a hum in the city), a tick on every button,
 * and the master mute. Browsers only start audio from a gesture, so nothing
 * plays until the first tap or key press.
 */
export function RoomAudio({ room, muted }: { room: RoomId; muted: boolean }) {
  const [unlocked, setUnlocked] = useState(false);
  const neighborhood = useNeighborhood();
  const inPark = useInPark();
  const [hour, setHour] = useState(cityHour);
  useEffect(() => {
    const id = window.setInterval(() => setHour(cityHour()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const picked = musicPick.use().track;
  const radio = carExtras.use().station;
  // a record on at the shop or the record player at home wins, and the car
  // radio while you drive in the city
  const pick =
    room === "vinyl-vault" || room === "apartment"
      ? picked
      : room === "city"
        ? radio
        : null;

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      const ctx = getSharedAudioBus().getContext();
      if (!ctx) return;
      if (ctx.state === "running") setUnlocked(true);
      else
        ctx.addEventListener(
          "statechange",
          () => setUnlocked(ctx.state === "running"),
          { once: true },
        );
    };
    const click = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("button"))
        playClick();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("click", click);
    };
  }, []);

  useEffect(() => {
    getSharedAudioBus().setMasterMuted(muted);
  }, [muted]);

  // a club night on here plays its own music; check each minute, so a
  // night starting (or ending) while you're in the club switches the track
  const [nightTrack, setNightTrack] = useState(() =>
    eventTrack(room, nightClock()),
  );
  useEffect(() => {
    const check = () => setNightTrack(eventTrack(room, nightClock()));
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [room]);

  const submerged = submergedView.use().on;
  const fileLevels = ambienceFor(room, neighborhood, hour, inPark, submerged);
  const hasBed = !!(
    fileLevels["music-boardwalk"] || fileLevels["music-lounge"]
  );
  useEffect(() => {
    if (!unlocked) return;
    const jukebox = getSharedJukeboxController();
    // music sits under the room, not over it
    jukebox.setMusicVolume(0.35);
    // a file music bed stands in for the room's default track
    const track = pick ?? nightTrack ?? (hasBed ? undefined : MUSIC[room]);
    if (track) {
      if (jukebox.getCurrentTrack() !== track || !jukebox.isPlaying())
        jukebox.playTrack(track);
    } else jukebox.stopTrack();
  }, [room, unlocked, pick, nightTrack, hasBed]);

  // the effect re-runs only when a level really changes
  const levelsKey = AMBIENCE_IDS.map((id) =>
    (fileLevels[id] ?? 0).toFixed(3),
  ).join();
  const levelsRef = useRef(fileLevels);
  const keyRef = useRef(levelsKey);
  if (keyRef.current !== levelsKey) {
    keyRef.current = levelsKey;
    levelsRef.current = fileLevels;
  }
  // files that would not play here: their places keep the synthesized bed
  const [failed, setFailed] = useState<ReadonlySet<AmbienceId>>(
    () => new Set(),
  );
  useEffect(() => {
    if (!unlocked) return;
    let live = true;
    void setFileAmbience(levelsRef.current).then((gone) => {
      // the set only grows: a new size is news, the same size is not
      if (live) setFailed((was) => (gone.size === was.size ? was : gone));
    });
    return () => {
      live = false;
    };
  }, [unlocked, levelsKey]);
  // the one-shots this place will want, fetched ahead (after the first gesture)
  useEffect(() => {
    if (unlocked) preloadSounds(soundsFor(room));
  }, [unlocked, room]);
  useEffect(
    () => () => {
      void setFileAmbience({});
    },
    [],
  );
  const bed: Ambience | null = filesCover(fileLevels, failed)
    ? null
    : (AMBIENCE[room] ?? null);
  useEffect(() => {
    if (!unlocked || !bed) return;
    return startAmbience(bed);
  }, [bed, unlocked]);

  return null;
}
