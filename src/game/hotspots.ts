// Minigame hotspots: floor spots in a room that open a 2D minigame over the
// world. Tapping the spot and the keyboard button both launch the same game.
import type { RoomId } from "./rooms.ts";
import type { Vec2 } from "./walk.ts";
import { DECKS_SPOT } from "./warehouse.ts";

export const MINIGAME_IDS = [
  "bassline",
  "last-call",
  "midway",
  "gem-glam",
] as const;

export type MinigameId = (typeof MINIGAME_IDS)[number];

export type Hotspot = {
  id: string;
  room: RoomId;
  game: MinigameId;
  /** The keyboard button's label and the spot's tooltip. */
  label: string;
  position: Vec2;
  radius: number;
};

export const HOTSPOTS: readonly Hotspot[] = [
  {
    // In front of the DJ booth, on the dance floor's back edge.
    id: "pulse-decks",
    room: "pulse",
    game: "bassline",
    label: "Play Bassline at the DJ booth",
    position: [0, -2.8],
    radius: 1,
  },
  {
    // In front of the bar counter, under the velvet arch.
    id: "velvet-bar",
    room: "velvet-room",
    game: "last-call",
    label: "Play Last Call at the bar",
    position: [-1, -3.1],
    radius: 0.9,
  },
  {
    // In front of the shipping container the DJ plays from.
    id: "warehouse-decks",
    room: "warehouse",
    game: "bassline",
    label: "Play Bassline at the decks",
    position: DECKS_SPOT,
    radius: 0.9,
  },
  {
    // At the Skylark's bar, past the last stool.
    id: "skylark-bar",
    room: "rooftop-bar",
    game: "last-call",
    label: "Play Last Call at the bar",
    position: [2.6, -3.5],
    radius: 0.8,
  },
  {
    // In front of the STEP RIGHT UP booth on the midway's west side.
    id: "carnival-midway",
    room: "amusement-park",
    game: "midway",
    label: "Play the midway games",
    position: [-8.3, 1.4],
    radius: 1,
  },
  {
    // At the Arcade's door, the first storefront on the strip's west end.
    id: "plaza-arcade",
    room: "plaza",
    game: "gem-glam",
    label: "Play Gem Glam at the arcade",
    position: [-10.1, -6],
    radius: 0.9,
  },
];

export function hotspotsIn(room: RoomId): readonly Hotspot[] {
  return HOTSPOTS.filter((spot) => spot.room === room);
}
