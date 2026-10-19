import { useEffect, useState, type JSX } from "react";
import { onlineSession } from "./online.ts";
import { mute, peerCard } from "./peerCard.ts";

const REASONS = [
  "Harassment",
  "Hate speech",
  "Sexual content without consent",
  "Spam",
  "Cheating",
  "Something else",
] as const;

/** Another player's card: mute their chat, block them, or report them. */
export function PeerCard(): JSX.Element | null {
  const { open, mutes } = peerCard.use();
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setReporting(false);
    setBlocking(false);
    setNote("");
  }, [open?.id]);
  if (!open) return null;
  const session = onlineSession();
  const close = () => peerCard.set({ open: null });
  const muted = mutes.includes(open.id);
  return (
    <section
      className="home-panel peer-card"
      aria-label={`${open.name}'s card`}
    >
      <h2>{open.name}</h2>
      <button type="button" aria-pressed={muted} onClick={() => mute(open.id)}>
        {muted ? "Unmute their chat" : "Mute their chat"}
      </button>
      {blocking ? (
        <div className="game-row">
          <button
            type="button"
            onClick={async () => {
              const ok = await session?.block(open.id);
              setNote(
                ok
                  ? `You blocked ${open.name}. You won't see each other.`
                  : "That didn't go through. Try again in a moment.",
              );
              setBlocking(false);
            }}
          >
            Yes, block
          </button>
          <button type="button" onClick={() => setBlocking(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setBlocking(true)}>
          Block
        </button>
      )}
      {reporting ? (
        <div role="group" aria-label="Report reason">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={async () => {
                const ok = await session?.report(open.id, r);
                setNote(
                  ok
                    ? "Thanks for telling us. A moderator will look."
                    : "That didn't go through. Try again in a moment.",
                );
                setReporting(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setReporting(true)}>
          Report
        </button>
      )}
      <p role="status" className="home-note">
        {note}
      </p>
      <button type="button" onClick={close}>
        Close
      </button>
    </section>
  );
}
