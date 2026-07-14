# Project Context — API Health Dashboard

> Audit snapshot: 2026-07-12. Written as context for future AI agents and collaborators.
> Ground truth is the code; file:line references below were accurate at audit time.

## What this app is

"Paste your API endpoints, and the app monitors them 24/7, tracks response times,
shows failure history, and uses AI to tell you what's wrong."

- **Owner**: solo learning project (developer is re-learning React/Next.js while building).
- **Stack**: Next.js 16 (App Router, JS not TS), Tailwind 4, MongoDB Atlas via Mongoose 9,
  Clerk 7 (auth), Google Gemini (`@google/genai`, model `gemini-2.5-flash`), Recharts 3,
  Vercel (hosting + cron).

## ⚠️ Version gotchas (read before "fixing" things)

This repo uses **Next.js 16** and **Clerk v7**, which differ from older training data:

- `src/proxy.js` is the Next 16 replacement for `middleware.js` — it is NOT a mistake.
  Docs: `node_modules/next/dist/docs/` (see glossary: "Formerly known as Middleware").
- `<Show when="signed-in">` in `src/app/layout.js` is a real Clerk v7 export
  (replaces `<SignedIn>/<SignedOut>` patterns). Verified in `@clerk/nextjs/dist/types/index.d.ts`.
- Route handler `params` is a Promise (`const { id } = await params`) — correct in Next 15+.
- Per `AGENTS.md`: consult the bundled docs in `node_modules/next/dist/docs/` before writing
  Next.js code.

## Architecture map

| Concern | Where | Notes |
|---|---|---|
| Data models | `src/models/Endpoint.js`, `src/models/PingLog.js` | Mongoose; PingLog has compound index `{endpointId, createdAt}` |
| DB connection | `src/lib/mongodb.js` | Cached global connection (serverless pattern) |
| Ping logic | `src/lib/ping.js` | Shared by cron, REST route, and server action; 10s timeout; writes a PingLog |
| Status logic | `src/lib/status.js` | `up` / `slow` (>1000ms) / `down` (status 0 or ≥400) / `unknown` |
| Dashboard (server component) | `src/app/page.js` | Fetches endpoints + last 24 logs each, renders cards |
| Mutations used by the UI | `src/app/actions.js` | Server actions: `addEndpoint`, `deleteEndpoint`, `pingNow` + `revalidatePath('/')` |
| REST API routes | `src/app/api/endpoints/`, `src/app/api/ping/` | Built in Phase 3, **now unused by the UI** (superseded by server actions) |
| Cron | `src/app/api/cron/route.js` + `vercel.json` | Every 5 min, pings ALL users' endpoints, guarded by `Bearer CRON_SECRET` |
| AI summary | `src/app/api/summary/route.js` | Sends last 50 PingLogs to Gemini, returns plain-English diagnosis |
| UI components | `src/components/` | `EndpointCard`, `AddEndpointForm`, `EndpointActions`, `AISummary`, `StatusDot`, `ResponseTimeChart` |
| Auth wiring | `src/proxy.js` (clerkMiddleware), `src/app/layout.js` (ClerkProvider) | Routes are NOT protected by middleware; each route/action checks `auth()` itself |

