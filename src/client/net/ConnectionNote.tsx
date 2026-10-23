import { useEffect, useState, type JSX } from "react";
import { connectionNote } from "../../net/client/connectionNote.ts";
import { onlineSession } from "./online.ts";

/** A HUD line while the connection is down, refused or offline. */
export function ConnectionNote(): JSX.Element | null {
  const session = onlineSession();
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!session) {
      setNote(connectionNote("offline", null));
      return;
    }
    let code: number | null = null;
    const show = () => setNote(connectionNote(session.status(), code));
    const offs = [
      session.on("status", show),
      session.on("closeCode", (c) => {
        code = c;
        show();
      }),
    ];
    show();
    return () => offs.forEach((off) => off());
  }, [session]);
  return note ? (
    <p className="notice connection-note" role="status" aria-label="Connection">
      {note}
    </p>
  ) : null;
}
