import type { JSX } from "react";
import { JUKEBOX_TRACKS } from "../../audio/proceduralJukebox.ts";
import { RECORD_PRICE } from "../../game/records.ts";
import { musicPick } from "../musicPick.ts";

/** Vinyl Vault's racks: play a sample of any record, buy the ones you like. */
export function RecordsPanel({
  coins,
  records,
  onBuy,
}: {
  coins: number;
  records: readonly string[];
  onBuy: (id: string) => void;
}): JSX.Element {
  const playing = musicPick.use().track;
  return (
    <section className="game-panel" aria-label="Records">
      <p className="game-call">
        Every record is {RECORD_PRICE} coins. Yours play on the record player at
        home.
      </p>
      <ul className="price-list">
        {JUKEBOX_TRACKS.map((t) => {
          const owned = records.includes(t.id);
          return (
            <li key={t.id}>
              <span>{t.title}</span>
              <span>
                <button
                  type="button"
                  aria-pressed={playing === t.id}
                  aria-label={`Play a sample of ${t.title}`}
                  onClick={() => musicPick.set({ track: t.id })}
                >
                  ▶
                </button>
                <button
                  type="button"
                  disabled={owned || coins < RECORD_PRICE}
                  aria-label={owned ? `${t.title}: owned` : `Buy ${t.title}`}
                  onClick={() => onBuy(t.id)}
                >
                  {owned ? "Owned" : "Buy"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The record player at home: put on one of your records, or lift the needle. */
export function RecordPlayer({
  records,
}: {
  records: readonly string[];
}): JSX.Element | null {
  const playing = musicPick.use().track;
  const mine = JUKEBOX_TRACKS.filter((t) => records.includes(t.id));
  if (mine.length === 0) return null;
  return (
    <div className="car-picker" role="group" aria-label="Record player">
      <select
        aria-label="Record"
        value={playing ?? ""}
        onChange={(e) => {
          const t = mine.find((r) => r.id === e.target.value);
          musicPick.set({ track: t ? t.id : null });
        }}
      >
        <option value="">Record player: off</option>
        {mine.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </div>
  );
}
