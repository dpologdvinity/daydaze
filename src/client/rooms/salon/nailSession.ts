import {
  finish,
  newSession,
  paint,
  sessionOver,
  type Nail,
  type Session,
} from "../../../game/nails.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A shift at the nail station: the session, and when this client sat. */
const OFF = {
  on: false,
  session: newSession(0) as Session,
  since: 0,
  last: null as { right: number; tip: number } | null,
};

export const nails = createStore(OFF);

export function start(now: number) {
  nails.set({
    on: true,
    session: newSession(Math.floor(Math.random() * 1e6)),
    since: now,
    last: null,
  });
}

export const leave = () => nails.set(OFF);

export function coat(nail: number, c: Nail) {
  nails.set({ session: paint(nails.get().session, nail, c) });
}

export function handOver(now: number) {
  const s = nails.get();
  if (!s.on || sessionOver(s.session)) return;
  const r = finish(s.session, (now - s.since) / 1000);
  nails.set({
    session: r.session,
    since: now,
    last: { right: r.right, tip: r.tip },
  });
  if (sessionOver(r.session)) award("nails", r.session.points);
}
