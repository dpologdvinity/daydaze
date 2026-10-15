import { useEffect, useRef, useState } from "react";
import { Dialog } from "../Dialog.tsx";
import { playInstrumentNote } from "../../audio/instrumentSynths.ts";
import { DJMixerEngine } from "./mixer.ts";
import {
  DJ_BEAT_COUNT,
  JUDGMENT_LABEL,
  JUDGMENT_WINDOW_MS,
  LANES,
  LANE_KEYS,
  comboMultiplier,
  findHittableNote,
  generateChart,
  judge,
  laneForKey,
  resultFor,
  tally,
  type Grade,
  type Judgment,
  type Lane,
  type Result,
} from "./engine.ts";
import "./Bassline.css";

declare module "react" {
  interface CSSProperties {
    "--p"?: number;
    "--energy"?: number;
  }
}

const BPM = 120;
const NOTE_TRAVEL_MS = 1800;
const CHART = generateChart(DJ_BEAT_COUNT, BPM);
const LAST_NOTE_MS = CHART[CHART.length - 1].timeMs;
// Drum kit voices per lane: kick, snare, hi-hat, crash.
const LANE_DRUM = [0, 1, 2, 5] as const;
// Crowd energy peaks when the streak reaches the 4x multiplier.
const FULL_ENERGY_STREAK = 30;

const GRADE_LINE: Record<Grade, string> = {
  S: "The floor is yours.",
  A: "The crowd is on its feet.",
  B: "A solid set.",
  C: "A warm-up set. Go again.",
};

type Phase = "intro" | "playing" | "done";

export type BasslineProps = {
  /** Called once: the best result of this visit, or null if no set was finished. */
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
  muted?: boolean;
};

function Crowd() {
  // Staggered by a 16th so the crowd bobs in waves rather than in lockstep.
  return (
    <div className="md-crowd" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <svg
          key={index}
          className="md-raver"
          viewBox="0 0 40 64"
          style={{ animationDelay: `${(index % 4) * -125}ms` }}
        >
          <path d="M20 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM6 64c0-18 4-34 14-34s14 16 14 34z" />
          {index % 3 === 0 && (
            <path
              className="md-raver-arm"
              d="M30 34l8-26"
              strokeWidth="5"
              strokeLinecap="round"
            />
          )}
        </svg>
      ))}
    </div>
  );
}

