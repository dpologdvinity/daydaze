// Your pet: adopted at the Zoo's adoption corner, it follows you through the
// city and the rooms and sleeps at your apartment. This file is the pure
// side: the saved record and its validation, how happy it is, and the
// follower's rules (how far to stay, when to walk, run, sit or wait). The
// client's PetFollower draws it with the Creature component.

import type { Vec2 } from "./walk.ts";

export const PET_KINDS = ["husky", "shibainu", "cat", "rabbit"] as const;
export type PetKind = (typeof PET_KINDS)[number];

export const PET_LABEL: Record<PetKind, string> = {
  husky: "Husky",
  shibainu: "Shiba Inu",
  cat: "Cat",
  rabbit: "Rabbit",
};

/** What a pet saves: which animal, what you call it and when it last ate. */
export type PetSave = {
  kind: PetKind;
  name: string;
  /** Date.now() when adopted and when last fed. */
  adoptedAt: number;
  fedAt: number;
};

const isKind = (v: unknown): v is PetKind =>
  typeof v === "string" && (PET_KINDS as readonly string[]).includes(v);

/** The same ASCII-only rule as display names (save.ts), 2-16 characters. */
export const isValidPetName = (name: unknown): name is string =>
  typeof name === "string" &&
  /^[A-Za-z0-9 _-]{2,16}$/.test(name) &&
  name.trim() === name;

const isTime = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** A pet from stored or network JSON, or null (no pet) when it isn't one. */
export function validatePet(value: unknown): PetSave | null {
  if (typeof value !== "object" || value === null) return null;
  const { kind, name, adoptedAt, fedAt } = value as Record<string, unknown>;
  if (!isKind(kind) || !isValidPetName(name) || !isTime(adoptedAt)) return null;
  return { kind, name, adoptedAt, fedAt: isTime(fedAt) ? fedAt : adoptedAt };
}

/** A new pet, or null when the name isn't allowed. */
export function adopt(
  kind: PetKind,
  name: string,
  now: number,
): PetSave | null {
  const trimmed = name.trim();
  return isValidPetName(trimmed)
    ? { kind, name: trimmed, adoptedAt: now, fedAt: now }
    : null;
}

/** Hunger: a full pet is 100 and loses a point every 6 minutes, to 10. */
const MS_PER_POINT = 6 * 60_000;
export const happiness = (pet: PetSave, now: number): number =>
  Math.max(10, Math.round(100 - (now - pet.fedAt) / MS_PER_POINT));

export type PetMood = "happy" | "fine" | "hungry";
export const moodOf = (pet: PetSave, now: number): PetMood => {
  const h = happiness(pet, now);
  return h > 66 ? "happy" : h > 33 ? "fine" : "hungry";
};

/** A treat only helps when it is hungry enough to want one. */
export const FEED_AFTER = 60_000;
export const canFeed = (pet: PetSave, now: number): boolean =>
  now - pet.fedAt >= FEED_AFTER;
export const feed = (pet: PetSave, now: number): PetSave =>
  canFeed(pet, now) ? { ...pet, fedAt: now } : pet;

// --- following ---------------------------------------------------------

export type PetClip = "idle" | "walk" | "run" | "sit" | "sleep";

/** Where the pet is, and what it is doing. */
export type Follower = { x: number; z: number; yaw: number; clip: PetClip };

/** How far (meters) the pet likes to stay, when it walks, runs, gives up. */
export const STAY = 1.6;
export const WALK_FROM = 2.6;
export const RUN_FROM = 6;
export const TELEPORT_FROM = 16;
/** Never closer than this to you: it steps aside rather than through you. */
export const PERSONAL_SPACE = 0.9;
const WALK_SPEED = 1.5;
const RUN_SPEED = 4.2;
const TURN = 7;

const angleTo = (cur: number, goal: number, step: number) => {
  const d = Math.atan2(Math.sin(goal - cur), Math.cos(goal - cur));
  return Math.abs(d) <= step ? goal : cur + Math.sign(d) * step;
};

/**
 * Moves `pet` toward its place beside `you` for `dt` seconds. The place is
 * STAY meters to your right-behind (the pet trails on one side so it never
 * stands in your way). `seated` makes it sit once it has come close.
 * `blocked` says whether a spot is a wall, and the pet then stays put.
 * Returns the pet's next state; allocates one small object.
 */
export function followStep(
  pet: Follower,
  you: { x: number; z: number; yaw: number },
  dt: number,
  seated: boolean,
  blocked: (at: Vec2) => boolean,
): Follower {
  const dx = you.x - pet.x;
  const dz = you.z - pet.z;
  const dist = Math.hypot(dx, dz);
  if (dist > TELEPORT_FROM) {
    return placeBeside(you);
  }
  // the spot beside you: STAY behind and to the right of where you face
  const goal: Vec2 = [
    you.x + Math.sin(you.yaw + 2.5) * STAY,
    you.z + Math.cos(you.yaw + 2.5) * STAY,
  ];
  const gx = goal[0] - pet.x;
  const gz = goal[1] - pet.z;
  const toGoal = Math.hypot(gx, gz);
  const lookAtYou = Math.atan2(dx, dz);
  // close to you and it is not walking: sit when you do, otherwise stand
  if (dist < WALK_FROM && toGoal < 0.5) {
    return {
      x: pet.x,
      z: pet.z,
      yaw: angleTo(pet.yaw, lookAtYou, TURN * dt),
      clip: seated ? "sit" : "idle",
    };
  }
  const run = dist > RUN_FROM;
  const step = Math.min(toGoal, (run ? RUN_SPEED : WALK_SPEED) * dt);
  let nx = pet.x + (gx / Math.max(toGoal, 1e-6)) * step;
  let nz = pet.z + (gz / Math.max(toGoal, 1e-6)) * step;
  // never through you: if the step lands inside your personal space, stop
  if (Math.hypot(you.x - nx, you.z - nz) < PERSONAL_SPACE) {
    nx = pet.x;
    nz = pet.z;
  }
  if (blocked([nx, nz])) {
    nx = pet.x;
    nz = pet.z;
  }
  const moved = Math.hypot(nx - pet.x, nz - pet.z) > 1e-6;
  return {
    x: nx,
    z: nz,
    yaw: angleTo(pet.yaw, moved ? Math.atan2(gx, gz) : lookAtYou, TURN * dt),
    clip: moved ? (run ? "run" : "walk") : seated ? "sit" : "idle",
  };
}

/** The pet beside you, just arrived (a new room, or left far behind). */
export function placeBeside(you: {
  x: number;
  z: number;
  yaw: number;
}): Follower {
  return {
    x: you.x + Math.sin(you.yaw + 2.5) * STAY,
    z: you.z + Math.cos(you.yaw + 2.5) * STAY,
    yaw: you.yaw,
    clip: "idle",
  };
}

/** Where the pet sleeps in your apartment, and how near you can come before
 * it wakes and sits up. */
export const WAKE_RANGE = 2.5;
export const sleeping = (
  pet: Follower,
  you: { x: number; z: number },
  rest: Vec2,
) =>
  Math.hypot(you.x - rest[0], you.z - rest[1]) > WAKE_RANGE
    ? ({ x: rest[0], z: rest[1], yaw: pet.yaw, clip: "sleep" } as const)
    : ({
        x: rest[0],
        z: rest[1],
        yaw: Math.atan2(you.x - rest[0], you.z - rest[1]),
        clip: "sit",
      } as const);
