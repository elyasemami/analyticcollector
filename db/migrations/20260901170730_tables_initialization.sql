-- migrate:up
CREATE TABLE sessions (
  sid           UUID PRIMARY KEY,
  site          TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- derived server-side from headers; no raw IP stored
  visitor_hash  TEXT NOT NULL,
  country       TEXT,
  browser       TEXT,
  os            TEXT,
  device        TEXT,
  referrer      TEXT,
  lr_session_url TEXT           
);

CREATE TABLE events (
  id        BIGSERIAL PRIMARY KEY,
  sid       UUID NOT NULL REFERENCES sessions(sid) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  path      TEXT,
  payload   JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON events (occurred_at DESC);
CREATE INDEX ON events (type, occurred_at DESC);
CREATE INDEX ON events USING GIN (payload);
CREATE INDEX ON sessions (started_at DESC);


  CREATE TABLE IF NOT EXISTS static_logs (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts              BIGINT      NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cookies_enabled BOOLEAN     NOT NULL DEFAULT false,
    js_enabled      BOOLEAN     NOT NULL DEFAULT false,
    images_allowed  BOOLEAN     NOT NULL DEFAULT false,
    css_allowed     BOOLEAN     NOT NULL DEFAULT false,
    session_id      TEXT        NOT NULL,
    page            TEXT,
    ua              TEXT,
    language        TEXT,
    connection      TEXT,
    screen          JSONB,
    viewport        JSONB
  );

  CREATE INDEX IF NOT EXISTS static_logs_session_ts_idx
    ON static_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS static_logs_created_at_brin
    ON static_logs USING BRIN (created_at) WITH (pages_per_range = 32);

  CREATE TABLE IF NOT EXISTS perf_logs (
    id               BIGINT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts               BIGINT           NOT NULL,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
    started_at       DOUBLE PRECISION,
    ended_at         DOUBLE PRECISION,
    total_ms         INTEGER,
    session_id       TEXT             NOT NULL,
    page             TEXT,
    navigation_entry JSONB,
    timing           JSONB
  );

  CREATE INDEX IF NOT EXISTS perf_logs_session_ts_idx
    ON perf_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS perf_logs_created_at_brin
    ON perf_logs USING BRIN (created_at) WITH (pages_per_range = 32);

  CREATE TABLE IF NOT EXISTS activity_logs (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts         BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id TEXT        NOT NULL,
    page       TEXT,
    kind       TEXT        NOT NULL DEFAULT 'event',
    payload    JSONB
  );

  CREATE INDEX IF NOT EXISTS activity_logs_session_ts_idx
    ON activity_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS activity_logs_kind_ts_idx
    ON activity_logs (kind, ts DESC);
  CREATE INDEX IF NOT EXISTS activity_logs_created_at_brin
    ON activity_logs USING BRIN (created_at) WITH (pages_per_range = 32);

-- migrate:down

