// Rain follows a repeatable city date, and quiet streets follow the hour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWeatherFlag, quietAt, rainAt } from "./weather.ts";

test("a city date gives a repeatable shower with dry hours and gentle edges", () => {
  const date = { year: 2026, month: 11, day: 1 };
  const samples = (day: number) =>
    Array.from({ length: 1440 }, (_, minute) =>
      rainAt({ ...date, day }, minute / 60),
    );
  const days = Array.from({ length: 28 }, (_, i) => samples(i + 1));
  const rain = days.find((day) => day.includes(1));
  assert.ok(rain);
  assert.ok(days.some((day) => day.every((value) => value === 0)));
  assert.ok(rain.some((value) => value > 0 && value < 1));
  assert.ok(
    rain.every((value, i) => Math.abs(value - (rain[i - 1] ?? 0)) <= 0.5),
  );
  assert.equal(rain[1439], 0);
  assert.ok(days.every((day) => day[0] === 0));
  assert.deepEqual(samples(12), days[11]);
});

test("the rain preview validates explicit clear and rain values", () => {
  assert.equal(parseWeatherFlag("?time=04:00&weather=clear"), 0);
  assert.equal(parseWeatherFlag("?weather=rain"), 1);
  assert.equal(parseWeatherFlag("?weather=storm"), null);
});

test("ordinary street activity is quietest at 4 a.m. and normal by day", () => {
  assert.equal(quietAt(4), 1);
  assert.equal(quietAt(12), 0);
  assert.equal(quietAt(0), 0);
  assert.ok(quietAt(3) > 0 && quietAt(3) < quietAt(4));
  assert.ok(quietAt(5) > 0 && quietAt(5) < quietAt(4));
});
