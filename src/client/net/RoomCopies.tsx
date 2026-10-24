// Lists the copies of your current room with head counts, and switches to
// another copy on request. Loads once per session; refreshes after a switch.

import { useEffect, useState, type JSX } from "react";
import { ROOMS } from "../../game/rooms.ts";
import { onlineSession } from "./online.ts";

type Listing = Awaited<
  ReturnType<NonNullable<ReturnType<typeof onlineSession>>["copies"]>
>;

/** The copies of the room you're in ("Daydaze Plaza #2, 12 here"), to hop
 * to a busier or quieter one. */
export function RoomCopies(): JSX.Element | null {
  const session = onlineSession();
  const [list, setList] = useState<Listing>(null);
  const refresh = () => void session?.copies().then(setList);
  useEffect(refresh, [session]);
  if (!session || !list) return null;
  const name = ROOMS[list.roomId].name;
  return (
    <section className="room-copies" aria-label="Room copies">
      <h3>
        You're in {name} #{list.copy}
      </h3>
      <ul>
        {list.copies.map((c) => (
          <li key={c.copy}>
            {name} #{c.copy}: {c.count} here{c.full ? " (full)" : ""}{" "}
            {c.copy !== list.copy && (
              <button
                type="button"
                disabled={c.full}
                onClick={() =>
                  void session.switchCopy(c.copy).then(() => refresh())
                }
              >
                Go to #{c.copy}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