export function Bassline({
  onClose,
  reducedMotion = false,
  muted = false,
}: BasslineProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [judgments, setJudgments] = useState<readonly Judgment[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [last, setLast] = useState<Result | null>(null);

  const judgmentsRef = useRef<Judgment[]>([]);
  const judgedIds = useRef(new Set<number>());
  const startedAt = useRef(0);
  const running = useRef(false);
  const best = useRef<Result | null>(null);
  const closed = useRef(false);
  const mixer = useRef<DJMixerEngine | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const padRef = useRef<HTMLButtonElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => mixer.current?.dispose(), []);
  useEffect(() => {
    if (muted) mixer.current?.stop();
  }, [muted]);

  useEffect(() => {
    if (phase === "intro") startRef.current?.focus();
    else if (phase === "playing") padRef.current?.focus();
    else replayRef.current?.focus();
  }, [phase]);

  const record = (judgment: Judgment) => {
    judgmentsRef.current.push(judgment);
    setJudgments([...judgmentsRef.current]);
  };

  const expireNotes = (now: number) => {
    for (const note of CHART) {
      if (
        !judgedIds.current.has(note.id) &&
        now > note.timeMs + JUDGMENT_WINDOW_MS.good
      ) {
        judgedIds.current.add(note.id);
        record("miss");
      }
    }
  };

  const finish = () => {
    if (!running.current) return;
    running.current = false;
    mixer.current?.stop();
    const result = resultFor(judgmentsRef.current, CHART.length);
    if (!best.current || result.score > best.current.score) {
      best.current = result;
    }
    setLast(result);
    setPhase("done");
  };

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    running.current = false;
    onClose(best.current);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    const tick = () => {
      const now = performance.now() - startedAt.current;
      expireNotes(now);
      if (now > LAST_NOTE_MS + NOTE_TRAVEL_MS) {
        finish();
        return;
      }
      setElapsed(now);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const hitLane = (lane: Lane) => {
    if (!running.current) return;
    const now = performance.now() - startedAt.current;
    expireNotes(now);
    // Sound is optional: playInstrumentNote never throws when audio is unavailable.
    if (!muted) playInstrumentNote("drums", LANE_DRUM[lane]);
    const note = findHittableNote(CHART, lane, judgedIds.current, now);
    if (!note) return;
    judgedIds.current.add(note.id);
    record(judge(now - note.timeMs));
    const { combo } = tally(judgmentsRef.current);
    if (!muted && combo > 0 && combo % 10 === 0) {
      mixer.current?.triggerAirhorn();
    }
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const lane = laneForKey(event.key);
      if (lane === null) return;
      event.preventDefault();
      hitLane(lane);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    judgmentsRef.current = [];
    judgedIds.current = new Set();
    startedAt.current = performance.now();
    running.current = true;
    setJudgments([]);
    setElapsed(0);
    setLast(null);
    if (!muted) {
      mixer.current ??= new DJMixerEngine();
      mixer.current.setBpm(BPM);
      mixer.current.start();
    }
    setPhase("playing");
  };

  const { score, combo } = tally(judgments);
  const energy = Math.min(100, Math.round((combo / FULL_ENERGY_STREAK) * 100));
  const feedback = judgments[judgments.length - 1];

  return (
    <Dialog
      title="Bassline"
      subtitle="The DJ booth at Pulse"
      onClose={close}
      className={`md ${reducedMotion ? "md-calm" : ""}`}
    >
      {phase === "intro" && (
        <section className="md-intro">
          <div className="md-vinyl" aria-hidden="true" />
          <p className="md-lede">
            Hit each beat as it lands on the line. Keep the streak going and the
            crowd goes wild.
          </p>
          <div className="md-keycaps" aria-hidden="true">
            {LANE_KEYS.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
          </div>
          <p className="md-hint">
            Play with D F J K, the arrow keys, or tap the pads.
          </p>
          <button
            ref={startRef}
            type="button"
            className="md-button md-button-hot"
            onClick={start}
          >
            Start the set
          </button>
        </section>
      )}

      {phase === "playing" && (
        <section className="md-booth" style={{ "--energy": energy / 100 }}>
          <div className="md-hud">
            <p className="md-score">
              <span>Score</span> <strong>{score}</strong>
            </p>
            <p className="md-streak">
              <strong>{combo}</strong> streak{" "}
              <span className="md-multiplier">x{comboMultiplier(combo)}</span>
            </p>
          </div>
          <div className="md-energy-wrap">
            <div
              className="md-energy"
              role="meter"
              aria-label="Crowd energy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={energy}
            >
              <span className="md-energy-fill" />
            </div>
            <span className="md-energy-label" aria-hidden="true">
              Crowd
            </span>
          </div>
          <div
            className="md-field"
            role="group"
            aria-label={`Bassline set in progress. Score ${score}, streak ${combo}.`}
          >
            {feedback && (
              <span
                key={judgments.length}
                className={`md-feedback md-feedback-${feedback}`}
                aria-hidden="true"
              >
                {JUDGMENT_LABEL[feedback]}
              </span>
            )}
            {LANES.map((lane) => (
              <div className={`md-lane md-lane-${lane}`} key={lane}>
                <div className="md-track">
                  {CHART.filter(
                    (note) =>
                      note.lane === lane &&
                      !judgedIds.current.has(note.id) &&
                      elapsed > note.timeMs - NOTE_TRAVEL_MS,
                  ).map((note) => {
                    const progress =
                      (elapsed - (note.timeMs - NOTE_TRAVEL_MS)) /
                      NOTE_TRAVEL_MS;
                    return (
                      <span
                        key={note.id}
                        className="md-note"
                        style={{ "--p": Math.min(1, Math.max(0, progress)) }}
                      />
                    );
                  })}
                  <span className="md-hit-line" />
                </div>
                <button
                  ref={lane === 0 ? padRef : undefined}
                  type="button"
                  className="md-pad"
                  aria-label={`Hit lane ${LANE_KEYS[lane]}`}
                  onPointerDown={() => hitLane(lane)}
                  // Keyboard activation (Enter/Space) arrives as a click with detail 0.
                  onClick={(event) => {
                    if (event.detail === 0) hitLane(lane);
                  }}
                >
                  {LANE_KEYS[lane]}
                </button>
              </div>
            ))}
          </div>
          <Crowd />
          <p className="md-sr-only" aria-live="polite">
            {score} points. Streak {combo}.
          </p>
        </section>
      )}

      {phase === "done" && last && (
        <section className="md-result">
          <p className="md-grade">
            <span className="md-sr-only">Grade </span>
            {last.grade}
          </p>
          <h3>{GRADE_LINE[last.grade]}</h3>
          <dl className="md-stats">
            <div>
              <dt>Score</dt>
              <dd>{last.score}</dd>
            </div>
            <div>
              <dt>Peak streak</dt>
              <dd>{last.peakStreak}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{last.accuracy}%</dd>
            </div>
          </dl>
          {best.current && best.current !== last && (
            <p className="md-hint">
              Your best set this visit scored {best.current.score}. That one
              counts when you leave.
            </p>
          )}
          <div className="md-actions">
            <button
              ref={replayRef}
              type="button"
              className="md-button"
              onClick={start}
            >
              Play again
            </button>
            <button
              type="button"
              className="md-button md-button-hot"
              onClick={close}
            >
              Leave the booth
            </button>
          </div>
        </section>
      )}
    </Dialog>
  );
}
