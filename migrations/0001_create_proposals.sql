CREATE TABLE IF NOT EXISTS proposals (
  id TEXT NOT NULL UNIQUE,
  token_hash TEXT PRIMARY KEY,
  manage_token_hash TEXT NOT NULL UNIQUE,
  traveller_name TEXT NOT NULL,
  traveller_email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  estimated_price TEXT NOT NULL DEFAULT '',
  consultant_note TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','ready','approved','changes_requested','closed')),
  traveller_response TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS proposals_expires_at_idx ON proposals(expires_at);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status, updated_at);
