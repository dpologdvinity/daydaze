import {
  ALL_DANCE_MOVES,
  stillClipsOf,
  type DanceMoveId,
} from "../../game/dance/moves.ts";
import { Chips } from "./controls.tsx";

/** The dance moves, shown while the Dance mood is on. Keyboard: Tab, then Space or Enter. */
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
        options={ALL_DANCE_MOVES}
        value={move}
        onPick={onPick}
      />
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
