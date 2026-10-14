// Test doubles for the client library: a scriptable socket and manual timers.
import type {
  Schedule,
  SocketEvent,
  SocketLike,
} from "./WebSocketTransport.ts";

export class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = [];
  readyState = 0;
  readonly sent: string[] = [];
  closedWith: number | null = null;
  private readonly listeners = new Map<
    string,
    ((event: SocketEvent) => void)[]
  >();

  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }
  static latest(): FakeSocket {
    const socket = FakeSocket.instances.at(-1);
    if (!socket) throw new Error("no socket opened");
    return socket;
  }
  addEventListener(type: string, listener: (event: SocketEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  send(data: string): void {
    if (this.readyState !== 1) throw new Error("not open");
    this.sent.push(data);
  }
  close(code = 1000): void {
    if (this.readyState === 3) return;
    this.closedWith = code;
    this.drop(code);
  }
  open(): void {
    this.readyState = 1;
    this.emit("open", {});
  }
  receive(data: unknown): void {
    this.emit("message", { data });
  }
  drop(code: number): void {
    this.readyState = 3;
    this.emit("close", { code });
  }
  private emit(type: string, event: SocketEvent): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

export class FakeTimers {
  now = 0;
  private queue: { at: number; callback: () => void; cancelled: boolean }[] =
    [];
  readonly delays: number[] = [];

  readonly schedule: Schedule = (callback, delayMs) => {
    const entry = { at: this.now + delayMs, callback, cancelled: false };
    this.queue.push(entry);
    this.delays.push(delayMs);
    return () => {
      entry.cancelled = true;
    };
  };
  pending(): number {
    return this.queue.filter((entry) => !entry.cancelled).length;
  }
  /** Advances the clock, running due callbacks in time order. */
  advance(ms: number): void {
    const until = this.now + ms;
    for (;;) {
      const next = this.queue
        .filter((entry) => !entry.cancelled && entry.at <= until)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.queue = this.queue.filter((entry) => entry !== next);
      this.now = next.at;
      next.callback();
    }
    this.now = until;
  }
}
