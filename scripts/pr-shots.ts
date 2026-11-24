// Picks which screenshot shots (scripts/screenshots.ts) a pull request should
// attach, from the files it changed. The PR screenshots workflow reads the
// changed files from stdin and gets a space-separated list of shot names:
//
//   gh pr diff 12 --name-only | node --experimental-strip-types scripts/pr-shots.ts
//
// A change to a room's folder shows that room; city, avatar and HUD code
// each show one representative shot. On-demand UI panels, menus and cards
// map to their open shot, falling back to hud-city for unmapped UI.
// Nothing mapped means no screenshots.

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

/**
 * File-level map for UI components, menus, panels, cards and stores under
 * src/client/ui/. Maps filenames or relative paths to their open-state shots.
 */
export const UI_SHOTS: Readonly<Record<string, readonly string[]>> = {
  "ApartmentPanel.tsx": ["apartment"],
  "CardTable.tsx": ["card-table"],
  "CityMap.tsx": ["city-map"],
  "cityMapRequest.ts": ["city-map"],
  "Collections.tsx": ["collections"],
  "CreditsPanel.tsx": ["credits"],
  "DancePicker.tsx": ["dance-picker"],
  "DeliveryApp.tsx": ["plate-rush-app"],
  "Dressing.tsx": ["closet-mirror", "closet-wardrobe"],
  "EventCalendar.tsx": ["event-calendar"],
  "FoodHud.tsx": ["hungry-hud"],
  "GameMenu.tsx": ["menu-ladders", "city-menu"],
  "GraphicsPanel.tsx": ["graphics-menu"],
  "JailHud.tsx": ["jail"],
  "Minigames.tsx": ["minigame-from-world"],
  "MirrorPanel.tsx": ["closet-mirror"],
  "BrowPicker.tsx": ["closet-mirror"],
  "Onboarding.tsx": ["onboarding"],
  "PiercingPanel.tsx": ["piercing"],
  "PrizeCard.tsx": ["prize-card"],
  "prizeDesk.ts": ["prize-card"],
  "Progression.tsx": ["menu-ladders", "rank-up"],
  "ShopPanel.tsx": ["shop-panel"],
  "shopRequest.ts": ["shop-panel"],
  "ShopliftPanel.tsx": ["shoplift-panel"],
  "Streak.tsx": ["streak-panel"],
  "StreakPanel.tsx": ["streak-panel"],
  "WardrobePicker.tsx": ["closet-wardrobe"],
  "WeeklyBoards.tsx": ["weekly-board"],
  "npcDesk.ts": ["npc-returning"],
  "shiftDesk.ts": ["barista-pay-slip"],
};

/**
 * UI components that are part of the base HUD, wrappers, or primitives,
 * and deliberately do not have their own open-panel screenshot shot.
 */
export const UI_ALLOWLIST: ReadonlySet<string> = new Set([
  "ActionDock.tsx",
  "ArrestSequence.tsx",
  "ChatBar.tsx",
  "DebugPanel.tsx",
  "LoadingVeil.tsx",
  "Overlay.tsx",
  "PrideTicker.tsx",
  "ReloadBoundary.tsx",
  "RoomPanels.tsx",
  "UpdatePrompt.tsx",
  "WantedHud.tsx",
  "controls.tsx",
  "icons.tsx",
]);

