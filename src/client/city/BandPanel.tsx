// The band shell's card in the overlay: the park band's name, what it is
// playing or when its next set is, and a chat with the bandleader (the
// handwritten lines in src/game/dialogue/bandleader.ts). Shown within earshot
// of the shell; BandShell writes `bandDesk`.

import { useEffect, useRef, useState, type JSX } from "react";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../game/dialogue/pick.ts";
import type { DialogueSituation } from "../../game/dialogue/types.ts";
import { bandDesk } from "./bandDesk.ts";
import { cityHour } from "./daylight.ts";

/** Whether the bandleader has already greeted you this session. */
let met = false;

function chatSituation(): DialogueSituation {
  const options: DialogueSituation[] = ["tapped", "idle", "weather"];
  options.push(cityHour() < 12 ? "morning" : "afternoon");
  return options[Math.floor(Math.random() * options.length)] ?? "tapped";
}

export function BandPanel(): JSX.Element | null {
  const desk = bandDesk.use();
  const [line, setLine] = useState("");
  const recent = useRef<RecentLines>([]);
  const say = (situation: DialogueSituation) => {
    // the line banks load lazily; a failed load says nothing and retries on the next line
    loadDialogue().then(
      () => {
        const picked = pickLine({
          role: "bandleader",
          situation,
          context: { neighborhood: "uptown", venue: "band-shell" },
          rng: Math.random,
          recent: recent.current,
        });
        recent.current = picked.recent;
        setLine(picked.text);
      },
      () => undefined,
    );
  };
  useEffect(() => {
    if (!desk.near) {
      setLine("");
      return;
    }
    say(met ? "greeting-regular" : "greeting-first");
    met = true;
    // greet once per visit to the shell
  }, [desk.near]);
  if (!desk.near) return null;
  return (
    <section className="band-card" aria-label="Park band">
      <h3>The Park Band</h3>
      <p className="band-hint">{desk.hint}</p>
      {line && (
        <p className="band-line">
          <strong>Bandleader:</strong> {line}
        </p>
      )}
      <div>
        <button type="button" onClick={() => say(chatSituation())}>
          Chat with the bandleader
        </button>
      </div>
    </section>
  );
}
