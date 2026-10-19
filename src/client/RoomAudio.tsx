import { useEffect, useState } from "react";
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
import type { RoomId } from "../game/rooms.ts";
import { useNeighborhood } from "./city/here.ts";
import { musicPick } from "./musicPick.ts";

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
  "video-store": "player-two-chiptune",
  "halo-halo-cafe": "canopy-lofi",
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
  const picked = musicPick.use().track;
  // a record on at the shop or the record player at home wins
  const pick = room === "vinyl-vault" || room === "apartment" ? picked : null;

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

  useEffect(() => {
    if (!unlocked) return;
    const jukebox = getSharedJukeboxController();
    // music sits under the room, not over it
    jukebox.setMusicVolume(0.35);
    const track = pick ?? MUSIC[room];
    if (track) {
      if (jukebox.getCurrentTrack() !== track || !jukebox.isPlaying())
        jukebox.playTrack(track);
    } else jukebox.stopTrack();
  }, [room, unlocked, pick]);

  const bed: Ambience | null =
    room === "city"
      ? neighborhood === "beachside"
        ? "beach"
        : "city"
      : (AMBIENCE[room] ?? null);
  useEffect(() => {
    if (!unlocked || !bed) return;
    return startAmbience(bed);
  }, [bed, unlocked]);

  return null;
}
