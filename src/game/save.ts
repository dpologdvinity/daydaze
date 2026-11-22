// The local save: its shape (version 1, extended with defaulted fields), the
// localStorage key, and a loader that salvages every valid field from any
// stored JSON so a corrupt or older save never loses the rest. Also
// display-name rules and random guest names.

import { cleanPot, type FiredPot } from "./pottery.ts";
import { cleanSets, cleanVisited } from "./collections.ts";
import { cleanFarm, createDefaultFarm, type FarmSave } from "./farm.ts";
import { validateBouquet, type Bouquet } from "./florist.ts";
import { cleanGarden, createDefaultGarden, type GardenSave } from "./garden.ts";
import { cleanGiftDay, cleanInventory, type Inventory } from "./inventory.ts";
import type { RoomId } from "./rooms.ts";
import { isIntensity, type Intensity } from "./effects/buzz.ts";
import {
  DEFAULT_CRIME,
  validateCrime,
  type CrimeSave,
} from "./crime/record.ts";
import { DEFAULT_HOME, validateHome, type HomeSave } from "./home/home.ts";
import { DEFAULT_JAIL, validateJail, type JailSave } from "./jail/jail.ts";
import {
  DEFAULT_LOOK,
  DEFAULT_SWIM,
  validateLook,
  validateSwim,
  type Look,
  type SwimLook,
} from "./look.ts";
import { cleanBody, DEFAULT_BODY, type BodyShape } from "./body.ts";
import {
  cleanChallenges,
  NO_CHALLENGES,
  type ChallengeSave,
} from "./challenges.ts";
import { cleanShifts, NO_SHIFTS, type ShiftsSave } from "./shifts.ts";
import { cleanStreak, NO_STREAK, type StreakSave } from "./streakSave.ts";
import { cleanBests, type Bests } from "./prizes.ts";
import { cleanNpcMemories, type NpcMemories } from "./npcMemory.ts";
import { validatePet, type PetSave } from "./pet.ts";
import { cleanParkedCar, type ParkedCar } from "./city/drive.ts";
import { cleanGarage, STARTER } from "./garage.ts";
import { cleanGraphics, defaultGraphics, type Graphics } from "./graphics.ts";
import { cleanRecords, type RecordId } from "./records.ts";
import { cleanWardrobe, unlockedLook } from "./shop.ts";
import { isCoins, STARTING_COINS } from "./wallet.ts";
import {
  cleanProgression,
  freshProgression,
  type Progression,
} from "./progression/progression.ts";

/** Everything a player keeps between sessions. */
export type SaveV1 = {
  version: 1;
  name: string;
  look: Look;
  swim: SwimLook;
  coins: number;
  /** Shop items the player owns; unowned shop looks are never worn. */
  wardrobe: string[];
  body: BodyShape;
  settings: {
    /** The Graphics menu: a preset or custom switches (graphics.ts). */
    graphics: Graphics;
    muted: boolean;
    effects: Intensity;
    /** The dressing-room drawer; closed on a new save. */
    panelOpen: boolean;
    /** Mask swearing in others' chat too, not just slurs. */
    strictChat: boolean;
    /** Subtle reverb bloom and low-pass filter on music while high in music venues. */
    highAudio: boolean;
  };
  // Added after v1 shipped: older saves load with these defaults.
  home: HomeSave;
  jail: JailSave;
  crime: CrimeSave;
  /** Each game's personal best. */
  bests: Bests;
  /** Today's challenges already reached. */
  challenges: ChallengeSave;
  progression: Progression;
  /** Your car where you last parked it; null waits at the home spot. */
  car: ParkedCar | null;
  /** The road cars you own; the starter always. */
  garage: string[];
  /** Records bought at Vinyl Vault, for the record player at home. */
  records: RecordId[];
  /** Whether the first-visit walkthrough has been finished or skipped. */
  onboarded: boolean;
  /** The album: every place you've been, in the order you first went. */
  visited: RoomId[];
  /** Closet sets whose reward you've claimed (collections.ts). */
  sets: string[];
  /** The pet adopted at the Zoo, or null (pet.ts). */
  pet: PetSave | null;
  /** Sunny Acres Farm plot state, harvested produce and animal interactions. */
  farm: FarmSave;
  /** Latest fired Clay Day piece, displayed at home. */
  pottery: FiredPot | null;
  bouquet: Bouquet | null;
  /** Suburbia Community Garden plot state and produce inventory. */
  garden: GardenSave;
  /** The weed pouch (inventory.ts); kept at 13+ too, but only used at 18+. */
  inventory: Inventory;
  /** The day (challenges.ts `dayOf`) the friend's free item was last taken. */
  giftDay: number;
  /** The daily streak (streak.ts); saves from before it start with none. */
  streak: StreakSave;
  /** Paid shifts worked (shifts.ts); saves from before jobs start with none. */
  shifts: ShiftsSave;
  /** What recurring NPCs remember of you (npcMemory.ts); none before it. */
  npcs: NpcMemories;
};

