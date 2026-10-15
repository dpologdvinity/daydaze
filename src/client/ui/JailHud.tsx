import { useEffect, useState } from "react";
import {
  bailCost,
  bailOut,
  goodBehaviour,
  remainingMs,
  type JailSave,
} from "../../game/jail/jail.ts";

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

  return (
    <section className="home-panel jail-hud" aria-label="Your sentence">
      <p role="timer" className="jail-clock">
        {serving ? `Time left: ${clock(left)}` : "Free to go."}
      </p>
      <button
        type="button"
        disabled={!serving || done}
        onClick={() => {
          onChange(goodBehaviour(jail, Date.now()));
          setNote("Cards with the guard: 30 seconds off.");
        }}
      >
        Play cards with the guard (-30 s)
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
        Pay bail ({bailCost(jail, now)} coins)
      </button>
      <p role="status" className="home-note">
        {note}
      </p>
    </section>
  );
}
