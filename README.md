# Probehouse

**A local-first research operations desk.** Probehouse keeps a whole research programme in one
workspace: studies move from planning through recruiting and fieldwork to analysis, participants
move through a screening pipeline, moderated sessions get scheduled and closed out, and every
follow-up stays visible — with no account, no database, and no external services.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2f6f4f)

## Why Probehouse

Research operations usually live in a spreadsheet, a scheduling tool, and three inboxes.
Probehouse puts the day-to-day of a small research team in one local workspace:

1. **Plan a study** — record the objective, the owner, the target participant count, and tags.
2. **Recruit** — work each participant through `invited` → `screening` → `confirmed` →
   `completed`, or close the row as `declined` and keep the reason.
3. **Run sessions** — schedule moderated, unmoderated, or diary sessions and move them through
   `scheduled` → `in-progress` → `completed`.
4. **Close the loop** — consent state, notes, and follow-ups live on the participant record, and
   every change lands in the activity feed.

The workspace opens on a deterministic seeded programme, so the dashboard, the study list, and
every detail pane are useful before you type anything.

## Features

- **Programme dashboard** — four live metrics: active studies, ready participants, upcoming
  sessions, and follow-ups due, all computed from the current in-memory state.
- **Study portfolio** — searchable, status-filterable study list with colour accents, owner,
  target progress, and participant/session counts.
- **Study workspace** — objective, tags, status control, progress summary, participant pipeline,
  and session schedule in a single detail pane.
- **Participant pipeline** — invited, screening, confirmed, completed, and declined participants
  with consent state, source, role, and notes.
- **Session planning** — moderated, unmoderated, and diary sessions with date, duration,
  moderator, location, and participant assignment.
- **Activity feed** — studies, participants, sessions, and notes append a timestamped entry with a
  tone, so the story of a study is always visible.
- **Local-first** — the API binds to port `4173` on your machine, storage is in memory, and
  nothing is sent anywhere.

## Tech stack

| Layer    | Choice                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | Vue 3 (`<script setup>` SFCs) + Vite 8, hand-written CSS                        |
| Backend  | Fastify 5 on Node.js 22, strict TypeScript compiled to ESM in `dist-server/`    |
| Storage  | Deterministic in-memory store seeded on boot — no database, no Docker           |
| Tooling  | TypeScript strict mode, vue-tsc, ESLint 10 + Prettier, Vitest 5, GitHub Actions |

## Quick start

Three commands, no services to start and no API keys to set:

```bash
npm ci
npm run build
npm start
```

Then open **http://127.0.0.1:4173** — the production server serves the built client from `dist/`
and the API from the same origin. The health probe answers at
**http://127.0.0.1:4173/api/health** with `{"ok":true,"service":"probehouse"}`.

Requires Node.js 22.12 or newer (`^22.12.0 || >=24.0.0`).

## Development

Run the API and the Vite dev server side by side while you iterate:

```bash
npm run dev:api   # tsx watch src/server.ts → http://127.0.0.1:4173
npm run dev       # vite                     → http://127.0.0.1:5173
```

`npm run dev` serves the client on port **5173** with hot module replacement and proxies every
`/api/*` request to the Fastify server on `127.0.0.1:4173`, so the browser talks to one origin.
The API also registers static file serving for `dist/`, so run `npm run build` once before the
first `dev:api` if that folder does not exist yet. `npm run dev:all` starts both processes
together with `concurrently`.

## Scripts

| Command              | What it does                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`        | Vite dev server on 5173 with the `/api` proxy to 4173                                       |
| `npm run dev:api`    | Fastify API with `tsx watch` on 4173                                                        |
| `npm run dev:all`    | Both dev processes in one terminal                                                          |
| `npm run build`      | `vite build` into `dist/`, then `tsc -p tsconfig.server.json` into `dist-server/`           |
| `npm start`          | Runs the compiled server: `node dist-server/server.js`                                      |
| `npm run preview`    | Serves the built client on 4174 with the `/api` proxy to 4173                               |
| `npm run lint`       | ESLint over the workspace, then `prettier --check .`                                        |
| `npm run format`     | Rewrites files with Prettier                                                                |
| `npm run typecheck`  | `vue-tsc --noEmit` for the client and `tsc -p tsconfig.server.json --noEmit` for the server |
| `npm test`           | `vitest run` — the API suite in `src/tests/api.test.ts`                                     |
| `npm run test:watch` | Vitest in watch mode                                                                        |

## API

Every endpoint is JSON under `/api`, and none of them require authentication.

| Method  | Endpoint                | Purpose                                                                     |
| ------- | ----------------------- | --------------------------------------------------------------------------- |
| `GET`   | `/api/health`           | Liveness probe: `{ "ok": true, "service": "probehouse" }`                   |
| `GET`   | `/api/dashboard`        | Dashboard stats plus studies, participants, sessions, and activity          |
| `GET`   | `/api/studies`          | Study list; optional `?status=` filter (`planning`, `recruiting`, …)        |
| `GET`   | `/api/studies/:id`      | One study with its participants, sessions, and activity; `404` when missing |
| `POST`  | `/api/studies`          | Create a study (`201 planning`); `400` for missing or invalid fields        |
| `PATCH` | `/api/studies/:id`      | Update a study's title, objective, or status                                |
| `GET`   | `/api/activity`         | Activity history with kind, message, timestamp, and tone                    |
| `PATCH` | `/api/participants/:id` | Update a participant's status, consent, or notes                            |
| `PATCH` | `/api/sessions/:id`     | Update a session's status or notes                                          |

Examples:

```bash
curl http://127.0.0.1:4173/api/health
# {"ok":true,"service":"probehouse"}

