# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Goalie answers one question: **which money did I actually spend?** A bank account shows one
combined number; Goalie keeps every rupee attached to the income it came from, so you can buy a
speaker with interest money and a watch with freelance money and still see the difference.

FastAPI + MongoDB (Atlas) backend in `backend/`, React 19 + Vite + TypeScript frontend in
`frontend/`. There is no root package manager — each half builds independently, or together via
`docker-compose.yml`.

## Commands

Backend (from `backend/`, venv lives at `backend/venv`):

```bash
uvicorn main:app --reload --port 8000   # dev server; interactive docs at /docs
pip install -r requirements.txt
```

Frontend (from `frontend/`):

```bash
pnpm run dev        # Vite dev server on :5173
pnpm run build      # tsc -b && vite build  — this is the typecheck; run it before committing
pnpm run lint       # eslint .
```

There is **no test suite**. The verification bar is static:

```bash
python -m compileall backend/                      # syntax
python -c "from main import app; app.openapi()"    # builds every route's schema —
                                                   # catches Pydantic/response_model errors
pnpm run build && pnpm run lint                    # frontend
```

Full stack: `docker-compose up --build` → frontend on :3000 (nginx, proxies `/api/` to the backend
container), backend on :8000. Compose reads a root `./.env`; the backend also loads `backend/.env`
via `python-dotenv` when run directly.

## Environment variables

Backend (`backend/.env`): `MONGO_CLIENT`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`JWT_SECRET_KEY`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`.
Frontend: `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).

`FRONTEND_URL` is both the post-login redirect target and a CORS origin — changing the frontend's
deployed URL requires updating it on the backend, not just the frontend build.

## Domain model — the part that spans files

Three collections: `goals`, `labels`, and **`entries`** (the ledger). Everything that is a
number is derived from `entries`; nothing is stored.

The central noun is an **income**: *one earning event*, with its own date and its own balance.
It is a **lot, not a pool** — money earned from Mr. John in August stays identifiable as that
money for as long as any of it is left. There is deliberately no category-level pool that
income flows into and loses its identity in; that was the v3 model and it could not answer
"when did I earn this?".

- `kind: "income"` — a lot. `total` is the amount, `splits` is **empty**.
- `kind: "expense"` — a draw. `splits: [{incomeId, amount}]` says which earning(s) it was
  **spent from**. One expense may draw on several incomes.
- `kind: "reservation"` / `"release"` — draws written by `goals.py` when a goal claims or
  gives back part of an income.
- `categoryId` and `accountId` are **adjectives**, both nullable, both `labels` rows (one
  collection, `kind` discriminator: `income_category` / `expense_category` / `account`).
  An account records *where cash landed* — a historical fact about the event. It has **no
  balance, no validation, and no transfers**; do not add balance semantics to it.

### Colour

Only **income categories** carry a `colourSlot`. There are far too many income lots to give
each its own hue, so colour groups them and identity is carried by **description + date**
("Project for Mr. John · 14 Aug", `incomeTitle()`). Expense categories and accounts have no
colour.

### The derived quantities ([backend/aggregates.py](backend/aggregates.py))

```
income.spent     = Σ expense splits pointing at this income
income.reserved  = Σ reservation − Σ release
income.remaining = amount − spent − reserved
```

**The one invariant: `remaining >= 0` on every income, always.** You cannot spend more of an
earning than you earned. Both expenses and reservations consume it. Enforced by
`assert_remaining` ([backend/guards.py](backend/guards.py)), which must be called **inside**
the transaction, after reads and before writes. Any new money-moving endpoint has to call it.
Note the non-obvious cases: *shrinking* an income, and *deleting* one, are both blocked by the
same rule.

### Goal completion — never automatic

Reaching the target changes **nothing** in the data; it only enables a button. `POST
/goals/{id}/complete` is the sole path from reserved money to spent money, and in one
transaction it:

1. writes a `release` entry restoring every reservation to its income's `remaining`,
2. calls `assert_remaining` on the purchase splits (which now see that money), and
3. writes one `expense` carrying those splits + `goalId`, then flips `status` to `completed`.

Because step 1 precedes step 2, paying *more* than you reserved works as long as the extra
exists somewhere. Both entries share a `completionId`, which is what `/goals/{id}/reopen`
deletes to undo the whole thing. The status check lives inside the transaction, so a
double-click cannot spend twice.

