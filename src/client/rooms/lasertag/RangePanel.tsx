import { useState, type JSX } from "react";
import { Gallery } from "../../../minigames/midway/Midway.tsx";
import { Dialog } from "../../../minigames/Dialog.tsx";
import { award } from "../../ui/prizeDesk.ts";

const DRILLS = [
  {
    id: "pistol",
    label: "Pistol drill",
    level: "medium",
    blurb: "A light pistol: more shots, wider beam.",
  },
  {
    id: "rifle",
    label: "Rifle drill",
    level: "hard",
    blurb: "A light rifle: fewer shots, a tight beam, faster targets.",
  },
] as const;

type Drill = (typeof DRILLS)[number];

/** Photon Zone's light-gun range: timed target drills, hits score in light. */
export function RangePanel(): JSX.Element {
  const [drill, setDrill] = useState<Drill | null>(null);
  const [seed, setSeed] = useState(1);
  const [last, setLast] = useState<{ drill: Drill; score: number } | null>(
    null,
  );
  return (
    <section className="game-panel" aria-label="Target range">
      <p className="game-call" role="status">
        {last
          ? `${last.drill.label}: ${last.score} points.`
          : "Light guns only: targets slide past, and a hit lights them up."}
      </p>
      {DRILLS.map((d) => (
        <button
          key={d.id}
          type="button"
          className="game-main"
          title={d.blurb}
          onClick={() => {
            setSeed(Math.floor(Math.random() * 1e9));
            setDrill(d);
          }}
        >
          {d.label}
        </button>
      ))}
      {drill && (
        <Dialog
          title={drill.label}
          subtitle={drill.blurb}
          className="mw"
          onClose={() => setDrill(null)}
        >
          <Gallery
            level={drill.level}
            seed={seed}
            ammo="shots"
            onFinish={(score) => {
              award(`range-${drill.id}`, score);
              setLast({ drill, score });
              setDrill(null);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
