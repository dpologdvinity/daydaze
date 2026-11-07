// What a taxi ride looks like to the HUD: the phase of the trip, the driver's
// last line, and the requests the buttons and the map file. TaxiRide (in the
// 3D scene) drives it; TaxiPanel (dock) and the Overlay's map read it.
import type { Vec2 } from "../../game/walk.ts";
import type { TrafficCar } from "../../game/city/traffic.ts";
import type { Spawn } from "../../game/rooms.ts";
import { loadDialogue, pickLine } from "../../game/dialogue/pick.ts";
import type {
  DialogueContext,
  DialogueSituation,
} from "../../game/dialogue/types.ts";
import { createStore } from "../rooms/shared/store.ts";
import { cityHour } from "./daylight.ts";

export type TaxiPhase = "idle" | "arriving" | "choosing" | "riding";
export type TaxiRequest =
  | "hail"
  | "cancel"
  | "skip"
  /** The map pick, already paid for by the Overlay. */
  | { go: Spawn }
  | null;
type TaxiState = {
  phase: TaxiPhase;
  /** She may hail one now: standing on foot in the city, off the asphalt. */
  canHail: boolean;
  /** Where the cab picked her up (a road point), for pricing the map. */
  from: Vec2;
  /** Coins paid for the trip underway. */
  fare: number;
  /** The driver's latest line, or "". */
  line: string;
  request: TaxiRequest;
};
const IDLE: TaxiState = {
  phase: "idle",
  canHail: false,
  from: [0, 0],
  fare: 0,
  line: "",
  request: null,
};

export const taxiRide = createStore<TaxiState>(IDLE);
/** The cab on the street, a traffic car (Traffic.tsx adds it to the sim and
 * draws it; TaxiRide steers it). Null when no taxi is out. */
export const taxiCab: { car: TrafficCar | null } = { car: null };
/** Back to nothing happening (the scene unmounted). */
export const resetTaxiRide = () => taxiRide.set(IDLE);

let recent: readonly string[] = [];
let timer = 0;
/** The driver says something for `situation`; the line clears after a while.
 * The line banks load lazily, so a failed load just means a quiet driver. */
export function driverSays(
  situation: DialogueSituation,
  context: DialogueContext = {},
) {
  loadDialogue().then(
    () => {
      const hour = cityHour();
      const picked = pickLine({
        role: "taxi-driver",
        situation,
        context: {
          ...context,
          time:
            hour >= 21 || hour < 5
              ? "late-night"
              : hour < 12
                ? "morning"
                : hour < 18
                  ? "afternoon"
                  : "evening",
        },
        rng: Math.random,
        recent,
      });
      recent = picked.recent;
      taxiRide.set({ line: picked.text });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => taxiRide.set({ line: "" }), 6000);
    },
    () => {},
  );
}
