// The per-frame driver for buzz and high: decays them, publishes the look the
// doll and `DrunkPost` read, and mirrors it onto canvas data attributes.
import { ADULT_OK } from "../adult.ts";
import { isMusicRoom } from "../../game/musicRooms.ts";
import type { RoomId } from "../../game/rooms.ts";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  intensityFactor,
  visualParams,
  type Intensity,
} from "../../game/effects/buzz.ts";
import {
  dryMouthHint,
  highParams,
  panicHint,
  strongest,
  SUBSTANCES,
  type Phase,
  type Substance,
} from "../../game/effects/substances.ts";
import {
  ageHigh,
  dosesOnboard,
  getMeters,
  liveHigh,
  onHighChange,
} from "./high.ts";
import { showToast } from "../food/store.ts";
import { getSharedAudioBus } from "../../audio/audioBus.ts";
import { useReducedMotion } from "../motion.ts";
import {
  ageBuzz,
  getBuzz,
  getHangover,
  liveDrunk,
  onBuzzChange,
} from "./drunk.ts";

/**
 * Fades the buzz, works out this frame's drunk look and publishes it to the
 * doll and the post pass. Always mounted, so `data-buzz` and `data-sway` read
 * on every quality tier. Writes the canvas attributes only when they change.
 */
export function DrunkState({
  intensity,
  room,
  highAudio = true,
}: {
  intensity: Intensity;
  room?: RoomId;
  highAudio?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const calm = useReducedMotion();
  const shown = useRef({ buzz: -1, calm, intensity });
  const acidHeard = useRef(0);
  const highHeard = useRef(0);
  const weedPhase = useRef<Phase | null>(null);
  const weedLevel = useRef(0);

  useEffect(() => onBuzzChange(() => invalidate()), [invalidate]);
  useEffect(() => onHighChange(() => invalidate()), [invalidate]);
  useEffect(() => {
    return () => {
      getSharedAudioBus().setHighLevel(0);
    };
  }, []);
  // what the canvas attributes last showed: each meter at two decimals
  const shownHigh = useRef({
    levels: {
      high: -1,
      trip: -1,
      acid: -1,
      molly: -1,
      cocaine: -1,
    } satisfies Record<Substance, number>,
    under: "",
    doses: -1,
  });

  useFrame((_, dt) => {
    ageBuzz(dt);
    const buzz = getBuzz();
    const look = visualParams(buzz, intensity, calm, getHangover());
    liveDrunk.sway = look.sway;
    liveDrunk.wobble = look.wobble;
    liveDrunk.warm = look.warm;
    liveDrunk.edge = look.edge;
    liveDrunk.ghost = look.ghost;
    liveDrunk.glare = look.glare;
    ageHigh(dt);
    const meters = getMeters();
    // the filter eases itself; skip the call while the level hasn't moved
    if (meters.acid.level !== acidHeard.current) {
      acidHeard.current = meters.acid.level;
      getSharedAudioBus().setAcidLevel(acidHeard.current);
    }
    // High audio lift: subtle reverb bloom / low-pass filter in music rooms when enabled (18+ only)
    const effectiveHigh =
      ADULT_OK && highAudio && room && isMusicRoom(room)
        ? meters.high.level
        : 0;
    if (effectiveHigh !== highHeard.current) {
      highHeard.current = effectiveHigh;
      getSharedAudioBus().setHighLevel(highHeard.current);
    }
    const hint = dryMouthHint(weedPhase.current, meters);
    weedPhase.current = meters.high.phase;
    if (hint) showToast(hint);
    const panic = panicHint(weedLevel.current, meters);
    weedLevel.current = meters.high.level;
    if (panic) showToast(panic);
    const lifted = highParams(meters, intensityFactor(intensity), calm);
    liveHigh.glow = lifted.glow;
    liveHigh.hue = lifted.hue;
    liveHigh.breathe = lifted.breathe;
    liveHigh.drift = lifted.drift;
    liveHigh.radiance = lifted.radiance;
    liveHigh.geometry = lifted.geometry;
    liveHigh.tracer = lifted.tracer;
    liveHigh.wiggle = lifted.wiggle;
    // read by tests: two decimals, so the canvas attributes change a few
    // times a second; `under` is the substance her body shows ("" sober)
    const was = shownHigh.current;
    const under = strongest(meters) ?? "";
    const doses = dosesOnboard();
    let dirty = under !== was.under || doses !== was.doses;
    for (const sub of SUBSTANCES) {
      const level = Math.round(meters[sub].level * 100) / 100;
      if (level !== was.levels[sub]) {
        was.levels[sub] = level;
        dirty = true;
      }
    }
    if (dirty) {
      was.under = under;
      was.doses = doses;
      for (const sub of SUBSTANCES)
        gl.domElement.dataset[sub] = was.levels[sub].toFixed(2);
      gl.domElement.dataset.under = under;
      gl.domElement.dataset.doses = String(doses);
    }
    const seen = shown.current;
    if (
      buzz !== seen.buzz ||
      calm !== seen.calm ||
      intensity !== seen.intensity
    ) {
      seen.buzz = buzz;
      seen.calm = calm;
      seen.intensity = intensity;
      gl.domElement.dataset.buzz = buzz.toFixed(2);
      gl.domElement.dataset.sway = String(look.sway);
    }
  });

  return null;
}
