# AnalyticCollector

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![nginx](https://img.shields.io/badge/nginx-009639?style=flat&logo=nginx&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

A self-hosted, client-side analytics pipeline — a lightweight, privacy-respecting alternative to
third-party analytics that you own end-to-end. A browser collector script reports page,
performance, and interaction data to a REST API, which persists it to PostgreSQL and renders it
live on a dashboard. The whole stack is containerized and served behind an nginx reverse proxy.

Live at [eemami.dev](https://eemami.dev).

## Highlights

- **Full pipeline, not just a dashboard.** Browser collector → REST API → PostgreSQL → live,
  searchable/sortable grid — designed, built, and deployed end to end.
- **No third-party analytics.** Session, performance, and interaction data never leaves
  infrastructure you control.
- **Production-shaped, not a script.** A single containerized Express service behind nginx, a
  PostgreSQL database, and Docker Compose orchestration wiring it all together.
- **Resilient collector.** Activity events are queued in `localStorage`, flushed in batches on an
  interval, retried on failure, and flushed one last time via `navigator.sendBeacon` on page
  unload — so a slow network or a closed tab doesn't lose data.
- **Hand-built design system.** The dashboard's UI is a from-scratch CSS design system inspired by
  VS Code's Dark High Contrast theme — no UI framework — driving a live ZingGrid data table.

## What it captures

| Dataset         | Captured on           | Fields                                                                    |
| --------------- | ---------------------- | -------------------------------------------------------------------------- |
| **Static**      | Once per session       | Language, cookies/JS/images/CSS support, connection type                  |
| **Performance** | Page load               | Total load time, start/end timestamps, navigation type (Navigation Timing) |
| **Activity**    | Continuously, batched   | Mouse, scroll, and keyboard events, JS errors, idle/enter/leave transitions |

## Architecture

Three containers, wired together by `compose.yaml`. Only `proxy` is published to the host — it
either serves a static file straight from `public_html/` or reverse-proxies to the API.

```
                        ┌─────────────────────────────────────────┐
                        │        proxy (nginx:latest)              │
  browser  ───:80───▶   │        nginx/default.conf                │
                        └───────────────┬───────────────────────┘
                                         │
                    static files        │        /api/**
                    public_html/**      │        proxy_pass http://api:3000
                    (bind mount)        │
                                         ▼
                        ┌───────────────────────────┐        ┌────────────┐
                        │   api (Node/Express)       │──────▶ │  database  │
                        │   built from api/Dockerfile │        │ (postgres) │
                        └───────────────────────────┘        └────────────┘
```

- **`api/`** — the backend: one Express app, one PostgreSQL connection pool. No microservices,
  no per-feature backends.
- **`public_html/`** — the static site, bind-mounted straight into the `proxy` container.
- **`nginx/default.conf`** — the `proxy` container's config: static files + a `/api/` reverse
  proxy to the `api` service (Docker Compose's built-in DNS resolves `api`/`database` by service
  name, so there are no hardcoded IPs).
- **`compose.yaml`** — defines and wires the three services (`proxy`, `api`, `database`) and the
  `postgres_data` volume.

## Directory layout

```
.
├── api/                          # backend service
│   ├── Dockerfile
│   ├── server.js                 # entrypoint: connect Postgres, app.listen
│   ├── src/
│   │   ├── app.js                # express() assembly (cors, json, routes, errors)
│   │   ├── config/db.js          # pg Pool connection + schema bootstrap
│   │   ├── routes/                # health.js, static.js, perf.js, activity.js
│   │   └── middleware/errorHandler.js
│   ├── package.json
│   └── .env.example              # standalone (non-Docker) dev config
├── nginx/
│   └── default.conf              # proxy service config: static + /api/ reverse proxy
├── compose.yaml                  # proxy + api + database services
├── .env.example                  # DB_USER / DB_PASSWORD / DB_NAME for compose.yaml
└── public_html/                  # bind-mounted into the proxy container
    ├── database.html, 404.html   # dashboard + error page
    ├── globals/theme.css         # shared design system
    └── js/api_hooked_collector.js   # ships static/perf/activity telemetry to /api/*
```

## Getting started

**Docker Compose (recommended — matches production):**

```bash
git clone https://github.com/elyasemami/analyticcollector.git
cd analyticcollector
cp .env.example .env      # set DB_USER / DB_PASSWORD / DB_NAME
docker compose up --build
```

Dashboard on `http://localhost/`, API behind the proxy at `http://localhost/api/`.

**Standalone API (no Docker), against a local/dev Postgres instance:**

```bash
cd api
cp .env.example .env      # set DATABASE_URL
npm install
npm start                 # API on http://127.0.0.1:3000
```

The static site can then be served with anything (`npx serve public_html`) — just make sure
`/api/` is proxied to port 3000 (see `nginx/default.conf` for the shape) so
`api_hooked_collector.js` and the `database.html` dashboard can reach it.

## Deployment

```bash
docker compose up -d --build
```

`proxy` is the only service published to the host (port 80); `api` and `database` are only
reachable over the compose network. Postgres data persists in the `postgres_data` volume.

## API reference

All routes are mounted under `/api`.

| Method         | Path                              | Description                                   |
| -------------- | ---------------------------------- | --------------------------------------------- |
| GET            | `/api/health`                     | Postgres ping check                           |
| GET            | `/api/static`                     | Last 1000 static/env snapshots                |
| POST           | `/api/static`                     | Record one static snapshot                    |
| GET            | `/api/perf`                       | Last 1000 page-load performance records       |
| POST           | `/api/perf`                       | Record one performance entry                  |
| GET            | `/api/activity`                   | Last 1000 activity events                     |
| POST           | `/api/activity`                   | Record one activity event, or a batch (array) |
| GET/PUT/DELETE | `/api/{static,perf,activity}/:id` | Fetch, update, or delete a single record      |

### Environment variables

Docker Compose (`.env` at repo root, read by `compose.yaml`):

| Variable      | Description                                    |
| ------------- | ----------------------------------------------- |
| `DB_USER`     | Postgres user (also `api`'s `DB_USER`)           |
| `DB_PASSWORD` | Postgres password                                |
| `DB_NAME`     | Database name created on first `database` boot   |

Standalone API dev (`api/.env`, only used when running `api/` outside Docker):

| Variable       | Default                               | Description                                                      |
| -------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | *(unset — falls back to `DB_*` below)* | Full Postgres connection string, takes precedence over `DB_*`     |
| `DB_HOST`      | `127.0.0.1`                            | Postgres host                                                      |
| `DB_PORT`      | `5432`                                 | Postgres port                                                      |
| `DB_USER`      | `postgres`                             | Postgres user                                                      |
| `DB_PASSWORD`  | `postgres`                             | Postgres password                                                  |
| `DB_NAME`      | `analytics`                            | Database name                                                      |
| `PORT`         | `3000`                                 | API listen port                                                    |

## Background

Originally built as coursework for UC San Diego's CSE 135 (Web Development), where the project
started as several overlapping prototype backends (Mongo, a file-backed API, a JSON mock server)
behind Apache. It's since been consolidated into the single containerized Express/PostgreSQL
service described above and rebuilt for production deployment on Docker Compose behind nginx.

## Author

**Elyas Emami**
[eemami.dev](https://eemami.dev) · [GitHub](https://github.com/elyasemami) · [analyticcollector repo](https://github.com/elyasemami/analyticcollector)
