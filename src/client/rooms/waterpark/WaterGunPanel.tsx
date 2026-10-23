import { useState, type JSX } from "react";
import { Dialog } from "../../../minigames/Dialog.tsx";
import { Gallery } from "../../../minigames/midway/Midway.tsx";
import { award } from "../../ui/prizeDesk.ts";

/** The water-gun battle: soak the floaties bobbing past before the tank
 * runs dry. */
export function WaterGunPanel(): JSX.Element {
  const [seed, setSeed] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  return (
    <section className="game-panel" aria-label="Water-gun battle">
      <p className="game-call" role="status">
        {last === null
          ? "Soak the floaties bobbing past before your tank runs dry."
          : `Battle over: ${last} points.`}
      </p>
      <button
        type="button"
        className="game-main"
        onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
      >
        Grab a water gun
      </button>
      {seed !== null && (
        <Dialog
          title="Water-gun battle"
          subtitle="Arrows aim, space squirts."
          className="mw"
          onClose={() => setSeed(null)}
        >
          <Gallery
            level="easy"
            seed={seed}
            ammo="squirts"
            onFinish={(score) => {
              award("water-guns", score);
              setLast(score);
              setSeed(null);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
