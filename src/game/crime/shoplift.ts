// Shoplifting as a stealth beat: each beat, watchers either face the floor or
// not, and the player's action decides whether a facing watcher spots them.
// Deterministic, so the same moves always give the same result.

export type Difficulty = "easy" | "medium" | "hard";
export type Consequence = "warning" | "fine" | "jail";

export type Watcher = {
  kind: "cashier" | "guard" | "camera";
  /** Beats per full sweep. */
  period: number;
  /** Beats of each sweep that face the floor. */
  cone: number;
  phase: number;
};

export type Store = {
  id: string;
  name: string;
  difficulty: Difficulty;
  consequence: Consequence;
  /** Share of crowd cover, 0 (empty) to 1 (packed). */
  crowd: number;
  tagAlarm: boolean;
  watchers: readonly Watcher[];
};

const cashier: Watcher = { kind: "cashier", period: 6, cone: 2, phase: 0 };

export const STORES: readonly Store[] = [
  {
    id: "bodega",
    name: "Corner Bodega",
    difficulty: "easy",
    consequence: "warning",
    crowd: 0.2,
    tagAlarm: false,
    watchers: [cashier],
  },
  {
    id: "flea-market",
    name: "Flea Market Stall",
    difficulty: "easy",
    consequence: "warning",
    crowd: 0.5,
    tagAlarm: false,
    watchers: [{ kind: "cashier", period: 8, cone: 2, phase: 1 }],
  },
  {
    id: "thrift-store",
    name: "Thrift Store",
    difficulty: "easy",
    consequence: "warning",
    crowd: 0.1,
    tagAlarm: false,
    watchers: [{ kind: "cashier", period: 6, cone: 1, phase: 2 }],
  },
  {
    id: "supermarket",
    name: "Supermarket",
    difficulty: "medium",
    consequence: "fine",
    crowd: 0.3,
    tagAlarm: false,
    watchers: [
      { kind: "camera", period: 4, cone: 1, phase: 0 },
      { kind: "guard", period: 6, cone: 2, phase: 3 },
    ],
  },
  {
    id: "drugstore",
    name: "Drugstore Chain",
    difficulty: "medium",
    consequence: "fine",
    crowd: 0.2,
    tagAlarm: false,
    watchers: [
      { kind: "camera", period: 5, cone: 1, phase: 1 },
      { kind: "cashier", period: 6, cone: 2, phase: 4 },
    ],
  },
  {
    id: "mall",
    name: "Mall Chain Store",
    difficulty: "medium",
    consequence: "fine",
    crowd: 0.4,
    tagAlarm: true,
    watchers: [
      { kind: "camera", period: 4, cone: 1, phase: 0 },
      { kind: "guard", period: 6, cone: 2, phase: 3 },
    ],
  },
  {
    id: "jewelry",
    name: "Jewelry Counter",
    difficulty: "hard",
    consequence: "jail",
    crowd: 0,
    tagAlarm: true,
    watchers: [
      { kind: "guard", period: 4, cone: 2, phase: 0 },
      { kind: "guard", period: 4, cone: 2, phase: 2 },
      { kind: "camera", period: 3, cone: 1, phase: 1 },
    ],
  },
  {
    id: "designer-boutique",
    name: "Designer Boutique",
    difficulty: "hard",
    consequence: "jail",
    crowd: 0.1,
    tagAlarm: true,
    watchers: [
      { kind: "guard", period: 4, cone: 2, phase: 0 },
      { kind: "guard", period: 4, cone: 2, phase: 2 },
      { kind: "camera", period: 3, cone: 1, phase: 1 },
    ],
  },
  {
    id: "electronics",
    name: "Electronics Store",
    difficulty: "hard",
    consequence: "jail",
    crowd: 0,
    tagAlarm: true,
    watchers: [
      { kind: "guard", period: 4, cone: 2, phase: 1 },
      { kind: "camera", period: 2, cone: 1, phase: 0 },
      { kind: "camera", period: 2, cone: 1, phase: 1 },
    ],
  },
];

export type Action = "browse" | "pocket" | "run" | "walk-out";

export type Stealth = {
  beat: number;
  suspicion: number;
  pocketed: boolean;
  outcome: "playing" | "escaped" | "stopped" | "left";
};

export const SUSPICION_MAX = 100;
const SPOT_PER_WATCHER = 50;
const RUN_SUSPICION = 30;
const TAG_ALARM_SUSPICION = 60;
const COOL_OFF_PER_BEAT = 5;

export const START: Stealth = {
  beat: 0,
  suspicion: 0,
  pocketed: false,
  outcome: "playing",
};

export const isWatching = (w: Watcher, beat: number) =>
  (beat + w.phase) % w.period < w.cone;

export function watchersFacing(store: Store, beat: number): number {
  return store.watchers.filter((w) => isWatching(w, beat)).length;
}

// One beat of play. Returns a new state; the store decides who is watching.
export function stepStealth(
  store: Store,
  state: Stealth,
  action: Action,
): Stealth {
  if (state.outcome !== "playing") return state;
  const facing = watchersFacing(store, state.beat);
  const next = { ...state, beat: state.beat + 1 };
  const spotting = facing * SPOT_PER_WATCHER * (1 - store.crowd);
  let suspicion = Math.max(0, state.suspicion - COOL_OFF_PER_BEAT);

  if (action === "browse") {
    // Looking at the shelves is normal, so it draws no attention.
  } else if (action === "pocket") {
    next.pocketed = true;
    suspicion += spotting;
  } else if (action === "run") {
    suspicion += RUN_SUSPICION;
  } else {
    // walk-out ends the attempt at the door.
    if (store.tagAlarm && state.pocketed) suspicion += TAG_ALARM_SUSPICION;
    const outcome =
      suspicion >= SUSPICION_MAX
        ? "stopped"
        : state.pocketed
          ? "escaped"
          : "left";
    return { ...next, suspicion: Math.min(suspicion, SUSPICION_MAX), outcome };
  }

  next.suspicion = Math.min(suspicion, SUSPICION_MAX);
  if (next.suspicion >= SUSPICION_MAX) next.outcome = "stopped";
  return next;
}

export type Penalty =
  | { kind: "warning"; banMs: number }
  | { kind: "fine"; coins: number }
  | { kind: "jail"; minutes: number };

const DAY_MS = 86_400_000;
const MIN_FINE = 10;
const MAX_JAIL_MINUTES = 15;

// Penalty by store consequence and item price. Each earlier offence raises it.
export function penaltyFor(
  store: Store,
  price: number,
  priorOffences: number,
): Penalty {
  if (store.consequence === "warning") {
    return { kind: "warning", banMs: DAY_MS * (1 + priorOffences) };
  }
  if (store.consequence === "fine") {
    const coins = Math.max(MIN_FINE, Math.round(price * 0.5));
    return { kind: "fine", coins: coins * (1 + priorOffences) };
  }
  const minutes = 2 + Math.floor(price / 200) + 2 * priorOffences;
  return { kind: "jail", minutes: Math.min(MAX_JAIL_MINUTES, minutes) };
}
