/**
 * True when a key press belongs to a minigame dialog, a text field or a
 * dressing-room picker, not the world. An open modal dialog owns every key.
 */
export function ignoresKeys(target: EventTarget | null, code: string): boolean {
  if (document.querySelector("dialog[open]")) return true;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("input, textarea, select")) return true;
  // arrow keys inside the closet move between options, not the doll
  return (
    code.startsWith("Arrow") && target.closest("[role=radiogroup]") !== null
  );
}
