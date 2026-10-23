import { useEffect, type JSX } from "react";
import type { SaveV1 } from "../../game/save.ts";
import { AccountPanel } from "./AccountPanel.tsx";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import { friends, refreshFriends } from "./friends.ts";
import { joinCopy, onlineSession } from "./online.ts";

const REFRESH_MS = 20_000;

/** Your friends and where they are, with a way to go to them, and the
 * requests waiting on you or on them. */
export function FriendsPanel({
  onGo,
  strictChat,
  onStrictChat,
  save,
  onSave,
}: {
  onGo: (room: RoomId) => void;
  /** Mask swearing in others' chat, not just slurs. */
  strictChat: boolean;
  onStrictChat: (on: boolean) => void;
  save: SaveV1;
  onSave: (save: SaveV1) => void;
}): JSX.Element | null {
  const { open, list } = friends.use();
  useEffect(() => {
    if (!open) return;
    void refreshFriends();
    const id = window.setInterval(() => void refreshFriends(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [open]);
  const session = onlineSession();
  if (!open || !session) return null;
  const act = async (done: Promise<boolean>) => {
    await done;
    await refreshFriends();
  };
  return (
    <section className="home-panel friends-panel" aria-label="Friends">
      <h2>Friends</h2>
      <AccountPanel save={save} onSave={onSave} />
      <label className="friends-setting">
        <input
          type="checkbox"
          checked={strictChat}
          onChange={(e) => onStrictChat(e.target.checked)}
        />{" "}
        Strict chat filter: hide swearing too
      </label>
      {!list ? (
        <p>Looking for your friends…</p>
      ) : list.friends.length + list.incoming.length + list.sent.length ===
        0 ? (
        <p>
          No friends yet. Tap someone's name and choose Add friend: once you've
          both asked, you're friends.
        </p>
      ) : null}
      {list && list.incoming.length > 0 && (
        <ul aria-label="Friend requests">
          {list.incoming.map((p) => (
            <li key={p.id}>
              <span>{p.name} wants to be friends</span>
              <button type="button" onClick={() => act(session.friend(p.id))}>
                Accept
              </button>
              <button type="button" onClick={() => act(session.unfriend(p.id))}>
                Decline
              </button>
            </li>
          ))}
        </ul>
      )}
      {list && list.friends.length > 0 && (
        <ul aria-label="Your friends">
          {list.friends.map((f) => (
            <li key={f.id}>
              <span>
                {f.name}:{" "}
                {f.room
                  ? `${ROOMS[f.room.roomId].name} #${f.room.copy}`
                  : "offline"}
              </span>
              {f.room && (
                <button
                  type="button"
                  onClick={() => {
                    const at = f.room;
                    if (!at) return;
                    friends.set({ open: false });
                    // same room, another copy: no trip, just a switch
                    if (session.room()?.roomId === at.roomId) {
                      void session.switchCopy(at.copy);
                      return;
                    }
                    joinCopy.room = at.roomId;
                    joinCopy.copy = at.copy;
                    onGo(at.roomId);
                  }}
                >
                  Go to {f.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {list && list.sent.length > 0 && (
        <ul aria-label="Requests you sent">
          {list.sent.map((p) => (
            <li key={p.id}>
              <span>Asked {p.name}</span>
              <button type="button" onClick={() => act(session.unfriend(p.id))}>
                Take back
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => friends.set({ open: false })}>
        Close
      </button>
    </section>
  );
}
