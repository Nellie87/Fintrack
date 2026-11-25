# FinTrack by Finnet Technologies

A portfolio and transactions tracker for investment analysts. An analyst registers, creates client portfolios, records BUY/SELL trades and sees holdings, performance and allocation at a glance.

| | |
| --- | --- |
| **Live app** | https://fintrack-ui1.vercel.app |
| **API docs (Swagger)** | https://fintrack-apis.vercel.app/api/docs |
| **Demo login** | `demo@fintrack.app` / `Demo@2026` (or click **Fill in demo login**) |

The seed script gives the demo analyst three portfolios (two in KES, one in USD) with 22 trades; the live demo may also contain portfolios added while testing. All client names and data are fictional.

![Portfolio detail](docs/screenshots/detail-desktop.png)

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack and why](#tech-stack-and-why)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Tests](#tests)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [Trade-offs](#trade-offs)
- [Next steps](#next-steps)
- [AI usage](#ai-usage)
- [Screenshots](#screenshots)

## Features

- **Auth:** register and log in; passwords (8+ characters with upper- and lower-case letters and a number) hashed with bcrypt; every other endpoint requires a JWT.
- **Dashboard:** KPIs across all of an analyst's portfolios: assets under management per currency (KES and USD never mixed), best and weakest performers, largest positions and recent activity.
- **Portfolios:** create, edit, delete and search client portfolios in KES or USD. Each analyst only ever sees their own.
- **Transactions:** record BUY/SELL trades; sort, filter (instrument, type, date range) and page through them; export to CSV; delete with confirmation.
- **Holdings summary:** per-instrument net quantity, weighted average cost, total invested, market value and signed gain/loss, plus portfolio totals and an allocation donut chart.
- **Validation:** negative quantities, overselling (including back-dated sells), unknown portfolios and deletes that would break a later sell are rejected with the correct status code and one consistent JSON error shape.
- **UI:** light and dark mode from the same design tokens; toast confirmations for every action; loading, empty and error states for every API call; confirmation before every delete; responsive down to 375px; keyboard and screen-reader friendly (WCAG AA contrast in both themes).

### Brief checklist: bonus items

| Bonus item | Where |
| --- | --- |
| Backend unit/integration tests + a frontend component test | 34 backend tests, 8 frontend tests ([Tests](#tests)) |
| Docker Compose for API, frontend and database | [`docker-compose.yml`](docker-compose.yml) ([Run locally](#run-locally)) |
| CI pipeline running lint and tests | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Automated deployment from `main` (CD) | Vercel redeploys both apps on every push to `main` ([Deployment](#deployment)) |
| Pagination and CSV export of transactions | `?page=&pageSize=` and `/transactions/export` ([API overview](#api-overview)); paged table and **Export CSV** button in the UI |
| Dark mode using the same design tokens | [`tokens.css`](frontend/src/styles/tokens.css): same token names, dark values under `data-theme="dark"` |

## Architecture

```mermaid
flowchart LR
    B["Browser<br/>React SPA<br/>(fintrack-ui1.vercel.app)"] -- "HTTPS + JSON<br/>Authorization: Bearer JWT" --> P
    subgraph API ["Next.js API (fintrack-apis.vercel.app)"]
        P["proxy.ts<br/>CORS + preflight"] --> R["Route handlers<br/>parse → call lib → JSON"]
        R --> L["lib/<br/>auth · schemas · holdings · errors"]
    end
    L -- "Prisma 7 + pg adapter" --> D[("PostgreSQL<br/>Neon")]
```

The browser only talks to the API. Every request passes the CORS check, then the JWT check. Route handlers stay thin; business rules live in small functions in `backend/src/lib/`. The holdings maths in `holdings.ts` is a pure function (no database, no HTTP), so it is unit-tested on its own and reused for both validation and the summary.

```
fintrack/
├─ docker-compose.yml            Postgres + migrate/seed + API + web, one command
├─ .github/workflows/ci.yml      lint, test and build both apps on every push / PR
├─ backend/                      Next.js 16 (route handlers only, no pages)
│  ├─ Dockerfile                 multi-stage build → standalone Next.js server
│  ├─ prisma/schema.prisma       users, portfolios, transactions
│  ├─ prisma/migrations/         SQL migrations
│  ├─ prisma/seed.ts             demo analyst + portfolios + trades
│  ├─ public/openapi.yaml        OpenAPI 3 spec (served at /openapi.yaml)
│  └─ src/
│     ├─ proxy.ts                CORS (Next 16's name for middleware)
│     ├─ lib/                    db, auth, errors, schemas, portfolios, transactions,
│     │                          holdings, dashboard, csv (+ tests)
│     └─ app/api/                REST endpoints and the Swagger UI page
└─ frontend/                     React 19 + Vite SPA
   ├─ Dockerfile, nginx.conf     production build served by nginx (SPA fallback)
   ├─ vercel.json                SPA rewrite so deep links survive a refresh
   └─ src/
      ├─ styles/tokens.css       every colour, font size and spacing value, defined once (light + dark)
      ├─ api/                    fetch client, types, TanStack Query hooks
      ├─ auth/                   session context and route guards
      ├─ components/             header, tables, forms, chart, dialogs, toasts, state views (+ tests)
      ├─ lib/                    formatting, theme, toasts, error messages (+ tests)
      └─ pages/                  login, register, dashboard, portfolios, portfolio detail, 404
```

### Data model

| Table | Columns | Notes |
| --- | --- | --- |
| `users` | id, name, email (unique), password_hash, created_at | One row per analyst |
| `portfolios` | id, user_id → users, name, client_name, base_currency (KES \| USD), created_at, updated_at | Scoped to its analyst; deleting a user cascades |
| `transactions` | id, portfolio_id → portfolios, instrument, type (BUY \| SELL), quantity `numeric(18,4)`, unit_price `numeric(18,4)`, trade_date `date`, created_at | Index on (portfolio_id, trade_date); deleting a portfolio cascades |

Money and quantities are stored as `numeric` and calculated with `decimal.js`, never floats; rounding happens only for display.

## Tech stack and why

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript end to end | One language and shared validation style (Zod) on both sides |
| Backend | Next.js 16 route handlers | Simple file-based REST routes; deploys natively on Vercel |
| Database | PostgreSQL on Neon | Real relational database with a free, always-on tier |
| ORM | Prisma 7 with `@prisma/adapter-pg` | Typed queries, migrations and a seed script; `Decimal` money type |
| Auth | bcryptjs + jose (HS256 JWT) | Hashed passwords and stateless bearer tokens, no session store |
| Validation | Zod 4 | One schema per request body, turned into 422 field errors automatically |
| API docs | OpenAPI 3 spec + Swagger UI | Public, try-it-out docs at `/api/docs` |
| Frontend | React 19 + Vite | A true single-page app, as the brief asks, with fast builds |
| Routing | React Router 8 | Public, protected and lazy-loaded routes |
| Server state | TanStack Query 5 | Loading, error, retry and cache invalidation for every API call |
| Forms | React Hook Form + Zod | Field-level validation with little code; API errors land under the right field |
| Charts | Recharts | Accessible donut with a data-table legend |
| Styling | Plain CSS with custom properties | The brief asks for design tokens "defined once"; `tokens.css` is that single source |
| Font | Inter (self-hosted via Fontsource) | One clean sans-serif family, no third-party font requests |
| Tests | Vitest + React Testing Library | Same runner on both sides; component tests interact the way a user does |
| CI | GitHub Actions | Lint, test and build both apps on every push and pull request |
| Containers | Docker Compose (Postgres 17, Node 22, nginx) | The whole stack, seeded, with one command and no local Node or Postgres |
| Hosting | Vercel (API + SPA) and Neon (Postgres) | HTTPS, auto-deploy from `main`, and no cold-start sleep during the 14-day review window. Vercel is not in the brief's example list, but the brief allows any platform; free tiers that sleep (e.g. Render) can take 30–60 s to answer a reviewer's first request. |

## Run locally

### Option A: Docker Compose (quickest, about 3 minutes)

Needs only [Docker Desktop](https://www.docker.com/products/docker-desktop/). From the repo root:

```bash
docker compose up --build
```

| Service | URL | What it does |
| --- | --- | --- |
| `web` | http://localhost:8080 | The React app, built and served by nginx |
| `api` | http://localhost:4000/api/docs | The API (Swagger UI) |
| `db` | (internal) | PostgreSQL 17, data kept in the `db-data` volume |
| `migrate` | (runs once) | Applies migrations and seeds the demo analyst, then exits |

Log in with `demo@fintrack.app` / `Demo@2026`. The API uses a throwaway JWT secret by default; set your own with `JWT_SECRET=... docker compose up --build`. Stop with `Ctrl+C`; `docker compose down -v` also deletes the database volume.

### Option B: Node.js and your own Postgres

**Prerequisites:** Node.js 22 LTS or newer (20.19+ also works) and a PostgreSQL database: either a free [Neon](https://neon.tech) project or a local container:

```bash
docker run --name fintrack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack -p 5432:5432 -d postgres:17
```

**1. API** (http://localhost:3000)

```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL, DIRECT_URL and JWT_SECRET (see below)
npm install                 # also runs `prisma generate`
npx prisma migrate dev      # creates the tables
npx prisma db seed          # demo analyst: demo@fintrack.app / Demo@2026
npm run dev
```

With the Docker database above, use the same value for both URLs:
`postgresql://postgres:postgres@localhost:5432/fintrack`

Generate a JWT secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**2. Frontend** (http://localhost:5173), in a second terminal

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

Open http://localhost:5173 and click **Fill in demo login**. Swagger is at http://localhost:3000/api/docs.

## Environment variables

Real values live only in local `.env` files (git-ignored) and in the hosting platform's settings. Each app has a committed `.env.example`.

**backend/.env**

| Variable | Example | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST-pooler/neondb?sslmode=verify-full` | Connection used by the app (pooled on Neon) |
| `DIRECT_URL` | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=verify-full` | Direct connection used by migrations |
| `JWT_SECRET` | 64 random hex characters | Signs and verifies tokens |
| `JWT_EXPIRES_IN` | `8h` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Exact frontend origin(s) allowed to call the API; comma-separate several |

**frontend/.env**

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the API (no trailing slash) |

## API overview

Full, interactive documentation: **https://fintrack-apis.vercel.app/api/docs** (spec: [`backend/public/openapi.yaml`](backend/public/openapi.yaml)).

| Method | Path | Success | Common errors |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 201 `{ token, user }` | 409 email taken, 422 invalid |
| POST | `/api/auth/login` | 200 `{ token, user }` | 401 wrong email or password |
| GET | `/api/auth/me` | 200 user | 401 |
| GET | `/api/dashboard` | 200 KPIs per currency, performers, largest positions, recent trades | 401 |
| GET | `/api/portfolios` | 200 list (with `transactionCount`) | 401 |
| POST | `/api/portfolios` | 201 portfolio | 422 |
| GET | `/api/portfolios/{id}` | 200 portfolio | 404 |
| PUT | `/api/portfolios/{id}` | 200 portfolio | 404, 422 |
| DELETE | `/api/portfolios/{id}` | 204 (its transactions too) | 404 |
| GET | `/api/portfolios/{id}/transactions` | 200 list, newest first; optional `?page=&pageSize=` (total in `X-Total-Count`) | 404, 422 bad page values |
| GET | `/api/portfolios/{id}/transactions/export` | 200 `text/csv` download, oldest first | 404 |
| POST | `/api/portfolios/{id}/transactions` | 201 transaction | 404, 422 (incl. selling more than held), 409 |
| DELETE | `/api/transactions/{id}` | 204 | 404, 422 if a later sell depends on it, 409 |
| GET | `/api/portfolios/{id}/summary` | 200 holdings + totals | 404 |
| GET | `/api/health` | 200 `{ status: "ok" }` | |

Every endpoint except register, login and health needs `Authorization: Bearer <token>`.

**One error shape everywhere:**

```json
{
  "error": {
    "code": "INSUFFICIENT_HOLDINGS",
    "message": "Cannot sell 500 SCOM: only 300 held on 2026-11-20.",
    "details": [{ "field": "quantity", "message": "Exceeds holding of 300." }]
  }
}
```

| Status | Code | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Body is not valid JSON |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token; wrong login |
| 404 | `NOT_FOUND` | Unknown id, **or one belonging to another analyst** (so ids can't be probed) |
| 409 | `EMAIL_TAKEN` / `CONFLICT` | Email already registered / two simultaneous changes collided (retry) |
| 422 | `VALIDATION_ERROR` | Field rules broken; `details` lists each field |
| 422 | `INSUFFICIENT_HOLDINGS` | A sell (or a delete) would leave a negative holding on some date |
| 500 | `INTERNAL_ERROR` | Unexpected failure; logged server-side, no stack trace returned |

**Holdings maths (weighted average cost).** Trades are replayed per instrument in trade-date order (then creation order):

- BUY: `avg = (qty × avg + buyQty × price) ÷ (qty + buyQty)`, `qty += buyQty`
- SELL: rejected if `sellQty > qty` on that date; otherwise `qty -= sellQty` and the average cost is unchanged
- `totalInvested = qty × avg`, `totalValue = qty × marketPrice`, `gain = value − invested`, `gainPct = gain ÷ invested × 100`

New trades and deletes are validated by replaying the history with the change applied, inside a **serializable** database transaction, so two simultaneous sells can't both pass the check.

**Pagination** keeps the body a plain array (so existing clients are unaffected) and reports the total in the `X-Total-Count` header. **CSV export** quotes fields per RFC 4180 and prefixes text starting with `=`, `+`, `-` or `@` so spreadsheets can't run it as a formula (CSV injection).

## Tests

```bash
cd backend && npm test     # 34 tests
cd frontend && npm test    # 8 tests
```

**Backend (Vitest, no database needed)**

| File | Tests | Covers |
| --- | --- | --- |
| `src/lib/holdings.test.ts` | 10 | Weighted average cost, partial sells, oversell (status, code, message, field), back-dated sells, deleting a buy a later sell depends on, same-day ordering, fully sold instruments, totals with a gain and a loss, exact decimals |
| `src/lib/errors.test.ts` | 7 | One error shape for `ApiError`, Zod (422), Prisma conflicts (409) and unexpected errors (500 **without leaking details**); malformed JSON (400); invalid ids (404) |
| `src/lib/schemas.test.ts` | 6 | Email normalisation, password strength, KES/USD only, ticker upper-casing, negative quantities and future dates rejected |
| `src/lib/csv.test.ts` | 6 | CSV quoting, formula-injection escaping, pagination parameter rules |
| `src/lib/dashboard.test.ts` | 5 | Per-currency totals (never mixed), distinct clients, best/worst performers, recent activity, empty dashboard |

**Frontend (Vitest + React Testing Library, jsdom)**

| File | Tests | Covers |
| --- | --- | --- |
| `src/components/TransactionForm.test.tsx` | 4 | Field errors on an empty submit, "You currently hold…" before a sell, a valid trade submitted with an upper-case ticker, the API's oversell error shown under Quantity |
| `src/lib/format.test.ts` | 4 | `KES 1,250,000.00`, signed gains/losses, colour only with a sign, dates |

Linting: `npm run lint` in each folder. The frontend's `npm run build` also type-checks. CI runs all of this on every push.

## Deployment

Both apps are on Vercel and redeploy automatically on every push to `main`. The database is a Neon Postgres project in Frankfurt (closest region to Nairobi).

**CI/CD**

- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm ci`, lint, tests and a production build for the backend and the frontend on every push to `main` and every pull request (Node 22).
- **CD:** each Vercel project is connected to this repository and deploys `main` automatically; pull requests get preview deployments. The API's build command applies any pending Prisma migrations before building, so schema changes ship with the code.

| Part | URL | Vercel settings |
| --- | --- | --- |
| API | https://fintrack-apis.vercel.app | Root directory `backend`; build command `npm run db:deploy && npm run build` (applies pending migrations, then builds) |
| Frontend | https://fintrack-ui1.vercel.app | Root directory `frontend`; Vite preset; `vercel.json` rewrites every path to `index.html` |

Steps to reproduce:

1. Create a Neon project; copy the pooled and direct connection strings.
2. From a laptop with `backend/.env` pointing at Neon: `npx prisma migrate deploy` and `npx prisma db seed`.
3. Vercel → New Project → this repo, root `backend`, build command as above. Environment variables: `DATABASE_URL`, `DIRECT_URL`, a new `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`. Deploy.
4. Vercel → New Project → this repo, root `frontend`. Environment variable `VITE_API_URL` = the API URL. Deploy.
5. Set the API's `CORS_ORIGIN` to the frontend URL and redeploy the API. (Environment variable changes only apply after a redeploy.)

Secrets exist only in Vercel's environment settings and local, git-ignored `.env` files. CORS allows only the production frontend origin.

## Assumptions

- **Market price = the instrument's most recent trade price** in that portfolio, because no price feed was provided. The detail page states this under the holdings table.
- **Weighted average cost.** Selling does not change the average cost of the remaining units; realised gains are not tracked.
- **One analyst owns each portfolio.** There is no sharing between analysts yet (see next steps).
- **No FX conversion.** Each portfolio is reported in its own base currency; KES and USD totals are never mixed.
- **Instruments are free-text tickers** (stored upper-case, e.g. `SCOM`, `KCB`, `T-BILL-91`), not a managed instrument list.
- **Trade dates** may be today or in the past, not in the future. Trades on the same date are ordered by when they were entered.
- **A portfolio's base currency can be edited**; the stored amounts are not converted.

## Trade-offs

- **JWT in `localStorage`** keeps a session across refreshes with very little code. The risk is that an XSS bug could read it; React's default escaping reduces that risk. An httpOnly cookie with refresh tokens would be stronger.
- **No refresh tokens or revocation list.** Tokens expire after `JWT_EXPIRES_IN` (8h). `requireUser` re-loads the user on every request, so a deleted account stops working immediately.
- **The UI sorts, filters and pages in the browser.** A portfolio's trade list is small and already loaded, so this is instant. The API already supports `?page=&pageSize=` for when histories grow; switching the table to it would also need server-side sorting and filtering.
- **Dashboard totals stay per currency.** Without an FX feed, adding KES and USD would be misleading, so assets under management are shown once per currency.
- **Summary is recalculated on each request** by replaying all trades. That is simple and always correct at this scale; very large portfolios would need cached positions.
- **Serializable transactions** prevent two concurrent sells from both passing the holdings check, at the cost of an occasional 409 the client must retry.
- **Two Vercel projects instead of one Next.js app.** It keeps the SPA genuinely separate from the API, as the brief asks, and makes CORS a real, tested boundary.

## Next steps

- **Role-based access control (RBAC).** Add a `role` to users, e.g. `ADMIN` (manage analysts and all portfolios), `ANALYST` (manage own and shared portfolios) and `VIEWER` (read-only), carried in the JWT and enforced in one `requireRole()` check beside `requireUser()`. The UI would hide actions a role can't perform, while the API stays the real gatekeeper.
- **Multi-user access to portfolios.** Replace the single `user_id` owner with a `portfolio_members` table (`portfolio_id`, `user_id`, `access`: owner / editor / viewer) so a team can share a client's portfolio. Ownership checks would become membership checks, still returning 404 to non-members, and every change would be logged in an audit table (who, what, when).
- A live price feed for market value, and FX conversion to report USD portfolios in KES.
- Realised gain/loss on sells, and transaction fees.
- httpOnly-cookie sessions with refresh tokens; rate limiting on login.
- **KYC for clients.** Capture and verify client identity (ID or passport, KRA PIN, proof of address) before a portfolio can trade, with a status per client (pending / verified / rejected) and documents stored securely.
- **More comprehensive reports.** Performance over time, asset allocation by sector and asset class, period statements per client, and PDF export.
- **More currencies.** Extend the `Currency` enum beyond KES and USD (e.g. EUR, GBP, UGX, TZS), with a stored exchange rate per trade date so historical values stay correct.

## AI usage

I used Claude Code, an AI coding assistant, as a pair programmer.

## Screenshots

**Login** with the one-click demo account

![Login](docs/screenshots/login.png)

**Dashboard:** KPIs, assets under management per currency

![Dashboard](docs/screenshots/dashboard.png)

**Dashboard:** performance highlights, largest positions and recent activity

![Dashboard activity](docs/screenshots/dashboard-activity.png)

**Portfolios** with search (light and dark mode)

![Portfolios](docs/screenshots/portfolios.png)

![Portfolios in dark mode](docs/screenshots/portfolios-dark.png)

**Portfolio detail:** summary tiles and allocation donut

![Portfolio detail](docs/screenshots/detail-desktop.png)

**Portfolio detail in USD:** every amount follows the portfolio's own base currency

![USD portfolio detail](docs/screenshots/detail-usd.png)

**Portfolio detail:** holdings and the sortable, filterable transactions table with CSV export

![Holdings and transactions](docs/screenshots/detail-holdings.png)