curl 'http://127.0.0.1:4173/api/studies?status=recruiting'

curl -X POST http://127.0.0.1:4173/api/studies \
  -H 'Content-Type: application/json' \
  -d '{"title":"Onboarding friction diary study","objective":"Find where new admins stall in week one","owner":"Maya Chen","targetParticipants":8,"tags":["onboarding","diary"]}'

curl -X PATCH http://127.0.0.1:4173/api/participants/participant-1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"confirmed","consented":true}'
```

`POST /api/studies` expects `title`, `objective`, `owner`, and a positive `targetParticipants`;
`tags` is optional. Validation failures return `400 {"error":"…"}`, missing records return
`404 {"error":"…"}`, and unknown `/api/*` routes return JSON `404` instead of the SPA shell.
Updating a record appends an activity entry, so the dashboard and detail views stay in sync.

### Data model

- **Study** — `id`, `code`, `title`, `objective`, `status`
  (`planning` | `recruiting` | `fieldwork` | `analysis` | `complete`), `owner`, `color`,
  `startedAt`, `targetParticipants`, `tags`, `createdAt`.
- **Participant** — `id`, `studyId`, `name`, `initials`, `role`, `email`, `status`
  (`invited` | `screening` | `confirmed` | `completed` | `declined`), `source`, `consented`,
  optional `lastContactAt` and `notes`.
- **Session** — `id`, `studyId`, optional `participantId`, `title`, `startsAt`,
  `durationMinutes`, `format` (`moderated` | `unmoderated` | `diary`), `status`
  (`scheduled` | `in-progress` | `completed` | `cancelled`), `moderator`, `location`, optional
  `notes`.
- **ActivityItem** — `id`, `kind` (`study` | `participant` | `session` | `note`), `message`,
  `timestamp`, `tone` (`blue` | `green` | `amber` | `purple`).
- **DashboardData** — `{ stats, studies, participants, sessions, activity }` where `stats` is
  `{ activeStudies, readyParticipants, upcomingSessions, followUpsDue }`.
- **StudyDetail** — `{ study, participants, sessions, activity }`.

The client mirrors these types in `src/shared/types.ts` and wraps the endpoints in
`src/client/api.ts`, so the Vue workspace and the Fastify handlers never drift apart.

## Project structure

```
.
├── src/
│   ├── main.ts                  # Vue entry: mounts App.vue into #app
│   ├── App.vue                  # Workspace shell: header, metrics, study list, modal
│   ├── styles.css               # Design system and responsive layout
│   ├── client/api.ts            # Typed fetch client for the API
│   ├── components/              # MetricCard, StudyCard, ActivityFeed, StatusPill,
│   │                            # StudyWorkspace, ParticipantList, SessionList
│   ├── shared/types.ts          # Domain types shared by client and server
│   ├── backend/store.ts         # Deterministic in-memory store and seed data
│   ├── backend/routes.ts        # Fastify route registration
│   ├── server.ts                # buildApp(), static dist/ serving, startServer()
│   └── tests/api.test.ts        # Vitest suite for the HTTP API
├── index.html                   # Vite HTML shell and #app mount point
├── vite.config.ts               # Vue plugin, port 5173, /api proxy, Vitest config
├── tsconfig.json                # Strict client TypeScript (Vue SFCs, bundler resolution)
├── tsconfig.server.json         # Strict NodeNext server build into dist-server/
├── eslint.config.js             # Flat ESLint config for TypeScript and Vue
└── .github/workflows/ci.yml     # Install, lint, typecheck, test, build, smoke
```

Two conventions keep the layers glued together: the Vue app mounts into `<div id="app">` from
`index.html`, and `@/*` is aliased to `src/*` in both `vite.config.ts` and `tsconfig.json`. On the
server side, `src/server.ts` exports `buildApp()` so tests and scripts can inject requests
without binding a port; running the file directly starts the listener on port 4173.

## Quality gates

The same commands gate every change, locally and in CI:

```bash
npm ci            # clean install from package-lock.json
npm run lint      # ESLint + prettier --check
npm run typecheck # vue-tsc for the client, tsc for the NodeNext server
npm test          # Vitest API suite (app.inject, no real ports)
npm run build     # dist/ client bundle + dist-server/ compiled API
npm start         # serve both on http://127.0.0.1:4173
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request with Node.js 22 and repeats those
gates in order:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. Starts `node dist-server/server.js`, retries
   `curl http://127.0.0.1:4173/api/health` once per second for up to 30 seconds, and fails the job
   if the probe never answers.

## Notes

- **Storage is in memory and seeded.** The store boots with deterministic sample data — stable
  ids such as `study-1`, `participant-1`, and `session-1`, and at least four studies, eight
  participants, and six sessions — so the workspace opens with a realistic programme. Everything
  you change lives in the running process only; restart the server and the seed returns.
- **No external services.** No database, no Docker, no API keys, and no outbound requests. The
  API listens on `0.0.0.0:4173` (`PORT` overrides the port) and the Vite dev server proxies to it.
- **One origin in production.** `npm start` serves the API and the built client from the same
  Fastify process, so the browser never needs CORS or a second port.

## License

[MIT](LICENSE) © 2026 Probehouse contributors
