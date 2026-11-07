/**
 * Writes a `data-*` attribute only when its value changed. Frame loops publish
 * state for tests and screenshots (`canvas[data-player-x]`, ...); an attribute
 * write every frame, even of the same text, is a DOM mutation that notifies
 * observers and can invalidate style. Reading a dataset value is cheap.
 */
export function setData(
  dataset: DOMStringMap,
  key: string,
  value: string,
): void {
  if (dataset[key] !== value) dataset[key] = value;
}
