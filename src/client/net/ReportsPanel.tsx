import { useEffect, useState, type JSX } from "react";
import { ROOMS } from "../../game/rooms.ts";
import type { Report } from "../../net/client/api.ts";
import { onlineSession } from "./online.ts";

/** Admins only: the latest reports, each with the chat that came before. */
export function ReportsPanel(): JSX.Element | null {
  const session = onlineSession();
  const admin = session?.identity()?.isAdmin === true;
  const [reports, setReports] = useState<Report[] | null>(null);
  useEffect(() => {
    if (admin) void session?.reports().then(setReports);
  }, [admin, session]);
  if (!admin) return null;
  return (
    <section className="reports" aria-label="Reports">
      <h3>Reports</h3>
      {!reports ? (
        <p>Loading reports…</p>
      ) : reports.length === 0 ? (
        <p>No reports.</p>
      ) : (
        <ul>
          {reports.map((r) => (
            <li key={r.id}>
              <details>
                <summary>
                  {r.reason}: {r.targetId} in {ROOMS[r.roomId].name} #{r.copy},{" "}
                  {new Date(r.at).toLocaleString()}
                </summary>
                <p>Reported by {r.reporterId}</p>
                <ul aria-label="Chat before the report">
                  {r.chat.map((line, i) => (
                    <li key={i}>
                      <b>{line.name}:</b> {line.text}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
