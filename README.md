# analyticcollector

CSE135 (UC San Diego, Web Development) coursework site for **eemami.dev**, plus a client-side
analytics pipeline (Homework 3) layered on top of it: a collector script (`public_html/js/api_hooked_collector.js`)
reports page/performance/activity telemetry into a single Express/PostgreSQL backend, visualized
live on the site via [ZingGrid](https://www.zinggrid.com/) / [ZingChart](https://www.zingchart.com/).

## What changed in this refactor

The project previously had three overlapping backend implementations and an Apache front end.
This pass collapsed it to a single monolithic app behind nginx, and removed dead/duplicate files
that had accumulated across earlier homework iterations.

| Area                                                            | Before                                                                                                                                                   | After                                                                                                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend                                                         | 3 parallel APIs: `api/server.js` (Mongo, live), `public_html/api/` (file-backed prototype), `public_html/db.json` + `js/collector.js` (json-server mock) | 1 backend: `api/` (Express + PostgreSQL)                                                                                                                  |
| `api/` structure                                                | Single 170-line `server.js` with routes, Mongo setup, and boot logic inline                                                                              | Split into `server.js` (entrypoint), `src/app.js`, `src/config/db.js`, `src/routes/{health,static,perf,activity}.js`, `src/middleware/errorHandler.js` |
| Web server                                                      | Apache 2 (`configs/apache-vhost.eemami.dev.conf`), CGI via built-in `mod_cgi`                                                                            | Docker Compose (`compose.yaml`): nginx `proxy` service (`nginx/default.conf`) serves `public_html/` and reverse-proxies `/api/`; CGI demos retired         |
| Process management                                              | API started by hand (`node server.js`)                                                                                                                   | `compose.yaml` `api` service — built from `api/Dockerfile`, restarted by Docker                                                                        |
| `public_html/api/`                                              | Present: `serv.notext` prototype server, own `package.json`/lockfile, `data/*.json`                                                                      | Removed (superseded by `api/`)                                                                                                                         |
| `public_html/db.json`, `db1.json`                               | Present: json-server mock data (`db1.json` was 0 bytes)                                                                                                  | Removed                                                                                                                                                |
| `public_html/js/collector.js`                                   | Present, unreferenced by any page (superseded by `api_hooked_collector.js`)                                                                              | Removed                                                                                                                                                |
| `public_html/package.json`                                      | Present, declared `main: server.js` but no such file existed                                                                                             | Removed                                                                                                                                                |
| `public_html/hello.php`                                         | Present, unreferenced `phpinfo()` page (info-disclosure risk)                                                                                            | Removed                                                                                                                                                |
| `index1.html`, `database1.html`                                 | Present, unreferenced draft duplicates of `index.html`/`database.html`                                                                                   | Removed                                                                                                                                                |
| `node_modules/` in git                                          | Two directories committed (`public_html/api/`, `public_html/learning_node/`) despite partial `.gitignore` rules                                          | Untracked; blanket `node_modules/` rule added to `.gitignore`                                                                                          |
| `README.md`                                                     | 35 lines, Homework 2 (Python/PHP) links only                                                                                                             | Full project doc: architecture, directory layout, dev/deploy steps, API reference, all 4 CGI languages                                                 |
| `public_html/cgi-bin/**`                                        | Present — graded coursework CGI demos (Homework 2)                                                                                                       | Removed — retired along with Apache/`mod_cgi`; no CGI runner in the Docker setup                                                                        |

## Architecture

Three containers, wired together by `compose.yaml`. Only `proxy` is published to the host —
it either serves a static file straight from `public_html/` or reverse-proxies to the API.

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

- **`api/`** — the single backend process (the "monolith"): one Express app, one PostgreSQL
  connection pool. No separate microservices, no per-feature backends.
- **`public_html/`** — the static site, bind-mounted straight into the `proxy` container; nothing
  else touches it.
- **`nginx/default.conf`** — the `proxy` container's config: static files + the `/api/` reverse
  proxy to the `api` service (docker-compose's built-in DNS resolves `api`/`database` by service
  name, so there are no hardcoded IPs).
- **`compose.yaml`** — defines and wires the three services (`proxy`, `api`, `database`) and the
  `postgres_data` volume.

## Directory layout

```
.
├── api/                          # the monolithic backend
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
    ├── database.html, 404.html, …
    ├── globals/theme.css         # shared site theme
    └── js/api_hooked_collector.js   # ships static/perf/activity telemetry to /api/*
```

## Local development

**Docker Compose (recommended — matches production):**

```bash
cp .env.example .env      # set DB_USER / DB_PASSWORD / DB_NAME
docker compose up --build
```

Site on `http://localhost/`, API behind the proxy at `http://localhost/api/`.

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
| -------------- | --------------------------------- | --------------------------------------------- |
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

| Variable       | Default                               | Description                                                    |
| -------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | *(unset — falls back to `DB_*` below)* | Full Postgres connection string, takes precedence over `DB_*`  |
| `DB_HOST`      | `127.0.0.1`                            | Postgres host                                                    |
| `DB_PORT`      | `5432`                                 | Postgres port                                                    |
| `DB_USER`      | `postgres`                             | Postgres user                                                    |
| `DB_PASSWORD`  | `postgres`                             | Postgres password                                                |
| `DB_NAME`      | `analytics`                            | Database name                                                    |
| `PORT`         | `3000`                                 | API listen port                                                  |

## Author

Elyas Emami — [eemami.dev](https://eemami.dev)
