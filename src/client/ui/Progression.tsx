// A small level badge, menu ladders and earned title picker. Rank celebrations
// observe committed progress; they never grant rewards or replay them on load.
import { useEffect, useRef, useState } from "react";
import { playFanfare } from "../../audio/worldSounds.ts";
import {
  CAREERS,
  CAREER_DEFS,
  PROMOTION_BONUS,
  RANK_SHIFTS,
  RAISE_PER_RANK,
  careerRank,
  careerShifts,
} from "../../game/careers.ts";
import type { ShiftsSave } from "../../game/shifts.ts";
import {
  LADDERS,
  RANKS,
  RANK_XP,
  levelOf,
  levelStart,
  rankOf,
  totalXp,
  type Ladder,
  type Progression,
} from "../../game/progression/progression.ts";

const LABELS: Record<Ladder, string> = {
  street: "Street",
  fame: "Fame",
  hustle: "Hustle",
};
const HINTS: Record<Ladder, string> = {
  street: "Race, explore, play sports, or get into trouble.",
  fame: "Perform, play, and visit event nights.",
  hustle: "Work a counter, cook, fish, or make pottery.",
};

export function ProgressionHud({ progression }: { progression: Progression }) {
  const xp = totalXp(progression);
  const level = levelOf(xp);
  const gained = xp - levelStart(level);
  const needed = levelStart(level + 1) - levelStart(level);
  return (
    <div className="level-hud" role="group" aria-label="Your level">
      <span>Level {level}</span>
      <progress
        aria-label="XP to next level"
        value={level === 100 ? 1 : gained}
        max={level === 100 ? 1 : needed}
      />
      <small>{level === 100 ? "Max level" : `${gained} / ${needed} XP`}</small>
    </div>
  );
}

export function LadderPanel({
  progression,
  shifts,
  onTitle,
}: {
  progression: Progression;
  shifts: ShiftsSave;
  onTitle: (title: string | null) => void;
}) {
  return (
    <section className="ladder-panel" aria-label="Your progression">
      <h3>Your climb</h3>
      <p>Every game moves you forward. Choose the path you enjoy.</p>
      {LADDERS.map((ladder) => {
        const rank = rankOf(progression.xp[ladder]);
        const next = RANK_XP[rank + 1];
        return (
          <details key={ladder} className="ladder" data-ladder={ladder}>
            <summary>
              <strong>{LABELS[ladder]}</strong>
              <span>{RANKS[ladder][rank]}</span>
              <small>{rank + 1} / 10</small>
            </summary>
            <p>{HINTS[ladder]}</p>
            <progress
              aria-label={`${LABELS[ladder]} rank progress`}
              value={
                next === undefined ? 1 : progression.xp[ladder] - RANK_XP[rank]
              }
              max={next === undefined ? 1 : next - RANK_XP[rank]}
            />
            <p>
              {next === undefined
                ? "Top rank reached"
                : `${next - progression.xp[ladder]} XP to ${RANKS[ladder][rank + 1]}`}
            </p>
            <ol>
              {RANKS[ladder].map((name, index) => (
                <li key={name} data-earned={index <= rank}>
                  <span>{name}</span>
                  <small>
                    {RANK_XP[index].toLocaleString("en-US")} XP
                    {index > 0 ? ` · +${index * 100} coins` : ""}
                  </small>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
      <h3>Careers</h3>
      <p>Work shifts to get promoted. Every rank pays more.</p>
      {CAREERS.map((id) => {
        const def = CAREER_DEFS[id];
        const rank = careerRank(shifts.worked, id);
        const worked = careerShifts(shifts.worked, id);
        const next = RANK_SHIFTS[rank + 1];
        return (
          <details key={id} className="ladder" data-career={id}>
            <summary>
              <strong>{def.label}</strong>
              <span>{def.ranks[rank]}</span>
              <small>
                {rank + 1} / {def.ranks.length}
              </small>
            </summary>
            <p>{def.where}</p>
            <p>
              {next === undefined
                ? `${worked} shifts worked. Top rank reached`
                : `${worked} shifts worked. ${next - worked} more to ${def.ranks[rank + 1]}`}
            </p>
            <ol>
              {def.ranks.map((name, index) => (
                <li key={name} data-earned={index <= rank}>
                  <span>{name}</span>
                  <small>
                    {RANK_SHIFTS[index]} shifts
                    {index > 0
                      ? ` · +${Math.round(index * RAISE_PER_RANK * 100)}% pay · +${index * PROMOTION_BONUS} coins`
                      : ""}
                  </small>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
      <label className="title-picker">
        Name tag title
        <select
          value={progression.title ?? ""}
          onChange={(e) => onTitle(e.target.value || null)}
        >
          <option value="">No title</option>
          {LADDERS.flatMap((ladder) =>
            RANKS[ladder]
              .slice(0, rankOf(progression.xp[ladder]) + 1)
              .map((name, rank) => (
                <option key={`${ladder}:${rank}`} value={`${ladder}:${rank}`}>
                  {LABELS[ladder]} · {name}
                </option>
              )),
          )}
        </select>
      </label>
    </section>
  );
}

export function RankMoment({
  progression,
  muted,
}: {
  progression: Progression;
  muted: boolean;
}) {
  const previous = useRef(progression);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const promotions = LADDERS.filter(
      (ladder) =>
        rankOf(progression.xp[ladder]) > rankOf(previous.current.xp[ladder]),
    );
    previous.current = progression;
    if (promotions.length === 0) return;
    setMessage(
      promotions
        .map(
          (ladder) =>
            `${LABELS[ladder]} · ${RANKS[ladder][rankOf(progression.xp[ladder])]}`,
        )
        .join(" / "),
    );
    if (!muted) playFanfare(1);
  }, [progression, muted]);
  useEffect(() => {
    if (message === null) return;
    const timer = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);
  return message === null ? null : (
    <aside className="rank-moment" role="status" aria-label="Rank up">
      <span aria-hidden="true">✦</span>
      <strong>Rank up!</strong>
      <p>{message}</p>
      <small>New title earned · coin bonus added</small>
      <button
        type="button"
        aria-label="Close rank up"
        onClick={() => setMessage(null)}
      >
        ×
      </button>
    </aside>
  );
}
