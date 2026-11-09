CREATE TABLE IF NOT EXISTS revoked_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  revoked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expires_at
  ON revoked_sessions(expires_at);