### P&L vs. drawdown — two views, do not conflate them

`GET /entries/pnl` is a **period** view: money earned in August and spent in September counts
as August income and September expense. That is correct accounting, and it is why the *lot
drawdown* (how far a single earning has been consumed) lives on income cards and in its own
Insights section instead. Both are on the Insights page; keep them visually separate.

`transactions` require a replica set — Atlas works, a standalone local `mongod` does not.

## Backend layout

`main.py` wires four routers under a `lifespan` handler that awaits `create_indexes()`:
`auth` (`/auth`), `labels`, `entries`, `goals`. Motor handles live in `database.py`.
`labels.seed_default_labels()` runs on signup *and* lazily from `GET /labels`, so the eight
default income categories (mapped onto the eight palette slots) always exist.

- `models.py` holds every Pydantic request/response model — endpoints take typed bodies, not raw
  dicts. `helpers.py` has serialisers plus `oid()` (400s on malformed ids) and `as_utc()` (Mongo
  returns naive datetimes; unmarked, JavaScript reads them as local time).
- **Money is an integer number of hundredths** (paise/cents) in the DB, on the wire, and in React
  state. Floats only ever exist inside `Intl`.
- Auth: Google OAuth → JWT in an httpOnly, `secure`, `SameSite=None` cookie named `jwt_token`.
  Every protected route takes `user=Depends(get_current_user)` and scopes by `user["sub"]`, stored
  on documents as `userId`. Cross-site cookie ⇒ requests must be credentialed and served over
  HTTPS anywhere but localhost.

## Frontend layout

Pages are flat in `src/` (`Dashboard`, `EntriesPage`, `GoalsPage`, `Insights`, `SettingsPage`,
`Home`, plus `IncomeCard`, `GoalCard`, `GoalForm`, `EntryForm`). `EntriesPage` powers three
routes — Income (renders lots), Expenses and Ledger (render entries) — differing by `kind`.

- **All server state goes through `src/hooks/queries.ts`.** Because every balance derives from the
  ledger, `useLedgerMutation` invalidates `incomes`, `goals`, `entries` and `pnl` together.
  Use it for anything that moves money; `useSimpleMutation` is for labels and settings.
- `src/api/` is the single API layer (one credentialed axios instance, 401 → `/`). `apiError()`
  pulls FastAPI's `detail` out for toasts — those messages are written to be actionable, so show
  them rather than a generic failure.
- `src/lib/money.ts` owns all formatting. Compact notation is **locale**-driven, not
  currency-driven: `en-IN` renders 500000 as "5L", `en-US` as "500K", `de-DE` as "500.000". Hence
  two user settings, `currency` + `locale`. **Never use `formatMoneyCompact` where exactness
  matters** — it is for hero tiles and axes only, always with the exact value in `title`.
- `src/lib/palette.ts` is the 8-slot categorical palette used by income categories. The **order is
  the colourblind-safety mechanism** — validated for CVD separation against the canvas. Do not
  reorder and do not add a ninth hue; past eight, fold into "Other". Four slots sit below 3:1
  contrast, so every segmented bar ships a legend with amounts — identity never rests on colour
  alone. `src/lib/income.ts` holds `incomeTitle`, `incomeColour` and the picker sort options.
- Design tokens live in `src/index.css`: warm-paper canvas, evergreen brand, **no gradients**,
  light mode only. Typography is DM Serif Display (headings and hero numbers — **400 weight only,
  there is no bold cut**) over Inter Tight (UI, and all money in lists, with `.tabular`).
  Glassmorphism is retained: `.glass-card`, plus `.glass-card-strong` for anything carrying serif
  text or money.
- Motion is deliberately tight — `--motion-fast/base/slow` at 120/180/260ms with a 30ms stagger
  (`staggerStyle` in `src/lib/motion.ts`). Keep new animations on those tokens; the app should
  never feel like it is waiting.
- Tailwind v4 via the Vite plugin, so there is no `tailwind.config.js`. shadcn/ui primitives in
  `src/components/ui/` (new-york, added via the shadcn CLI). `@/*` aliases `src/*`.
- Routing is client-side; SPA fallbacks configured for nginx (`try_files`) and Vercel
  (`vercel.json`). Toasts use `sonner` (`<Toaster />` is mounted in `App.tsx`), charts use
  `recharts`.