/** The localStorage key the save lives under. */
export const SAVE_KEY = "daydaze-save-v1";

/**
 * A fresh save for a new player named `name`, with fresh copies of every
 * default (nothing shared).
 */
export function createDefaultSave(name: string): SaveV1 {
  return {
    version: 1,
    name,
    look: { ...DEFAULT_LOOK },
    swim: { ...DEFAULT_SWIM },
    coins: STARTING_COINS,
    wardrobe: [],
    body: { ...DEFAULT_BODY },
    settings: {
      graphics: defaultGraphics(),
      muted: false,
      effects: "full",
      strictChat: false,
      panelOpen: false,
      highAudio: true,
    },
    home: { ...DEFAULT_HOME, furniture: [] },
    jail: { ...DEFAULT_JAIL },
    crime: { ...DEFAULT_CRIME, bans: {}, stolen: {} },
    bests: {},
    challenges: { ...NO_CHALLENGES, done: [] },
    progression: freshProgression(),
    streak: { ...NO_STREAK, days: [], frozen: [] },
    shifts: { ...NO_SHIFTS, worked: {} },
    car: null,
    garage: [STARTER],
    records: [],
    onboarded: false,
    visited: [],
    sets: [],
    pet: null,
    farm: createDefaultFarm(),
    pottery: null,
    bouquet: null,
    garden: createDefaultGarden(),
    inventory: {},
    giftDay: 0,
    npcs: {},
  };
}

function fieldsOf(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}

/**
 * Parses stored save JSON, keeping each field that validates and defaulting the
 * rest. Null or unparseable input gives a default save named `fallbackName`;
 * worn shop items the wardrobe does not own are taken off.
 */
