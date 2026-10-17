// The fireworks over Beachside: a show over the sea every few minutes, a
// shell every second or so, and a finale that fires them three at a time.
// Pure and deterministic on the clock, so every player sees the same show.

/** Seconds from one show's start to the next. */
export const SHOW_EVERY = 240;
export const SHOW_LENGTH = 70;
/** The last seconds of a show, when shells go up in threes. */
export const FINALE = 12;
export const SHELL_EVERY = 1.3;
/** Seconds a shell climbs, then seconds its stars burn. */
export const RISE = 1.4;
export const BURN = 2.6;

export const SHELL_COLORS = [
  "#ff2f9a",
  "#ffb02e",
  "#4fe3ff",
  "#7dff6b",
  "#d9c8ff",
  "#fff1a8",
] as const;

export type ShellKind = "peony" | "ring" | "willow";
const KINDS: readonly ShellKind[] = ["peony", "peony", "ring", "willow"];

export type Shell = {
  /** Unique across all shows, for the client to track bursts. */
  id: number;
  x: number;
  z: number;
  /** Where it bursts. */
  height: number;
  /** Seconds since launch. */
  age: number;
  color: number;
  kind: ShellKind;
  /** Burst radius, metres. */
  size: number;
};

/** Where shells go up: over the sea, off the length of the beach. */
const SPAN = { x0: -140, x1: 140, z0: 420, z1: 450 };

function rand(n: number): number {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export function showOn(t: number): boolean {
  return ((t % SHOW_EVERY) + SHOW_EVERY) % SHOW_EVERY < SHOW_LENGTH;
}

/** Every shell in the air (or still burning) at `t` seconds. Fills `out`,
 * reusing its objects, so a frame loop allocates nothing once warm. */
export function shellsAt(t: number, out: Shell[] = []): Shell[] {
  const show = Math.floor(t / SHOW_EVERY);
  const into = t - show * SHOW_EVERY;
  const life = RISE + BURN;
  const first = Math.max(0, Math.floor((into - life) / SHELL_EVERY));
  const last = Math.floor(Math.min(into, SHOW_LENGTH) / SHELL_EVERY);
  let n = 0;
  for (let k = first; k <= last; k++) {
    const launched = k * SHELL_EVERY;
    if (launched >= SHOW_LENGTH) break;
    const age = into - launched;
    if (age < 0 || age > life) continue;
    const salvo = launched >= SHOW_LENGTH - FINALE ? 3 : 1;
    for (let j = 0; j < salvo; j++) {
      const id = show * 1000 + k * 3 + j;
      const shell = out[n] ?? (out[n] = { ...BLANK });
      n++;
      shell.id = id;
      shell.x = SPAN.x0 + rand(id) * (SPAN.x1 - SPAN.x0);
      shell.z = SPAN.z0 + rand(id + 0.31) * (SPAN.z1 - SPAN.z0);
      shell.height = 18 + rand(id + 0.57) * 14;
      shell.age = age;
      shell.color = Math.floor(rand(id + 0.73) * SHELL_COLORS.length);
      shell.kind = KINDS[Math.floor(rand(id + 0.91) * KINDS.length)];
      shell.size = 13 + rand(id + 0.13) * 7;
    }
  }
  out.length = n;
  return out;
}

const BLANK: Shell = {
  id: 0,
  x: 0,
  z: 0,
  height: 0,
  age: 0,
  color: 0,
  kind: "peony",
  size: 0,
};

/** Seconds until the next show starts; 0 while one is on. */
export function nextShowIn(t: number): number {
  if (showOn(t)) return 0;
  const into = ((t % SHOW_EVERY) + SHOW_EVERY) % SHOW_EVERY;
  return SHOW_EVERY - into;
}
