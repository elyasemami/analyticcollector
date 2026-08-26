# analyticcollector

CSE135 (UC San Diego, Web Development) coursework site for **eemami.dev**, plus a client-side
analytics pipeline (Homework 3) layered on top of it: a collector script (`public_html/js/api_hooked_collector.js`)
reports page/performance/activity telemetry into a single Express/MongoDB backend, visualized
live on the site via [ZingGrid](https://www.zinggrid.com/) / [ZingChart](https://www.zingchart.com/).

## What changed in this refactor

The project previously had three overlapping backend implementations and an Apache front end.
This pass collapsed it to a single monolithic app behind nginx, and removed dead/duplicate files
that had accumulated across earlier homework iterations.

| Area | Before | After |
| --- | --- | --- |
| Backend | 3 parallel APIs: `api/server.js` (Mongo, live), `public_html/api/` (file-backed prototype), `public_html/db.json` + `js/collector.js` (json-server mock) | 1 backend: `api/` (Express + MongoDB) |
| `api/` structure | Single 170-line `server.js` with routes, Mongo setup, and boot logic inline | Split into `server.js` (entrypoint), `src/app.js`, `src/config/db.js`, `src/routes/{health,static,perf,activity}.js`, `src/middleware/errorHandler.js` |
| Web server | Apache 2 (`configs/apache-vhost.eemami.dev.conf`), CGI via built-in `mod_cgi` | nginx (`configs/nginx-eemami.dev.conf`), CGI via `fcgiwrap` (Perl/Python/C) + `php-fpm` (PHP); old vhost kept at `configs/legacy/` for rollback |
| Process management | API started by hand (`node server.js`) | `configs/analyticcollector-api.service` — systemd unit, auto-restart |
| `public_html/api/` | Present: `serv.notext` prototype server, own `package.json`/lockfile, `data/*.json` | Removed (superseded by `api/`) |
| `public_html/db.json`, `db1.json` | Present: json-server mock data (`db1.json` was 0 bytes) | Removed |
| `public_html/js/collector.js` | Present, unreferenced by any page (superseded by `api_hooked_collector.js`) | Removed |
| `public_html/package.json` | Present, declared `main: server.js` but no such file existed | Removed |
| `public_html/hello.php` | Present, unreferenced `phpinfo()` page (info-disclosure risk) | Removed |
| `index1.html`, `database1.html` | Present, unreferenced draft duplicates of `index.html`/`database.html` | Removed |
| `node_modules/` in git | Two directories committed (`public_html/api/`, `public_html/learning_node/`) despite partial `.gitignore` rules | Untracked; blanket `node_modules/` rule added to `.gitignore` |
| `README.md` | 35 lines, Homework 2 (Python/PHP) links only | Full project doc: architecture, directory layout, dev/deploy steps, API reference, all 4 CGI languages |
| `public_html/cgi-bin/**`, live pages, `api_hooked_collector.js` | — | Untouched — these are graded coursework artifacts and the live collector, out of scope |

## Architecture

One static site, one backend process — nginx is the only thing exposed to the internet, and it
either serves a file directly, proxies to the API, or hands a request to a CGI runner.

```
                        ┌─────────────────────────────────────────┐
                        │                 nginx                   │
  browser  ───443───▶   │  configs/nginx-eemami.dev.conf           │
                        └───────────────┬───────────┬─────────────┘
                                         │           │
                    static files        │           │  /cgi-bin/**
                    public_html/**      │           │  (fcgiwrap / php-fpm)
                    (index.html,        │           ▼
                     cgi-bin/, js/, …)  │   public_html/cgi-bin/
                                        │   {c,perl,php,python}
                                        │
                              /api/**   ▼
                        ┌───────────────────────────┐        ┌─────────┐
                        │   api/  (Node/Express)     │──────▶ │ MongoDB │
                        │   systemd: analyticcollector-api    └─────────┘
                        └───────────────────────────┘
```

- **`api/`** — the single backend process (the "monolith"): one Express app, one MongoDB
  connection, one systemd service. No separate microservices, no per-feature backends.
- **`public_html/`** — everything nginx serves directly: the site itself plus the CGI homework
  demos (Homework 2 — dynamic pages in C, Perl, PHP, and Python, run under `fcgiwrap`/`php-fpm`
  instead of Apache's `mod_cgi`).
- **`configs/`** — infrastructure-as-config for the server: the nginx vhost, the systemd unit for
  the API, and the retired Apache vhost kept under `configs/legacy/` for rollback reference.

## Directory layout

```
.
├── api/                          # the monolithic backend
│   ├── server.js                 # entrypoint: connect Mongo, app.listen
│   ├── src/
│   │   ├── app.js                # express() assembly (cors, json, routes, errors)
│   │   ├── config/db.js          # MongoClient connection + collection handles
│   │   ├── routes/                # health.js, static.js, perf.js, activity.js
│   │   └── middleware/errorHandler.js
│   ├── package.json
│   └── .env.example
├── configs/
│   ├── nginx-eemami.dev.conf     # active nginx vhost
│   ├── analyticcollector-api.service   # systemd unit for api/
│   └── legacy/apache-vhost.eemami.dev.conf   # retired, kept for reference
└── public_html/                  # nginx document root
    ├── index.html, database.html, hellodataviz.html, …
    ├── js/api_hooked_collector.js   # ships static/perf/activity telemetry to /api/*
    └── cgi-bin/                   # Homework 2: C / Perl / PHP / Python CGI demos
```

## Local development

```bash
cd api
cp .env.example .env      # set MONGODB_URI to a local/dev Mongo instance
npm install
npm start                 # API on http://127.0.0.1:3000
```

The static site can be served with anything (`npx serve public_html`, or point a local nginx at
it using `configs/nginx-eemami.dev.conf` as a template) — just make sure `/api/` is proxied to
port 3000 so `api_hooked_collector.js` and the dashboard grids (`database.html`, `hellodataviz.html`)
can reach it.

## Deployment

1. `nginx -t` against `configs/nginx-eemami.dev.conf`, then reload nginx.
2. Copy `configs/analyticcollector-api.service` to `/etc/systemd/system/`, then:
   ```bash
   systemctl daemon-reload
   systemctl enable --now analyticcollector-api
   ```
3. Server packages required beyond Node + MongoDB: `nginx`, `fcgiwrap`, `php-fpm` (see comments
   at the top of `configs/nginx-eemami.dev.conf`).

## API reference

All routes are mounted under `/api`.

| Method | Path             | Description                                   |
| ------ | ---------------- | ---------------------------------------------- |
| GET    | `/api/health`    | Mongo ping check                               |
| GET    | `/api/static`    | Last 1000 static/env snapshots                 |
| POST   | `/api/static`    | Record one static snapshot                     |
| GET    | `/api/perf`      | Last 1000 page-load performance records        |
| POST   | `/api/perf`      | Record one performance entry                   |
| GET    | `/api/activity`  | Last 1000 activity events                      |
| POST   | `/api/activity`  | Record one activity event, or a batch (array)  |
| GET/PUT/DELETE | `/api/{static,perf,activity}/:id` | Fetch, update, or delete a single record |

### Environment variables (`api/.env`)

| Variable      | Default                                  | Description             |
| ------------- | ----------------------------------------- | ------------------------ |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/analytics`     | Mongo connection string |
| `PORT`        | `3000`                                    | API listen port          |

## Homework 2 — CGI demos

All reachable from the homepage under "Homework 2 – Dynamic Websites".

### Python (`/cgi-bin/python/`)
- Hello (HTML): `py-hello-html-world.py`
- Hello (JSON): `py-hello-json-world.py`
- GET Echo: `py-get-echo.py?name=Elyas`
- POST Echo: `py-post-echo.py` (form at `/post-form.html`)
- General Request Echo: `general-request-echo.py`
- State Demo: `state-demo-1.py` → `state-demo-2.py`
- Env dump: `py-enviroment.py`

### PHP (`/cgi-bin/php/`)
- Hello (HTML): `php-hello-html-world.php`
- Hello (JSON): `php-hello-json.php`
- GET Echo: `php-get-echo.php?name=Elyas`
- POST Echo: `php-post-echo.php` (form at `/php-post-form.html`)
- General Request Echo: `general-request-echo.php`
- State Demo: `state-demo-1.php` → `state-demo-2.php`
- Env dump: `php-enviroment.php`

### Perl (`/cgi-bin/`)
- Env dump: `perl-env.pl`
- GET Echo: `perl-get-echo.pl?x=1&y=2`
- POST Echo: `perl-post-echo.pl`
- Hello (JSON): `perl-json-world.pl`
- State Demo: `perl-sessions-1.pl` → `perl-sessions-2.pl`

### C (`/cgi-bin/`)
- Hello (HTML): `c-hello.cgi`
- Hello (JSON): `c-hello-json.cgi`
- Env dump: `c-env-variables.cgi`
- GET Echo: `c-get-echo.cgi?x=1&y=2`
- POST Echo: `c-post-echo.cgi`
- General Request Echo: `c-request-echo.cgi`
- State Demo: `c/c-sessions-1.cgi` → `c/c-sessions-2.cgi`

## Author

Elyas Emami — [eemami.dev](https://eemami.dev)
