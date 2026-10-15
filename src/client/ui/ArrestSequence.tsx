import { useEffect, useState } from "react";
import { pickLine } from "../../game/dialogue/pick.ts";
import { ARREST_STEPS, ARREST_TOTAL_MS, arrestStepAt } from "../../game/police/arrest.ts";

const STEP_TEXT = {
  approach: "An officer walks over and stops right next to you.",
  warn: "",
  cuffs: "Cuffs go on, politely.",
  van: "The van doors close. Next stop: the cell block.",
} as const;

// The scripted arrest: the officer's line plays on the warning beat, then
// the scene calls onDone so the caller can apply the penalty.
export function ArrestSequence({ onDone }: { onDone: () => void }) {
  const [line] = useState(
    () =>
      pickLine({
        role: "police",
        situation: "state-caught-shoplifting",
        rng: Math.random,
      }).text,
  );
  const [started] = useState(() => Date.now());
  const [stepId, setStepId] = useState(ARREST_STEPS[0].id);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const step = arrestStepAt(Date.now() - started);
      if (step) setStepId(step.id);
    }, 250);
    const end = window.setTimeout(onDone, ARREST_TOTAL_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(end);
    };
  }, [started, onDone]);

  return (
    <section className="home-panel arrest" role="alert" aria-label="Arrest">
      <p className="arrest-line">{stepId === "warn" ? line : STEP_TEXT[stepId]}</p>
    </section>
  );
}
