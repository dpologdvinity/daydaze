// The card for another player tapped in the world: add or remove friend, invite
// to cards, a dance or a cook-off, mute, block, report and (for admins) ban.

import { useEffect, useState, type JSX } from "react";
import { askToPlay } from "./duel.ts";
import { TOGETHER } from "../../game/dance/together.ts";
import { askTogether } from "./together.ts";
import { askToCook } from "./cookOff.ts";
import { friends, friendship, refreshFriends } from "./friends.ts";
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
  const { list } = friends.use();
  const [reporting, setReporting] = useState(false);
  const [banning, setBanning] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setReporting(false);
    setBlocking(false);
    setNote("");
    if (open) void refreshFriends();
  }, [open?.id]);
  if (!open) return null;
  const session = onlineSession();
  const close = () => peerCard.set({ open: null });
  const muted = mutes.includes(open.id);
  const pronouns = session?.remotePlayers.get(open.id)?.look?.pronouns;
  return (
    <section
      className="home-panel peer-card"
      aria-label={`${open.name}'s card`}
    >
      <h2>{open.name}</h2>
      {pronouns && <p className="pronouns">{pronouns}</p>}
      <FriendButton
        status={friendship(list, open.id)}
        onFriend={async () => {
          const ok = await session?.friend(open.id);
          if (!ok) setNote("That didn't go through. Try again in a moment.");
          await refreshFriends();
        }}
        onUnfriend={async () => {
          await session?.unfriend(open.id);
          await refreshFriends();
        }}
      />
      <button
        type="button"
        onClick={() => {
          askToPlay(open.id, open.name);
          close();
        }}
      >
        Play Crazy Eights
      </button>
      <button
        type="button"
        onClick={() => {
          askToCook(open.id, open.name);
          close();
        }}
      >
        Challenge to a cook-off
      </button>
      <div className="game-row" role="group" aria-label="Do something together">
        {TOGETHER.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              askTogether(open.id, open.name, e.id);
              close();
            }}
          >
            {e.label}
          </button>
        ))}
      </div>
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
      {session?.identity()?.isAdmin &&
        (banning ? (
          <div role="group" aria-label="Ban reason">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={async () => {
                  const ok = await session.ban(open.id, r);
                  setNote(
                    ok
                      ? `${open.name} is banned and signed out.`
                      : "The ban didn't go through.",
                  );
                  setBanning(false);
                }}
              >
                Ban: {r}
              </button>
            ))}
            <button type="button" onClick={() => setBanning(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setBanning(true)}>
            Ban (admin)
          </button>
        ))}
      <p role="status" className="home-note">
        {note}
      </p>
      <button type="button" onClick={close}>
        Close
      </button>
    </section>
  );
}

function FriendButton({
  status,
  onFriend,
  onUnfriend,
}: {
  status: ReturnType<typeof friendship>;
  onFriend: () => void;
  onUnfriend: () => void;
}): JSX.Element {
  switch (status) {
    case "friend":
      return (
        <button type="button" onClick={onUnfriend}>
          Unfriend
        </button>
      );
    case "incoming":
      return (
        <button type="button" onClick={onFriend}>
          Accept friend request
        </button>
      );
    case "sent":
      return (
        <button type="button" onClick={onUnfriend}>
          Friend request sent (take back)
        </button>
      );
    case "none":
      return (
        <button type="button" onClick={onFriend}>
          Add friend
        </button>
      );
  }
}