/** Folders outside rooms/ that each show one representative shot. */
const AREA_SHOTS: readonly (readonly [RegExp, string | readonly string[]])[] = [
  [/^src\/client\/city\/Rain\.tsx$/, "city-boardwalk-rain"],
  [/^src\/client\/city\/wetSurface\.ts$/, "city-neon-rain"],
  [/^src\/(client|game)\/(city|world)\//, "city-day"],
  // the closet's wardrobe pickers and the rules behind them
  [/^src\/game\/closet/, "closet-find"],
  [/^src\/game\/wardrobe/, "closet-wardrobe"],
  // the hunger and thirst HUD
  [/^src\/(game\/food\/needs|client\/food\/)/, "hungry-hud"],
  [/^src\/client\/avatar\//, "plaza"],
  // the game menu's Careers group
  [/^src\/game\/careers/, "careers-menu"],
  // progression rules
  [/^src\/game\/progression\//, ["menu-ladders", "rank-up"]],
  // streak rules
  [/^src\/game\/streak/, "streak-panel"],
  // collections rules
  [/^src\/game\/collections/, "collections"],
  // shop rules
  [/^src\/game\/shop/, "shop-panel"],
  // prizes
  [/^src\/game\/prizes/, "prize-card"],
  // online friends and account panels
  [/^src\/client\/net\/(AccountPanel|FriendsPanel|friends)/, "friends-panel"],
  // the weekly boards in the game menu and the server calls that feed them
  [/^src\/net\/client\/progressSync/, "weekly-board"],
  [/^src\/client\/ui\//, "hud-city"],
  [
    /^src\/(game\/shifts|client\/rooms\/shared\/(Order|order))/,
    "barista-pay-slip",
  ],
];

/** Helpers that construct screenshot shot objects taking a name parameter. */
const SHOT_HELPERS = [
  "actionStrip",
  "firefightStrip",
  "homeShot",
  "jeepneyRoll",
  "lineupShot",
  "petShot",
  "seatStrip",
  "trafficClose",
  "walkStrip",
  "wheelSheet",
] as const;

/** Shot names defined in scripts/screenshots.ts. */
export function knownShots(source: string): string[] {
  const shots = new Set<string>();

  // Literal property declarations: name: "..."
  for (const m of source.matchAll(/\bname:\s*"([a-z0-9-]+)"/g)) {
    if (m[1]) shots.add(m[1]);
  }

  // Helper calls: helper("...")
  const helperPattern = new RegExp(
    `\\b(?:${SHOT_HELPERS.join("|")})\\s*\\(\\s*"([a-z0-9-]+)"`,
    "g",
  );
  for (const m of source.matchAll(helperPattern)) {
    if (m[1]) shots.add(m[1]);
  }

  // Tuple tables mapped to helpers: [["react-flinch", ...], ...].map(([name, ...]) => ...)
  const arrayMapPattern =
    /\[\s*((?:\[\s*"[a-z0-9-]+"[^\]]*\]\s*,\s*)+)\](?:\s*as\s+const)?\s*\)\.map\(\s*(?:async\s*)?\(\s*\[\s*name/g;
  for (const match of source.matchAll(arrayMapPattern)) {
    const block = match[1] ?? "";
    for (const item of block.matchAll(/\[\s*"([a-z0-9-]+)"/g)) {
      if (item[1]) shots.add(item[1]);
    }
  }

  // Emote actionStrip mapped template: emote-${... ? "whisper" : "laugh"}
  if (source.includes('`emote-${emote === "Whisper" ? "whisper" : "laugh"}`')) {
    shots.add("emote-whisper");
    shots.add("emote-laugh");
  }

  return [...shots];
}

/** The shots to attach for these changed files, deduplicated and capped. */
export function pickShots(
  files: readonly string[],
  known: readonly string[],
): string[] {
  const picked = new Set<string>();
  const addShots = (shotOrShots: string | readonly string[] | undefined) => {
    if (!shotOrShots) return;
    const list = typeof shotOrShots === "string" ? [shotOrShots] : shotOrShots;
    for (const s of list) {
      if (known.includes(s)) picked.add(s);
    }
  };

  for (const file of files.map((f) => f.trim())) {
    const uiMatch = /^src\/client\/ui\/(.+)$/.exec(file);
    if (uiMatch?.[1]) {
      const rel = uiMatch[1];
      const base = rel.split("/").pop() ?? "";
      const shots = UI_SHOTS[rel] ?? UI_SHOTS[base];
      if (shots) {
        addShots(shots);
        continue;
      }
    }
    const dir = /^src\/client\/rooms\/([^/]+)\//.exec(file)?.[1];
    // area patterns first: rooms/shared holds code no single room owns
    const match = AREA_SHOTS.find(([re]) => re.test(file))?.[1];
    if (match) {
      addShots(match);
    } else if (dir) {
      addShots(ROOM_SHOT_ALIASES[dir] ?? dir);
    }
  }
  return [...picked].slice(0, MAX_SHOTS);
}

if (import.meta.main) {
  const files = readFileSync(0, "utf8").split("\n");
  const known = knownShots(readFileSync("scripts/screenshots.ts", "utf8"));
  console.log(pickShots(files, known).join(" "));
}
