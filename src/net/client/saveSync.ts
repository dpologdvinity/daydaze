// A signed-in player's save goes up to the server a few seconds after the
// last change, so a burst of edits (dressing up, decorating) is one upload.

type Timers = {
  set: (fn: () => void, ms: number) => number;
  clear: (id: number) => void;
};

export function createSaveSync<T>({
  put,
  delayMs,
  timers,
}: {
  put: (value: T) => void;
  delayMs: number;
  timers: Timers;
}) {
  let waiting: { value: T } | null = null;
  let timer: number | null = null;
  const stop = () => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };
  const flush = () => {
    stop();
    if (!waiting) return;
    const { value } = waiting;
    waiting = null;
    put(value);
  };
  return {
    push(value: T) {
      waiting = { value };
      stop();
      timer = timers.set(flush, delayMs);
    },
    flush,
    cancel() {
      stop();
      waiting = null;
    },
  };
}
