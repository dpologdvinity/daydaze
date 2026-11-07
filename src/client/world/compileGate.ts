/**
 * Decides when to compile shaders for content that streamed into a room after
 * its first warm-up (a walker, a hair style, the next block of trees). A
 * program first drawn in a frame is compiled and linked inside that frame
 * (a stall of tens to hundreds of milliseconds); handing the new materials to
 * `compileAsync` a moment earlier lets the driver link them in parallel while
 * frames keep coming.
 *
 * The gate only counts: it says "compile now" once something has been added
 * since the last compile, at most once per `interval` seconds, and never while
 * a compile is still running. Pure, so it is tested without a renderer.
 */
export class CompileGate {
  private readonly interval: number;
  private seen = 0;
  private last = -Infinity;
  private running = false;

  constructor(interval: number) {
    this.interval = interval;
  }

  /**
   * Called every so often with the number of drawable objects in the scene
   * and the clock in seconds. True means: start a compile, then call `done`.
   */
  check(count: number, now: number): boolean {
    // objects that left count against nothing; re-adding them is new again
    if (count < this.seen) this.seen = count;
    if (this.running || count <= this.seen || now - this.last < this.interval)
      return false;
    this.running = true;
    this.seen = count;
    this.last = now;
    return true;
  }

  /** The compile started by `check` has finished (or failed). */
  done(): void {
    this.running = false;
  }
}
