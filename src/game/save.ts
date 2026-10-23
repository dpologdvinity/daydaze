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
import { cleanBests, type Bests } from "./prizes.ts";
import { cleanParkedCar, type ParkedCar } from "./city/drive.ts";
import { cleanGarage, STARTER } from "./garage.ts";
import { cleanRecords, type RecordId } from "./records.ts";
import { cleanWardrobe, unlockedLook } from "./shop.ts";
import { isCoins, STARTING_COINS } from "./wallet.ts";

export type Quality = "auto" | "high" | "low";

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
    quality: Quality;
    muted: boolean;
    effects: Intensity;
    /** The dressing-room drawer; closed on a new save. */
    panelOpen: boolean;
    /** Mask swearing in others' chat too, not just slurs. */
    strictChat: boolean;
  };
  // Added after v1 shipped: older saves load with these defaults.
  home: HomeSave;
  jail: JailSave;
  crime: CrimeSave;
  /** Each game's personal best. */
  bests: Bests;
  /** Today's challenges already reached. */
  challenges: ChallengeSave;
  /** Your car where you last parked it; null waits at the home spot. */
  car: ParkedCar | null;
  /** The road cars you own; the starter always. */
  garage: string[];
  /** Records bought at Vinyl Vault, for the record player at home. */
  records: RecordId[];
};

export const SAVE_KEY = "daydaze-save-v1";

const QUALITIES: readonly unknown[] = [
  "auto",
  "high",
  "low",
] satisfies Quality[];

function isQuality(value: unknown): value is Quality {
  return QUALITIES.includes(value);
}

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
      quality: "auto",
      muted: false,
      effects: "full",
      strictChat: false,
      panelOpen: false,
    },
    home: { ...DEFAULT_HOME, furniture: [] },
    jail: { ...DEFAULT_JAIL },
    crime: { ...DEFAULT_CRIME, bans: {}, stolen: {} },
    bests: {},
    challenges: { ...NO_CHALLENGES, done: [] },
    car: null,
    garage: [STARTER],
    records: [],
  };
}

function fieldsOf(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}

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
  const wardrobe = cleanWardrobe(save.get("wardrobe"));
  const garage = cleanGarage(save.get("garage"));
  const quality = settings.get("quality");
  const muted = settings.get("muted");
  const effects = settings.get("effects");
  const panelOpen = settings.get("panelOpen");
  const strictChat = settings.get("strictChat");
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
      quality: isQuality(quality) ? quality : defaults.settings.quality,
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
    },
    home: validateHome(save.get("home")),
    jail: validateJail(save.get("jail")),
    crime: validateCrime(save.get("crime")),
    bests: cleanBests(save.get("bests")),
    challenges: cleanChallenges(save.get("challenges")),
    car: cleanParkedCar(save.get("car"), (id) => garage.includes(id)),
    garage,
    records: cleanRecords(save.get("records")),
  };
}

export function serializeSave(save: SaveV1): string {
  return JSON.stringify(save);
}

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

export function generateGuestName(random: () => number): string {
  const adjective = GUEST_ADJECTIVES[pick(random, GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[pick(random, GUEST_NOUNS.length)];
  return `${adjective}${noun}${1000 + pick(random, 9000)}`;
}
