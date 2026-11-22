// The player's shared wanted state and the HUD's discrete pursuit status.
import {
  NOT_WANTED,
  arrest,
  commitCrime,
  starsOf,
  stepWanted,
  type CrimeKind,
  type WantedState,
} from "../../game/wanted/wanted.ts";
import type { JailSave } from "../../game/jail/jail.ts";
import { createStore } from "../rooms/shared/store.ts";

export const heat: { state: WantedState } = { state: NOT_WANTED };

export const wantedHud = createStore({
  stars: 0,
  inSight: false,
});

export const arrestDesk: {
  onCapture: ((jail: JailSave) => boolean) | null;
} = { onCapture: null };

function publish(inSight: boolean): void {
  const stars = starsOf(heat.state);
  const previous = wantedHud.get();
  if (stars !== previous.stars || inSight !== previous.inSight)
    wantedHud.set({ stars, inSight });
}

export function crime(kind: CrimeKind): void {
  heat.state = commitCrime(heat.state, kind).state;
  publish(wantedHud.get().inSight);
}

export function tickHeat(dtMs: number, inSight: boolean): void {
  heat.state = stepWanted(heat.state, dtMs, { inSight, hiding: false }).state;
  publish(inSight);
}

export function clearHeat(): void {
  heat.state = NOT_WANTED;
  publish(false);
}

export function captureWanted(now: number): void {
  const { jail } = arrest(heat.state, now);
  if (jail.endsAt !== null && arrestDesk.onCapture?.(jail)) clearHeat();
}