export function loadSave(raw: string | null, fallbackName: string): SaveV1 {
  let parsed: unknown = null;
  try {
    parsed = raw === null ? null : JSON.parse(raw);
  } catch {
    // Corrupt storage falls through to the defaults below.
  }
  // Any version is salvaged field by field: a valid name or look survives.
  const save = fieldsOf(parsed);
  const settings = fieldsOf(save.get("settings"));
  const name = save.get("name");
  const look = save.get("look");
  const swim = save.get("swim");
  const coins = save.get("coins");
  const bouquet = save.get("bouquet");
  const wardrobe = cleanWardrobe(save.get("wardrobe"));
  const garage = cleanGarage(save.get("garage"));
  // saves from before the Graphics menu hold a plain auto/high/low `quality`
  const graphics = cleanGraphics(
    settings.get("graphics"),
    settings.get("quality"),
  );
  const muted = settings.get("muted");
  const effects = settings.get("effects");
  const panelOpen = settings.get("panelOpen");
  const strictChat = settings.get("strictChat");
  const highAudio = settings.get("highAudio");
  const defaults = createDefaultSave(
    isValidDisplayName(name) ? name : fallbackName,
  );
  return {
    ...defaults,
    look: validateLook(look) ? unlockedLook(look, wardrobe) : defaults.look,
    // saves from before the Water Park have no swimsuit slot yet
    swim: validateSwim(swim) ? { ...swim } : defaults.swim,
    // saves from before the economy start with the starting coins
    coins: isCoins(coins) ? coins : defaults.coins,
    wardrobe,
    body: cleanBody(save.get("body")),
    settings: {
      graphics,
      muted: typeof muted === "boolean" ? muted : defaults.settings.muted,
      // saves from before the drunk effects have no effects field yet
      effects: isIntensity(effects) ? effects : defaults.settings.effects,
      // saves from before the dressing-room drawer have no panelOpen field yet
      panelOpen:
        typeof panelOpen === "boolean"
          ? panelOpen
          : defaults.settings.panelOpen,
      strictChat:
        typeof strictChat === "boolean"
          ? strictChat
          : defaults.settings.strictChat,
      highAudio:
        typeof highAudio === "boolean"
          ? highAudio
          : defaults.settings.highAudio,
    },
    home: validateHome(save.get("home")),
    jail: validateJail(save.get("jail")),
    crime: validateCrime(save.get("crime")),
    bests: cleanBests(save.get("bests")),
    challenges: cleanChallenges(save.get("challenges")),
    progression: cleanProgression(save.get("progression")),
    car: cleanParkedCar(save.get("car"), (id) => garage.includes(id)),
    garage,
    records: cleanRecords(save.get("records")),
    // a save from before onboarding belongs to someone who already knows
    // their way around; only a brand-new player gets the walkthrough
    onboarded:
      typeof save.get("onboarded") === "boolean"
        ? save.get("onboarded") === true
        : save.size > 0,
    visited: cleanVisited(save.get("visited")),
    sets: cleanSets(save.get("sets")),
    pet: validatePet(save.get("pet")),
    farm: cleanFarm(save.get("farm")),
    pottery: cleanPot(save.get("pottery")),
    bouquet: validateBouquet(bouquet) ? bouquet : null,
    garden: cleanGarden(save.get("garden")),
    inventory: cleanInventory(save.get("inventory")),
    giftDay: cleanGiftDay(save.get("giftDay")),
    streak: cleanStreak(save.get("streak")),
    shifts: cleanShifts(save.get("shifts")),
    npcs: cleanNpcMemories(save.get("npcs")),
  };
}

/** The save as JSON for localStorage. */
export function serializeSave(save: SaveV1): string {
  return JSON.stringify(save);
}

/**
 * Whether a name is 2-16 ASCII letters, digits, spaces, underscores or hyphens,
 * with no leading or trailing space.
 */
export function isValidDisplayName(name: unknown): name is string {
  // ASCII only, so look-alike letters cannot impersonate other players.
  return (
    typeof name === "string" &&
    /^[A-Za-z0-9 _-]{2,16}$/.test(name) &&
    name.trim() === name
  );
}

const GUEST_ADJECTIVES = [
  "Mango",
  "Juicy",
  "Golden",
  "Sunny",
  "Tangy",
  "Peachy",
  "Velvet",
  "Glossy",
] as const;

const GUEST_NOUNS = [
  "Guest",
  "Bloom",
  "Slice",
  "Nectar",
  "Grove",
  "Breeze",
] as const;

// Clamps out-of-range or NaN randoms so the name is always valid.
function pick(random: () => number, count: number): number {
  const index = Math.floor(random() * count);
  return index > 0 ? Math.min(index, count - 1) : 0;
}

/** A random guest name like "PeachyBloom4821", always a valid display name. */
export function generateGuestName(random: () => number): string {
  const adjective = GUEST_ADJECTIVES[pick(random, GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[pick(random, GUEST_NOUNS.length)];
  return `${adjective}${noun}${1000 + pick(random, 9000)}`;
}
