import { useState, type JSX } from "react";
import type { SaveV1 } from "../../game/save.ts";
import { account, signIn, signOut } from "./account.ts";

/** Sign up, log in or log out, inside the Friends panel. */
export function AccountPanel({
  save,
  onSave,
}: {
  save: SaveV1;
  onSave: (save: SaveV1) => void;
}): JSX.Element {
  const { me, busy, note } = account.use();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const go = (kind: "signup" | "login") =>
    void signIn(kind, username.trim(), password, save, onSave).then(() =>
      setPassword(""),
    );
  return (
    <section className="account" aria-label="Account">
      <h3>Account</h3>
      {me && !me.isGuest ? (
        <>
          <p>Signed in as {me.name}. Your progress saves to your account.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut(save)}
          >
            Log out
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go("login");
          }}
        >
          <p>
            Playing as a guest. Sign up to keep your progress on any device.
          </p>
          <label>
            Name
            <input
              value={username}
              autoComplete="username"
              maxLength={16}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="game-row">
            <button type="submit" disabled={busy}>
              Log in
            </button>
            <button type="button" disabled={busy} onClick={() => go("signup")}>
              Sign up
            </button>
          </div>
        </form>
      )}
      {note && <p role="status">{note}</p>}
    </section>
  );
}
