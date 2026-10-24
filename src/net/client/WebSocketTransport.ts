// The browser's room socket: wraps a WebSocket (injected, so tests use a fake)
// as a NetworkTransport that reconnects with jittered backoff after a drop.
// Close codes in FINAL_CODES stop it for good; every close code is still passed
// to onCloseCode so the session can react (for example, try another copy when
// one is full).

import { CLOSE_CODES } from "../networkProtocol.ts";
import type { NetworkTransport } from "../roomNetworkSync.ts";
import { nextDelay } from "./backoff.ts";

/**
 * Connection state. "closed" is final: the transport never reconnects after it.
 */
export type TransportStatus = "connecting" | "open" | "reconnecting" | "closed";
/**
 * The fields of a WebSocket event the transport reads: `data` on messages,
 * `code` on close.
 */
export type SocketEvent = { readonly data?: unknown; readonly code?: number };
/** The slice of the browser WebSocket this transport uses. */
export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: SocketEvent) => void,
  ): void;
}
/** Runs `callback` after `delayMs`; the returned function cancels it. */
export type Schedule = (callback: () => void, delayMs: number) => () => void;
/**
 * `url` is the full ws(s) URL of the room socket. `schedule` and `random`
 * default to setTimeout and Math.random; tests inject their own to control
 * retries and jitter.
 */
export type WebSocketTransportOptions = {
  url: string;
  WebSocket: new (url: string) => SocketLike;
  schedule?: Schedule;
  random?: () => number;
};

// Retrying these would fight the server: the copy is full, the player is
// banned or kicked, another tab took over, or this client is broken.
const FINAL_CODES: ReadonlySet<number> = new Set([
  CLOSE_CODES.left,
  CLOSE_CODES.invalid,
  CLOSE_CODES.full,
  CLOSE_CODES.kicked,
  CLOSE_CODES.banned,
  CLOSE_CODES["invalid-messages"],
  CLOSE_CODES.replaced,
]);

const defaultSchedule: Schedule = (callback, delayMs) => {
  const handle = setTimeout(callback, delayMs);
  return () => clearTimeout(handle);
};

/** A room socket that reconnects with backoff until the server says stop. */
export class WebSocketTransport implements NetworkTransport {
  private readonly options: Required<WebSocketTransportOptions>;
  private socket: SocketLike | null = null;
  private state: TransportStatus = "connecting";
  private attempt = 0;
  private cancelRetry: (() => void) | null = null;
  private messageHandler: (message: string) => void = () => {};
  private closeHandler: () => void = () => {};
  private statusHandler: (status: TransportStatus) => void = () => {};
  private closeCodeHandler: (code: number) => void = () => {};

  constructor(options: WebSocketTransportOptions) {
    this.options = {
      schedule: defaultSchedule,
      random: Math.random,
      ...options,
    };
    this.connect();
  }

  status(): TransportStatus {
    return this.state;
  }
  isConnected(): boolean {
    return this.state === "open";
  }
  send(message: string): void {
    if (this.state !== "open") return;
    try {
      this.socket?.send(message);
    } catch {
      // The close event that follows decides whether to reconnect.
    }
  }
  close(): void {
    if (this.state === "closed") return;
    const socket = this.socket;
    this.socket = null;
    this.cancelRetry?.();
    this.cancelRetry = null;
    socket?.close(CLOSE_CODES.left);
    this.finish();
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandler = handler;
  }
  /** Fires once, when the transport stops for good. */
  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }
  onStatus(handler: (status: TransportStatus) => void): void {
    this.statusHandler = handler;
  }
  /** Every server close code, final or not (4001 full: try the next copy). */
  onCloseCode(handler: (code: number) => void): void {
    this.closeCodeHandler = handler;
  }

  private connect(): void {
    const socket = new this.options.WebSocket(this.options.url);
    this.socket = socket;
    // Events from a socket we already replaced or closed are ignored.
    const current = () => this.socket === socket;
    socket.addEventListener("open", () => {
      if (!current()) return;
      this.attempt = 0;
      this.setStatus("open");
    });
    socket.addEventListener("message", ({ data }) => {
      if (current() && typeof data === "string") this.messageHandler(data);
    });
    socket.addEventListener("close", ({ code = 1006 }) => {
      if (!current()) return;
      this.socket = null;
      this.closeCodeHandler(code);
      if (FINAL_CODES.has(code)) this.finish();
      else this.retry();
    });
  }

  private retry(): void {
    this.setStatus("reconnecting");
    const delay = nextDelay(this.attempt++, this.options.random);
    this.cancelRetry = this.options.schedule(() => {
      this.cancelRetry = null;
      this.connect();
    }, delay);
  }

  private finish(): void {
    this.setStatus("closed");
    this.closeHandler();
  }

  private setStatus(status: TransportStatus): void {
    if (this.state === status) return;
    this.state = status;
    this.statusHandler(status);
  }
}
