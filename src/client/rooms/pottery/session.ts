// Shared wheel state. App owns persistence; a firing can finish only once.
import {
  cleanPot,
  freshClay,
  type Clay,
  type FiredPot,
  type PotTarget,
} from "../../../game/pottery.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

type Session = {
  phase: "idle" | "throw" | "glaze" | "firing" | "done";
  clay: Clay;
  target: PotTarget;
  glaze: string;
  saved: FiredPot | null;
  commit: ((piece: FiredPot) => void) | null;
};
export const pottery = createStore<Session>({
  phase: "idle",
  clay: freshClay(),
  target: "bowl",
  glaze: "#d58256",
  saved: null,
  commit: null,
});
export function startPot(target: PotTarget) {
  pottery.set({ phase: "throw", clay: freshClay(), target, glaze: "#d58256" });
}
export function finishFiring() {
  const state = pottery.get();
  if (state.phase !== "firing" || !state.commit) return;
  const piece = cleanPot(state);
  if (!piece) return;
  pottery.set({ phase: "done", saved: piece });
  state.commit(piece);
  award("pottery", piece.score);
}
