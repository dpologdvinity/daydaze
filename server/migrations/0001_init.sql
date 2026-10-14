-- Accounts. Player ids are "u_" + 22 base64url chars, so they double as network ids.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  -- Lowercased, so "Kai" and "kai" cannot both exist.
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  -- Reserved for the age gate; not collected yet.
  birthdate TEXT,
  created_at INTEGER NOT NULL
);

-- One row per cookie. Guests have no user_id and keep their generated name here.
CREATE TABLE sessions (
  -- SHA-256 of the cookie token; the token itself is never stored.
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  guest_name TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE saves (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Keyed by player id: permanent for accounts, per session for guests.
CREATE TABLE blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX blocks_blocked ON blocks (blocked_id);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  room_id TEXT NOT NULL,
  copy INTEGER NOT NULL,
  -- JSON array of the room copy's last 20 chat lines, unfiltered.
  chat TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- A ban matches a player id, an IP address, or both.
CREATE TABLE bans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  ip TEXT,
  reason TEXT,
  created_at INTEGER NOT NULL,
  CHECK (player_id IS NOT NULL OR ip IS NOT NULL)
);
CREATE INDEX bans_player ON bans (player_id);
CREATE INDEX bans_ip ON bans (ip);
