// The first-visit walkthrough: a name, a ready-made doll (or the closet),
// how to walk, the city map and where the games are, in five short cards.
// It never blocks the world: the card sits at the side, everything around it
// stays playable, and Skip ends it at any step. App shows it until the save's
// `onboarded` flag is set, which finishing or skipping does.

import { useId, useState } from "react";
import { STARTER_LOOKS, type Look } from "../../game/look.ts";
import { isValidDisplayName } from "../../game/save.ts";
import { requestCityMap } from "./cityMapRequest.ts";

const STEPS = ["name", "look", "walk", "map", "game"] as const;

export function Onboarding({
  name,
  look,
  inCity,
  onName,
  onLook,
  onCustomize,
  onDone,
}: {
  /** The current display name, as the name field's starting value. */
  name: string;
  look: Look;
  /** Whether the city map can open from here (it's the city's map). */
  inCity: boolean;
  onName: (name: string) => void;
  onLook: (look: Look) => void;
  /** Opens the closet for a doll of the player's own. */
  onCustomize: () => void;
  /** Finished or skipped: never show it again. */
  onDone: () => void;
}) {
  const id = useId();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(name);
  const at = STEPS[step] ?? "game";
  const nameOk = isValidDisplayName(draft);
  const next = () => {
    if (at === "name") onName(draft);
    setStep((s) => s + 1);
  };
  // the preset the doll wears now, if the closet hasn't changed it since
  const wearing = STARTER_LOOKS.find(
    ({ look: p }) =>
      p.skin === look.skin &&
      p.hairStyle === look.hairStyle &&
      p.hairColor === look.hairColor &&
      p.outfit === look.outfit &&
      p.outfitColor === look.outfitColor,
  );

  return (
    <section
      className="onboarding"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="onboarding-title">
        Welcome to Daydaze
      </h2>
      {at === "name" && (
        <>
          <h3>What should everyone call you?</h3>
          <label className="onboarding-field">
            Your name
            <input
              value={draft}
              maxLength={16}
              autoComplete="nickname"
              aria-describedby={`${id}-rule`}
              aria-invalid={!nameOk}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameOk) next();
              }}
            />
          </label>
          <p id={`${id}-rule`} className="onboarding-note">
            2 to 16 letters, digits, spaces, _ or -.
          </p>
        </>
      )}
      {at === "look" && (
        <>
          <h3>Pick a look</h3>
          <div
            className="onboarding-looks"
            role="radiogroup"
            aria-label="Starter looks"
          >
            {STARTER_LOOKS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                role="radio"
                aria-checked={wearing === preset}
                onClick={() => onLook({ ...look, ...preset.look })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="onboarding-link"
            onClick={onCustomize}
          >
            Customize in the closet
          </button>
        </>
      )}
      {at === "walk" && (
        <>
          <h3>Getting around</h3>
          <p>
            Click or tap the ground to walk there. On a keyboard, WASD or the
            arrow keys work too. Doors and gates take you inside.
          </p>
        </>
      )}
      {at === "map" && (
        <>
          <h3>City map</h3>
          <p>
            Downtown is only the start: Little Manila, Koreatown, Beachside, the
            Fairground and more. City map, at the bottom of the screen, takes
            you to any of them.
          </p>
          {inCity && (
            <button
              type="button"
              className="onboarding-link"
              onClick={requestCityMap}
            >
              Open the city map
            </button>
          )}
        </>
      )}
      {at === "game" && (
        <>
          <h3>Play something</h3>
          <p>
            Every venue has games: bowling at Glow Bowl, karaoke at the Karaoke
            Loft, Last Call at the Velvet Room bar. Each one pays coins and
            prizes, with fresh challenges every day.
          </p>
        </>
      )}
      <div className="onboarding-actions">
        <span className="onboarding-step">
          Step {step + 1} of {STEPS.length}
        </span>
        <button type="button" onClick={onDone}>
          Skip
        </button>
        {at === "game" ? (
          <button type="button" className="onboarding-next" onClick={onDone}>
            Let's go
          </button>
        ) : (
          <button
            type="button"
            className="onboarding-next"
            disabled={at === "name" && !nameOk}
            onClick={next}
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
