// How loud and how fast the recorded engine and tire loops play for a car at
// `speed` (0..1 of its top speed). Pure: soundFiles.ts applies it.

export type EngineMix = {
  engine: { level: number; rate: number };
  tire: { level: number };
};

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

/** The idle burble at a standstill; the engine climbs in pitch and the tires
 * hum up with speed. */
export function engineMix(speed: number): EngineMix {
  const s = clamp01(speed);
  return {
    engine: { level: 0.12 + 0.2 * s, rate: 0.8 + 0.9 * s },
    tire: { level: 0.3 * s * s },
  };
}
