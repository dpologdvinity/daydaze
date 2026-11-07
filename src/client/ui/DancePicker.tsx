import {
  PICKER_DANCE_MOVES,
  PICKER_EMOTES,
  stillClipsOf,
  type DanceMoveId,
} from "../../game/dance/moves.ts";
import { Chips } from "./controls.tsx";

/**
 * The dance moves, shown while the Dance mood is on, and a row of social
 * emotes under them (wave, bow, nod, shrug...), which play the same way.
 * Keyboard: Tab, then Space or Enter.
 */
export function DancePicker({
  move,
  onPick,
}: {
  move: DanceMoveId;
  onPick: (move: DanceMoveId) => void;
}) {
  return (
    <div className="dance-picker">
      <Chips
        label="Dance move"
        options={PICKER_DANCE_MOVES}
        value={move}
        onPick={onPick}
      />
      {PICKER_EMOTES.length > 0 && (
        <Chips
          label="Emote"
          options={PICKER_EMOTES}
          value={move}
          onPick={onPick}
        />
      )}
    </div>
  );
}

/** Held poses for the Pose and Sit moods: the built one, then motion capture. */
export function HoldPicker({
  kind,
  hold,
  onPick,
}: {
  kind: "pose" | "sit";
  hold: string;
  onPick: (hold: string) => void;
}) {
  const options = [
    { id: "built", label: "Classic" },
    ...stillClipsOf(kind).map((c) => ({ id: c.id, label: c.label })),
  ];
  return (
    <div className="dance-picker">
      <Chips
        label={kind === "pose" ? "Pose" : "Sitting pose"}
        options={options}
        value={hold}
        onPick={onPick}
      />
    </div>
  );
}
