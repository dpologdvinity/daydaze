-- A friend request from one player to another; two players are friends when
-- each has asked the other. Keyed by player id, like blocks: permanent for
-- accounts, per session for guests.
CREATE TABLE friend_requests (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX friend_requests_to ON friend_requests (to_id);
