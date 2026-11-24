// Shared city showers and the overnight lull in ordinary street activity.
import type { CityTime } from "./cityClock.ts";
import { hash } from "./hash.ts";

type CityDate = Pick<CityTime, "year" | "month" | "day">;

const smooth = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** One short shower on some city dates. Leave midnight clear on both sides. */
export function rainAt({ year, month, day }: CityDate, hour: number): number {
  const date = year * 10000 + month * 100 + day;
  if (hash(date, 217) >= 0.55) return 0;
  const start = 10 + 1350 * hash(date, 218);
  const duration = 35 + 30 * hash(date, 219);
  const elapsed = hour * 60 - start;
  return smooth(Math.min(elapsed, duration - elapsed) / 6);
}

/** 0 by day, peaking after the clubs let out and easing off before dawn. */
export const quietAt = (hour: number): number =>
  smooth(Math.min((hour - 1) / 3, (7 - hour) / 3));

/** A repeatable visual preview at any city hour. */
export function parseWeatherFlag(search: string): number | null {
  const weather = new URLSearchParams(search).get("weather");
  return weather === "rain" ? 1 : weather === "clear" ? 0 : null;
}
