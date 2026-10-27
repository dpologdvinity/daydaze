// Sets the content tier from ?adult=1 (dev builds), like the game does.
import "../client/adult.ts";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bassline } from "./bassline/Bassline.tsx";
import type { Result } from "./bassline/engine.ts";
import { LastCall } from "./lastCall/LastCall.tsx";
import type { Result as LastCallResult } from "./lastCall/engine.ts";

// Standalone test bench until the 3D world launches minigames from hotspots.
function Fixture() {
  const [open, setOpen] = useState<"decks" | "bar" | null>(null);
  const [payouts, setPayouts] = useState<Result[]>([]);
  const [tips, setTips] = useState<LastCallResult[]>([]);
  const muted = new URLSearchParams(location.search).has("muted");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <main style={{ padding: 24, background: "#07020b", minHeight: "100dvh" }}>
      <button type="button" onClick={() => setOpen("decks")}>
        Open DJ booth
      </button>
      <button type="button" onClick={() => setOpen("bar")}>
        Open the bar
      </button>
      <output aria-label="Bassline payouts" style={{ color: "#f7e7c6" }}>
        {JSON.stringify(payouts)}
      </output>
      <output aria-label="Last Call payouts" style={{ color: "#f7e7c6" }}>
        {JSON.stringify(tips)}
      </output>
      {open === "decks" && (
        <Bassline
          muted={muted}
          reducedMotion={reducedMotion}
          onClose={(result) => {
            setOpen(null);
            if (result) setPayouts((list) => [...list, result]);
          }}
        />
      )}
      {open === "bar" && (
        <LastCall
          muted={muted}
          reducedMotion={reducedMotion}
          onClose={(result) => {
            setOpen(null);
            if (result) setTips((list) => [...list, result]);
          }}
        />
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Fixture />
    </StrictMode>,
  );
}
