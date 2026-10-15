import { sentence, type JailSave } from "../jail/jail.ts";
import type { Penalty } from "../crime/shoplift.ts";

// The arrest is a fixed script the scene plays step by step. No weapons in
// this slice: the officer just walks the player to the van.
export type ArrestStep = {
  id: "approach" | "warn" | "cuffs" | "van";
  durationMs: number;
};

export const ARREST_STEPS: readonly ArrestStep[] = [
  { id: "approach", durationMs: 2500 },
  { id: "warn", durationMs: 3500 },
  { id: "cuffs", durationMs: 2000 },
  { id: "van", durationMs: 3000 },
];

export const ARREST_TOTAL_MS = ARREST_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0,
);

// The step on screen after elapsedMs, or null once the arrest is over.
export function arrestStepAt(elapsedMs: number): ArrestStep | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return ARREST_STEPS[0];
  let start = 0;
  for (const step of ARREST_STEPS) {
    if (elapsedMs < start + step.durationMs) return step;
    start += step.durationMs;
  }
  return null;
}

// Jail only follows a jail penalty; a fine or a warning ends the arrest at the door.
export function jailAfterArrest(
  now: number,
  penalty: Penalty,
): JailSave | null {
  return penalty.kind === "jail" ? sentence(now, penalty.minutes) : null;
}
