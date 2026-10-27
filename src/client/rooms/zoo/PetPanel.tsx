// The Zoo's pet-adoption corner: pick a husky, Shiba Inu, cat or rabbit, name
// it and take it home. It then follows you everywhere (PetFollower) and
// sleeps at your apartment. The panel feeds and renames it too. The rules are
// in src/game/pet.ts; the saved pet reaches here through petDesk.

import { useEffect, useState, type JSX } from "react";
import {
  adopt,
  canFeed,
  feed,
  happiness,
  isValidPetName,
  moodOf,
  PET_KINDS,
  PET_LABEL,
  type PetKind,
} from "../../../game/pet.ts";
import { petDesk } from "./petDesk.ts";

/** Adopt a pet, then look after it. */
export function PetPanel(): JSX.Element {
  const { pet, act } = petDesk.use();
  const [kind, setKind] = useState<PetKind>("shibainu");
  const [name, setName] = useState("");
  const [rename, setRename] = useState("");
  // hunger shows by the second
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!pet)
    return (
      <section className="game-panel" aria-label="Pet adoption">
        <p className="game-call">
          Adopt a pet. It follows you everywhere and sleeps at your apartment.
        </p>
        <div className="game-row" role="group" aria-label="Pick a pet">
          {PET_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {PET_LABEL[k]}
            </button>
          ))}
        </div>
        <label>
          Pet's name
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="game-main"
          disabled={!act || !isValidPetName(name.trim())}
          onClick={() => act?.(() => adopt(kind, name, Date.now()))}
        >
          Adopt {PET_LABEL[kind]}
        </button>
        <p className="game-call">
          Names are 2 to 16 letters, numbers or spaces.
        </p>
      </section>
    );
  return (
    <section className="game-panel" aria-label="Your pet">
      <p className="game-score" aria-label="Pet">
        <span>
          {pet.name} the {PET_LABEL[pet.kind]}
        </span>
        <span>
          {moodOf(pet, now)} ({happiness(pet, now)}%)
        </span>
      </p>
      <div className="game-row">
        <button
          type="button"
          className="game-main"
          disabled={!canFeed(pet, now)}
          onClick={() => act?.((p) => (p ? feed(p, Date.now()) : p))}
        >
          Give a treat
        </button>
      </div>
      <label>
        New name
        <input
          value={rename}
          maxLength={16}
          onChange={(e) => setRename(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!isValidPetName(rename.trim())}
        onClick={() => {
          act?.((p) => (p ? { ...p, name: rename.trim() } : p));
          setRename("");
        }}
      >
        Rename
      </button>
    </section>
  );
}
