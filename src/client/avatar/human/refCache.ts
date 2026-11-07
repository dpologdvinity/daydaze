/**
 * A reference-counted cache with a small keep-alive list, for things that are
 * costly to make and to upload (a painted face texture is a 1024 px canvas
 * drawn on the main thread). Dolls with the same look share one value; when
 * the last holder lets go the value waits in an LRU list of `keep` entries, so
 * a pedestrian who walks out of range and back does not repaint her face. The
 * oldest idle value beyond `keep` is disposed.
 *
 * Pure bookkeeping: `create` and `dispose` are injected, so it is tested
 * without a browser.
 */
export class RefCache<V, A = undefined> {
  private readonly live = new Map<string, { value: V; refs: number }>();
  /** Idle keys, oldest first (a Map keeps insertion order). */
  private readonly idle = new Map<string, V>();

  private readonly create: (key: string, arg: A) => V;
  private readonly dispose: (value: V) => void;
  private readonly keep: number;

  constructor(
    create: (key: string, arg: A) => V,
    dispose: (value: V) => void,
    keep: number,
  ) {
    this.create = create;
    this.dispose = dispose;
    this.keep = keep;
  }

  /** The value for `key`, made from `arg` on first use. Pair every call with `release`. */
  acquire(key: string, arg: A): V {
    const held = this.live.get(key);
    if (held) {
      held.refs += 1;
      return held.value;
    }
    const revived = this.idle.get(key);
    if (revived !== undefined) {
      this.idle.delete(key);
      this.live.set(key, { value: revived, refs: 1 });
      return revived;
    }
    const value = this.create(key, arg);
    this.live.set(key, { value, refs: 1 });
    return value;
  }

  /** Lets go of one `acquire`; the value idles at zero and is evicted later. */
  release(key: string): void {
    const held = this.live.get(key);
    if (!held) return;
    held.refs -= 1;
    if (held.refs > 0) return;
    this.live.delete(key);
    this.idle.set(key, held.value);
    for (const [oldKey, old] of this.idle) {
      if (this.idle.size <= this.keep) break;
      this.idle.delete(oldKey);
      this.dispose(old);
    }
  }

  /** How many values are held by someone, and how many idle (for tests). */
  get size(): { live: number; idle: number } {
    return { live: this.live.size, idle: this.idle.size };
  }
}
