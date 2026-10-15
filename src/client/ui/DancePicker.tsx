import { DANCE_MOVES, type DanceMoveId } from "../../game/dance/moves.ts";
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
        options={DANCE_MOVES}
        value={move}
        onPick={onPick}
      />
    </div>
  );
}
