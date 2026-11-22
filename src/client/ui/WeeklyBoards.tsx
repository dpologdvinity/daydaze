// The weekly leaderboards in the game menu: pick a minigame or a ladder and
// read this week's top lines, your own rank and when the week resets. Boards
// come from the server (anyone may read them; only accounts are on them), so
// the panel only appears online and says so when the server can't be reached.
import { useEffect, useState } from "react";
import { PRIZE_GAMES, PRIZE_TABLES } from "../../game/prizes.ts";
import { LADDERS } from "../../game/progression/progression.ts";
import type { Board } from "../../net/progress.ts";
import {
  boardChoice,
  boardValue,
  weekCountdown,
  type BoardChoice,
} from "../../net/client/progressSync.ts";
import { account } from "../net/account.ts";
import { ONLINE, onlineSession } from "../net/online.ts";

const LADDER_NAMES = { street: "Street", fame: "Fame", hustle: "Hustle" };
const GAMES = [...PRIZE_GAMES].sort((a, b) =>
  PRIZE_TABLES[a].label.localeCompare(PRIZE_TABLES[b].label),
);

/** The time, refreshed every `ms`, so a countdown moves while the menu is open. */
function useClock(ms: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

/** A board as loaded for a player (`me`, "" for none) and a picker value. */
type Shown = { key: string; me: string; board: Board | null };

/** The weekly boards, or nothing when the game is offline. */
export function WeeklyBoards() {
  const [key, setKey] = useState("ladder:street");
  // the board last loaded and the key it answers; null board: it failed
  const [shown, setShown] = useState<Shown | null>(null);
  const { me } = account.use();
  const meId = me?.id ?? "";
  // bumped when the week ends, to load the new week's board
  const [week, setWeek] = useState(0);
  const choice = boardChoice(key);
  useEffect(() => {
    const session = onlineSession();
    const wanted = boardChoice(key);
    if (!session || !wanted) return;
    let live = true;
    const load =
      "game" in wanted
        ? session.progress.scoreBoard(wanted.game)
        : session.progress.ladderBoard(wanted.ladder);
    void load.then((r) => {
      if (live) setShown({ key, me: meId, board: r.ok ? r.value : null });
    });
    return () => {
      live = false;
    };
  }, [key, meId, week]);
  const endsAt = shown?.board?.endsAt;
  useEffect(() => {
    if (endsAt === undefined) return;
    // at least 10 s, so a board that is already over can't reload in a loop
    const wait = Math.max(endsAt - Date.now() + 1000, 10_000);
    const timer = window.setTimeout(() => setWeek((n) => n + 1), wait);
    return () => window.clearTimeout(timer);
  }, [endsAt]);
  if (!ONLINE || !choice) return null;
  return (
    <section className="weekly-boards" aria-label="Weekly boards">
      <h3>Weekly boards</h3>
      <label className="title-picker">
        Board
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          <optgroup label="Ladders">
            {LADDERS.map((ladder) => (
              <option key={ladder} value={`ladder:${ladder}`}>
                {LADDER_NAMES[ladder]} XP
              </option>
            ))}
          </optgroup>
          <optgroup label="Minigames">
            {GAMES.map((game) => (
              <option key={game} value={`game:${game}`}>
                {PRIZE_TABLES[game].label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <BoardLines
        choice={choice}
        shown={shown?.key === key && shown.me === meId ? shown : null}
        guest={me?.isGuest ?? true}
      />
    </section>
  );
}

function BoardLines({
  choice,
  shown,
  guest,
}: {
  choice: BoardChoice;
  shown: Shown | null;
  guest: boolean;
}) {
  const now = useClock(30_000);
  if (!shown) return <p role="status">Loading the board…</p>;
  const { board } = shown;
  if (!board)
    return <p role="status">Can't reach the boards right now. Try later.</p>;
  return (
    <>
      <p className="board-reset">
        Resets in {weekCountdown(board.endsAt, now)}
      </p>
      {board.entries.length === 0 ? (
        <p>Nobody is on this board yet. Be the first!</p>
      ) : (
        <ol className="board-lines">
          {board.entries.map((entry) => (
            <li key={entry.rank}>
              <span>{entry.rank}</span>
              <strong>{entry.name}</strong>
              <small>{boardValue(choice, entry.value)}</small>
            </li>
          ))}
        </ol>
      )}
      <p className="board-you">
        {board.you
          ? `You: #${board.you.rank} · ${boardValue(choice, board.you.value)}`
          : guest
            ? "Log in to put your scores on the boards."
            : "Play to get on this board."}
      </p>
    </>
  );
}
