// The city's day and night in the client: the hour (the player's own clock,
// or `?time=HH:MM`), its light from src/game/city/daylight.ts, and the shared
// uniforms the sky dome reads. CityScene applies the rest (fog, lights, how
// lit the neon is) whenever the light changes, about every half minute.

import { useEffect, useState } from "react";
import * as THREE from "three";
import {
  daylightAt,
  hourOf,
  parseTimeFlag,
  type Daylight,
} from "../../game/city/daylight.ts";
import { locationSearch } from "../flags.ts";

/** A live pin from the dev panel (development only), and when it was set. */
let devHour: number | null = null;
let devSetAt = 0;
const devListeners = new Set<() => void>();

/** Dev panel: pin the hour live, or null to let go; the sky follows at once. */
export function setDevHour(hour: number | null): void {
  devHour = hour;
  devSetAt = Date.now();
  for (const fn of devListeners) fn();
}

/** Seconds into the day from the dev pin, running on from it; null if unset. */
export function devDaySeconds(): number | null {
  return devHour === null
    ? null
    : devHour * 3600 + (Date.now() - devSetAt) / 1000;
}

/** The hour now: the dev pin, else `?time=`, else the local clock. */
export const cityHour = () =>
  devHour ?? parseTimeFlag(locationSearch()) ?? hourOf(new Date());

/** Sky colors, shared by the dome's shader (CitySky.tsx). */
export const SKY_UNIFORMS = {
  uZenith: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uGlow: { value: new THREE.Color() },
  uNeon: { value: 1 },
};

/** The light now, refreshed every 30 s and whenever the dev pin moves. */
export function useDaylight(): Daylight {
  const [light, setLight] = useState(() => daylightAt(cityHour()));
  useEffect(() => {
    const refresh = () => setLight(daylightAt(cityHour()));
    const id = window.setInterval(refresh, 30_000);
    devListeners.add(refresh);
    return () => {
      window.clearInterval(id);
      devListeners.delete(refresh);
    };
  }, []);
  useEffect(() => {
    SKY_UNIFORMS.uZenith.value.setRGB(...light.zenith);
    SKY_UNIFORMS.uHorizon.value.setRGB(...light.horizon);
    SKY_UNIFORMS.uGlow.value.setRGB(...light.glow);
    SKY_UNIFORMS.uNeon.value = light.neon;
  }, [light]);
  return light;
}