Env vars (`.env.local`, gitignored, never committed):
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`, `CRON_SECRET`, `GEMINI_API_KEY`.

## Progress vs. the original 6-phase plan

| Phase | Status | Evidence |
|---|---|---|
| 1 — Setup (Next.js, GitHub, Clerk) | ✅ committed | commits `b4fb421`, `71949dd` |
| 2 — MongoDB + data models | ✅ committed | commit `790843c` |
| 3 — Core API routes (CRUD + ping) | ✅ committed | commit `135e204` |
| 4 — Vercel cron auto-pinging | ✅ committed | commit `700b86b`, `vercel.json` |
| 5 — Dashboard UI (cards, chart, AI summary) | ✅ built, **⚠️ NOT COMMITTED** | untracked: `src/components/`, `src/app/actions.js`, `src/app/api/summary/`; modified: `page.js`, `package.json` |
| 6 — Polish + deploy (README, Vercel, demo) | ❌ not started | README is still the create-next-app default |

Also in the pitch but **not built anywhere yet**: email/notification alerts on downtime.
Build passes (`npm run build` ✅, verified at audit time).

## Known issues (from the 2026-07-12 audit)

### Security

1. **SSRF — the main one.** `src/lib/ping.js:11` fetches any user-supplied URL server-side with
   no validation. A signed-in user can point the monitor at internal/private addresses
   (`http://169.254.169.254/`, `http://localhost/`, Vercel-internal services) and use ping
   results (status/latency/error message) as an oracle. The method dropdown also allows
   POST/PUT/DELETE, so the server can be made to fire state-changing requests at third parties
   every 5 minutes. Fix direction: allow only `http(s):`, resolve + reject private/link-local IP
   ranges, and consider restricting methods to GET/HEAD.
2. **`src/app/api/test-db/route.js` is public.** Debug endpoint, no auth, leaks the database
   name and connectivity state. Delete it (it was scaffolding from Phase 2).
3. **Weak server-side input validation.** `POST /api/endpoints` and `addEndpoint` accept any
   string as `url` (client `type="url"` is the only check), unbounded `name`, and (REST route
   only) an unvalidated `expectedStatus`. Mongoose enum does guard `method`.
4. Minor: `CRON_SECRET` comparison at `src/app/api/cron/route.js:14` is not constant-time;
   remote `errorMessage` strings are interpolated into the Gemini prompt
   (`src/app/api/summary/route.js:69`) — a mild prompt-injection vector.
5. **What's already done right:** every route and server action scopes queries by the Clerk
   `userId` (no IDOR found); cron requires a Bearer secret and fails closed if unset;
   secrets are gitignored and absent from git history.

### Correctness / feature gaps

6. **`expectedStatus` is stored but never used.** `computeStatus` (`src/lib/status.js:5`)
   hardcodes `status >= 400` = down. An endpoint that should return 201/204/301 — or one whose
   "healthy" response is 404 — is judged wrong. The add form doesn't even collect it.
7. Invalid ObjectIds throw Mongoose `CastError` → surfaced as 500s instead of 400s
   (e.g. `src/app/api/summary/route.js:32`).

### Maintainability / scaling

8. **Two parallel mutation paths.** Phase 3 REST routes (`/api/endpoints` GET+POST,
   `/api/endpoints/[id]` DELETE, `/api/ping`) duplicate the Phase 5 server actions in
   `src/app/actions.js`, which is what the UI actually calls. Keep one (server actions are the
   idiomatic Next 16 choice for own-UI mutations) or the two will drift.
9. **PingLog grows forever.** 5-min cron ≈ 288 logs/endpoint/day, and only the delete flow ever
   removes logs. Add a TTL index (e.g. `createdAt` expireAfterSeconds ~30 days) or a cap.
10. N+1 query in `src/app/page.js:26-40` — one PingLog query per endpoint. Fine at hobby scale;
    an aggregation would fix it if endpoint counts grow.
11. Cron duration risk: `Promise.allSettled` over all endpoints with a 10s per-ping timeout —
    fine now, but watch Vercel function limits as users/endpoints grow.
12. Endpoint delete then `PingLog.deleteMany` is non-transactional
    (`src/app/actions.js:36-40`) — a crash between the two orphans logs. Cosmetic at this scale.

## Suggested next steps (rough priority)

1. Commit the Phase 5 work (it's substantial and unprotected).
2. Delete `/api/test-db`; decide REST-routes-vs-server-actions and remove the loser.
3. Add URL validation (scheme + private-IP block) to `addEndpoint` — closes SSRF.
4. Wire up `expectedStatus` (form field → `computeStatus(log, endpoint)`).
5. TTL index on PingLog.
6. Phase 6: real README, deploy to Vercel (set the 5 env vars + cron), demo video.
7. Stretch (from the pitch): downtime email/notification alerts.
