# FinTrack by Finnet Technologies

A portfolio and transactions tracker for investment analysts. An analyst registers, creates client portfolios, records BUY/SELL trades and sees holdings, performance and allocation at a glance.

| | |
| --- | --- |
| **Live app** | https://fintrack-ui1.vercel.app |
| **API docs (Swagger)** | https://fintrack-apis.vercel.app/api/docs |
| **Demo login** | `demo@fintrack.app` / `Demo@2026` (or click **Fill in demo login**) |

The demo analyst has three seeded portfolios (two in KES, one in USD) with 22 trades. All client names and data are fictional.

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

- **Auth:** register and log in; passwords hashed with bcrypt; every other endpoint requires a JWT.
- **Portfolios:** create, edit and delete client portfolios in KES or USD. Each analyst only ever sees their own.
- **Transactions:** record BUY/SELL trades; sort and filter by instrument, type and date range; delete with confirmation.
- **Holdings summary:** per-instrument net quantity, weighted average cost, total invested, market value and signed gain/loss, plus portfolio totals.
- **Validation:** negative quantities, overselling (including back-dated sells), unknown portfolios and deletes that would break a later sell are rejected with the correct status code and one consistent JSON error shape.
- **UI:** allocation donut chart; loading, empty and error states for every API call; confirmation before every delete; responsive down to 375px; keyboard and screen-reader friendly (WCAG AA contrast).

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
├─ backend/                      Next.js 16 (route handlers only, no pages)
│  ├─ prisma/schema.prisma       users, portfolios, transactions
│  ├─ prisma/migrations/         SQL migrations
│  ├─ prisma/seed.ts             demo analyst + portfolios + trades
│  ├─ public/openapi.yaml        OpenAPI 3 spec (served at /openapi.yaml)
│  └─ src/
│     ├─ proxy.ts                CORS (Next 16's name for middleware)
│     ├─ lib/                    db, auth, errors, schemas, portfolios, transactions, holdings (+ tests)
│     └─ app/api/                REST endpoints and the Swagger UI page
└─ frontend/                     React 19 + Vite SPA
   ├─ vercel.json                SPA rewrite so deep links survive a refresh
   └─ src/
      ├─ styles/tokens.css       every colour, font size and spacing value, defined once
      ├─ api/                    fetch client, types, TanStack Query hooks
      ├─ auth/                   session context and route guards
      ├─ components/             header, tables, forms, chart, dialogs, state views
      ├─ lib/format.ts           money, signed numbers, dates
      └─ pages/                  login, register, portfolios, portfolio detail, 404
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
| Hosting | Vercel (API + SPA) and Neon (Postgres) | HTTPS, auto-deploy from `main`, and no cold-start sleep during the 14-day review window. Vercel is not in the brief's example list, but the brief allows any platform; free tiers that sleep (e.g. Render) can take 30–60 s to answer a reviewer's first request. |

## Run locally

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
| GET | `/api/portfolios` | 200 list (with `transactionCount`) | 401 |
| POST | `/api/portfolios` | 201 portfolio | 422 |
| GET | `/api/portfolios/{id}` | 200 portfolio | 404 |
| PUT | `/api/portfolios/{id}` | 200 portfolio | 404, 422 |
| DELETE | `/api/portfolios/{id}` | 204 (its transactions too) | 404 |
| GET | `/api/portfolios/{id}/transactions` | 200 list, newest first | 404 |
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

## Tests

```bash
cd backend
npm test
```

10 Vitest unit tests cover the holdings rules in `backend/src/lib/holdings.test.ts`: single and averaged buys, average cost after a partial sell, oversell (status, code, message and field details), a back-dated sell before its buy, deleting a buy that a later sell depends on, same-day ordering, a fully sold instrument dropping out, portfolio totals with a gain and a loss, and exact decimal arithmetic.

Linting: `npm run lint` in each folder. The frontend's `npm run build` also type-checks.

## Deployment

Both apps are on Vercel and redeploy automatically on every push to `main`. The database is a Neon Postgres project in Frankfurt (closest region to Nairobi).

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
- **Sorting and filtering happen in the browser.** A portfolio's trade list is small and already loaded; server-side pagination would be needed for very large histories.
- **Summary is recalculated on each request** by replaying all trades. That is simple and always correct at this scale; very large portfolios would need cached positions.
- **Serializable transactions** prevent two concurrent sells from both passing the holdings check, at the cost of an occasional 409 the client must retry.
- **Two Vercel projects instead of one Next.js app.** It keeps the SPA genuinely separate from the API, as the brief asks, and makes CORS a real, tested boundary.

## Next steps

- **Role-based access control (RBAC).** Add a `role` to users, e.g. `ADMIN` (manage analysts and all portfolios), `ANALYST` (manage own and shared portfolios) and `VIEWER` (read-only), carried in the JWT and enforced in one `requireRole()` check beside `requireUser()`. The UI would hide actions a role can't perform, while the API stays the real gatekeeper.
- **Multi-user access to portfolios.** Replace the single `user_id` owner with a `portfolio_members` table (`portfolio_id`, `user_id`, `access`: owner / editor / viewer) so a team can share a client's portfolio. Ownership checks would become membership checks, still returning 404 to non-members, and every change would be logged in an audit table (who, what, when).
- A live price feed for market value, and FX conversion to report USD portfolios in KES.
- Realised gain/loss on sells, and transaction fees.
- httpOnly-cookie sessions with refresh tokens; rate limiting on login.
- Server-side pagination and CSV export of transactions.
- Docker Compose for API, frontend and database; end-to-end tests (Playwright).
- Dark mode using the same design tokens.

## AI usage

I used Claude Code, an AI coding assistant, as a pair programmer.

## Screenshots

| | |
| --- | --- |
| Login | ![Login](docs/screenshots/login.png) |
| Portfolio list | ![Portfolios](docs/screenshots/portfolios.png) |
| Portfolio detail (desktop) | ![Portfolio detail](docs/screenshots/detail-desktop.png) |
| Portfolio detail (375px) | ![Portfolio detail on mobile](docs/screenshots/detail-mobile.png) |
