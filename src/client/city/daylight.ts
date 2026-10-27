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

/** The hour now: pinned by `?time=`, else the local clock. */
export const cityHour = () =>
  parseTimeFlag(location.search) ?? hourOf(new Date());

/** Sky colors, shared by the dome's shader (CitySky.tsx). */
export const SKY_UNIFORMS = {
  uZenith: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uGlow: { value: new THREE.Color() },
  uNeon: { value: 1 },
};

/** The light now, refreshed every 30 s (a pinned hour never changes). */
export function useDaylight(): Daylight {
  const [light, setLight] = useState(() => daylightAt(cityHour()));
  useEffect(() => {
    const id = window.setInterval(
      () => setLight(daylightAt(cityHour())),
      30_000,
    );
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    SKY_UNIFORMS.uZenith.value.setRGB(...light.zenith);
    SKY_UNIFORMS.uHorizon.value.setRGB(...light.horizon);
    SKY_UNIFORMS.uGlow.value.setRGB(...light.glow);
    SKY_UNIFORMS.uNeon.value = light.neon;
  }, [light]);
  return light;
}
