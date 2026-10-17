// The Park Ice Rink's ice show: a skating program judged like the gym's
// floor routine (gymnastics.ts), eight elements on the music. Each is a
// jump (she leaps and turns in the air), a spin (she spins on the spot)
// or a glide (a spiral or a pose on one blade).
import type { Element } from "./gymnastics.ts";

export type SkateKind = "jump" | "spin" | "glide";

export const PROGRAM: readonly (Element & { kind: SkateKind })[] = [
  {
    name: "Waltz jump",
    at: 2.5,
    move: "groove",
    difficulty: 0.1,
    kind: "jump",
  },
  { name: "Sit spin", at: 4.6, move: "groove", difficulty: 0.2, kind: "spin" },
  { name: "Salchow", at: 6.6, move: "groove", difficulty: 0.2, kind: "jump" },
  { name: "Spiral", at: 8.6, move: "groove", difficulty: 0.1, kind: "glide" },
  {
    name: "Triple toe loop",
    at: 10.5,
    move: "groove",
    difficulty: 0.3,
    kind: "jump",
  },
  {
    name: "Layback spin",
    at: 12.5,
    move: "groove",
    difficulty: 0.2,
    kind: "spin",
  },
  { name: "Axel", at: 14.4, move: "groove", difficulty: 0.3, kind: "jump" },
  {
    name: "Final pose",
    at: 16.5,
    move: "groove",
    difficulty: 0.1,
    kind: "glide",
  },
];
export const PROGRAM_SECONDS = 18;
