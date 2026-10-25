// "Copy invite link" on the room card, once online play has put you in a
// room copy: the link (`/?join=<room>.<copy>`) brings a friend straight into
// the same copy. The link also shows in the status line, for browsers that
// block the clipboard.

import { useEffect, useState } from "react";
import { inviteLink } from "../flags.ts";
import { onlineSession } from "./online.ts";

export function InviteButton() {
  const session = onlineSession();
  const [at, setAt] = useState(() => session?.room() ?? null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    const refresh = () => setAt(session.room());
    refresh();
    return session.on("snapshot", refresh);
  }, [session]);
  // a new room copy, a new link
  useEffect(() => setCopied(null), [at?.roomId, at?.copy]);
  if (!at) return null;
  const link = inviteLink(location.origin, at.roomId, at.copy);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(`Invite link copied: ${link}`);
    } catch {
      setCopied(`Copy this invite link: ${link}`);
    }
  };
  return (
    <div className="invite">
      <button type="button" onClick={() => void copy()}>
        Copy invite link
      </button>
      {copied && (
        <p className="invite-note" role="status">
          {copied}
        </p>
      )}
    </div>
  );
}
