// Picks which screenshot shots (scripts/screenshots.ts) a pull request should
// attach, from the files it changed. The PR screenshots workflow reads the
// changed files from stdin and gets a space-separated list of shot names:
//
//   gh pr diff 12 --name-only | node --experimental-strip-types scripts/pr-shots.ts
//
// A change to a room's folder shows that room; city, avatar and HUD code
// each show one representative shot. Nothing mapped means no screenshots.

import { readFileSync } from "node:fs";

/** Most shots a PR attaches: each one costs minutes on the CPU renderer. */
const MAX_SHOTS = 6;

/** Room folders whose shot has a different name (folder -> shot). */
const ROOM_SHOT_ALIASES: Readonly<Record<string, string>> = {
  amusementpark: "amusement-park-wide",
  arcadebar: "arcade-bar",
  backroom: "back-room",
  boardwalk: "city-boardwalk",
  cove: "mermaid-cove",
  haunted: "haunted-house",
  icerink: "ice-rink",
  kamayan: "kamayan-hall",
  lanoche: "la-noche",
  lasertag: "laser-tag",
  minigolf: "mini-golf",
  ocean: "open-water",
  pottery: "clay-day",
  pulse: "club-pulse",
  range: "driving-range",
  rooftop: "rooftop-bar",
  speedway: "speedway-grid",
  studio: "music-studio",
  sugarrush: "sugar-rush",
  surf: "surf-shack",
  velvet: "velvet-room",
  waterpark: "water-park-wide",
};

/** Folders outside rooms/ that each show one representative shot. */
const AREA_SHOTS: readonly (readonly [RegExp, string])[] = [
  [/^src\/(client|game)\/(city|world)\//, "city-day"],
  // the closet's wardrobe pickers and the rules behind them
  [
    /^src\/(client\/ui\/(WardrobePicker|MirrorPanel)|game\/wardrobe)/,
    "closet-wardrobe",
  ],
  // the hunger and thirst HUD
  [
    /^src\/(game\/food\/needs|client\/food\/|client\/ui\/phone\/FoodHud)/,
    "hungry-hud",
  ],
  [/^src\/client\/avatar\//, "plaza"],
  // the game menu's Careers group
  [/^src\/(game\/careers|client\/ui\/Progression)/, "careers-menu"],
  [/^src\/client\/ui\//, "hud-city"],
  [
    /^src\/(game\/shifts|client\/rooms\/shared\/(Order|order))/,
    "barista-pay-slip",
  ],
];

/** Shot names defined in scripts/screenshots.ts (`name: "plaza"` entries). */
export function knownShots(source: string): string[] {
  return [...source.matchAll(/\bname: "([a-z0-9-]+)"/g)].map((m) => m[1] ?? "");
}

/** The shots to attach for these changed files, deduplicated and capped. */
export function pickShots(
  files: readonly string[],
  known: readonly string[],
): string[] {
  const picked = new Set<string>();
  for (const file of files.map((f) => f.trim())) {
    const dir = /^src\/client\/rooms\/([^/]+)\//.exec(file)?.[1];
    // area patterns first: rooms/shared holds code no single room owns
    const shot =
      AREA_SHOTS.find(([re]) => re.test(file))?.[1] ??
      (dir ? (ROOM_SHOT_ALIASES[dir] ?? dir) : undefined);
    if (shot && known.includes(shot)) picked.add(shot);
  }
  return [...picked].slice(0, MAX_SHOTS);
}

if (import.meta.main) {
  const files = readFileSync(0, "utf8").split("\n");
  const known = knownShots(readFileSync("scripts/screenshots.ts", "utf8"));
  console.log(pickShots(files, known).join(" "));
}
