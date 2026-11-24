// The jail panel: the sentence countdown, plus the ways to shorten it
// (push-ups, a card game with the guard, or paying bail). The countdown reads
// the saved end time, so reloads resume it; release fires once the time reaches
// zero.

import { lazy, Suspense, useEffect, useState } from "react";
import {
  bailCost,
  bailOut,
  goodBehavior,
  remainingMs,
  rhythmService,
  type JailSave,
} from "../../game/jail/jail.ts";
import { CardTable } from "./CardTable.tsx";

const Bassline = lazy(() =>
  import("../../minigames/bassline/Bassline.tsx").then((m) => ({
    default: m.Bassline,
  })),
);

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// The sentence countdown. It reads the saved end time, so a reload resumes it.
export function JailHud({
  jail,
  coins,
  onChange,
  onPayBail,
  onRelease,
}: {
  jail: JailSave;
  coins: number;
  onChange: (jail: JailSave) => void;
  onPayBail: (coins: number) => void;
  onRelease: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState("");
  const [cards, setCards] = useState(false);
  const [rhythm, setRhythm] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingMs(jail, now);
  const serving = jail.endsAt !== null;
  const done = serving && left === 0;
  useEffect(() => {
    if (done) onRelease();
  }, [done, onRelease]);

  const shorten = (next: JailSave) => {
    onChange(next);
    if (next.endsAt === null) onRelease();
  };

  return (
    <section className="home-panel jail-hud" aria-label="Your sentence">
      <p role="timer" className="jail-clock">
        {serving ? `Time left: ${clock(left)}` : "Free to go."}
      </p>
      <button
        type="button"
        disabled={!serving || done}
        onClick={() => setCards(true)}
      >
        Play cards with the guard
      </button>
      <button
        type="button"
        disabled={!serving || done}
        onClick={() => {
          shorten(goodBehavior(jail, Date.now()));
          setNote("Push-ups in the yard: 30 seconds off.");
        }}
      >
        Push-ups in the yard (-30 s)
      </button>
      <button
        type="button"
        disabled={!serving || done}
        onClick={() => {
          const paid = bailOut(jail, Date.now(), coins);
          if (paid === null) {
            setNote(
              `Bail is ${bailCost(jail, now)} coins and you have ${coins}. Play cards or wait it out.`,
            );
            return;
          }
          onPayBail(paid.coins);
          onChange(paid.jail);
          onRelease();
        }}
      >
        Use the phone: bail ({bailCost(jail, now)} coins)
      </button>
      <button
        type="button"
        disabled={!serving || done || cards || rhythm}
        onClick={() => setRhythm(true)}
      >
        Play a rhythm set for time off
      </button>
      {rhythm && serving && !done && (
        <Suspense fallback={null}>
          <Bassline
            onClose={(result) => {
              setRhythm(false);
              const next = rhythmService(
                jail,
                Date.now(),
                result?.grade ?? null,
              );
              if (next === jail) {
                setNote("Earn a B or better to take a minute off.");
              } else {
                shorten(next);
                setNote("Community service: a minute off.");
              }
            }}
          />
        </Suspense>
      )}
      {cards && serving && !done && (
        <CardTable
          onWin={() => {
            const t = Date.now();
            // a win at cards is a minute's good behavior
            shorten(goodBehavior(goodBehavior(jail, t), t));
            setNote("You beat the guard at cards: a minute off.");
          }}
          onClose={() => setCards(false)}
        />
      )}
      <p role="status" className="home-note">
        {note}
      </p>
    </section>
  );
}
