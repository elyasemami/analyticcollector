-- migrate:up
DROP TABLE IF EXISTS sessions CASCADE;

DROP TABLE IF EXISTS events;

DROP INDEX IF EXISTS events;

DROP INDEX IF EXISTS sessions;

ALTER TABLE static_logs ADD COLUMN location VARCHAR(35);

-- migrate:down
CREATE TABLE sessions (
    sid UUID PRIMARY KEY,
    site TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- derived server-side from headers; no raw IP stored
    visitor_hash TEXT NOT NULL,
    country TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    referrer TEXT,
    lr_session_url TEXT
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    sid UUID NOT NULL REFERENCES sessions (sid) ON DELETE CASCADE,
    type TEXT NOT NULL,
    path TEXT,
    payload JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON events (occurred_at DESC);

CREATE INDEX ON events (type, occurred_at DESC);

CREATE INDEX ON events USING GIN (payload);

CREATE INDEX ON sessions (started_at DESC);

ALTER TABLE static_logs DROP COLUMN location;