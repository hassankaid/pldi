# PLDI Compta — Dashboard

Next.js 16 + Supabase frontend for the PLDI Kajabi accounting dashboard.

## Stack

- **Next.js 16.2** App Router (React 19, Server Components)
- **TypeScript** strict
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase Auth** (email/password)
- **@supabase/ssr** for cookie-based session
- **TanStack Table** for data tables
- **Recharts** for the revenue chart
- **Lucide** icons

## Local setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in the values from Supabase
(Project Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # SERVER-ONLY, never expose
```

### 3. Create the first user

The signup endpoint is disabled — users are created **manually** via Supabase
Dashboard:

1. Go to `https://supabase.com/dashboard/project/<your-ref>/auth/users`
2. Click **Add user** → **Create new user**
3. Set email + password + check **Auto Confirm User**
4. Done — you can sign in at `/login`

### 4. Run dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### 5. Build for production

```bash
npm run build
npm start
```

## Architecture

```
app/
├── layout.tsx          Root layout (html + body + Toaster)
├── login/page.tsx      Public login form
├── actions/auth.ts     Server actions: login, logout
└── (app)/              Protected route group (sidebar shell)
    ├── layout.tsx      Auth-checked layout with sidebar
    ├── page.tsx        / -- dashboard home (KPIs + chart + top customers)
    ├── sales/          ventes : list + [id] detail
    ├── customers/      clients : list + [id] detail
    ├── impayes/        tableau des impayés
    ├── revenue/        compta mensuelle
    └── review/         ventes à auditer (no_coverage + overpayment)

lib/
├── supabase/
│   ├── client.ts       Browser client (anon key)
│   ├── server.ts       Server client (cookie-aware, user-scoped)
│   └── admin.ts        Service-role client (bypass RLS, server-only)
├── data/               Server-only data fetching helpers
│   ├── kpi.ts          getDashboardKPIs, getMonthlyRevenue, getTopCustomers
│   ├── sales.ts        getAllSales, getSaleById, getPaymentsForSale, ...
│   ├── customers.ts    getAllCustomers
│   ├── impayes.ts      getAllImpayes
│   ├── review.ts       getReviewList
│   └── types.ts        TypeScript types for app.* views
├── dal.ts              getCurrentUser, requireUser (memoized)
├── format.ts           formatEur, formatDate, etc. (fr-FR)
└── utils.ts            shadcn cn() helper

components/
├── ui/                 shadcn primitives (button, card, table, …)
├── app-sidebar.tsx     Sidebar with nav + logout
├── kpi-card.tsx        Stat card for the dashboard
├── revenue-chart.tsx   Monthly revenue bar chart (Recharts)
├── state-badge.tsx     StateBadge, PaymentTypeBadge
└── data-table.tsx      Generic TanStack table with search/filter/pagination

proxy.ts                Next.js 16 proxy (formerly middleware) -- auth gate + cookie refresh
```

## Data layer contract

The frontend reads from `app.*` views in Postgres:

- `app.sales` — one row per sale, payment aggregates included
- `app.payments` — one row per Kajabi transaction (incl. failed, refunds)
- `app.payment_schedule` — projected installments matched with payments
- `app.v_revenue_monthly` — monthly net revenue (provisional/finalized)
- `app.v_impaye` — flagged unpaid installments with customer info
- `app.v_customer_summary` — 360 customer view
- `app.v_sales_review_needed` — sales needing manual override

The PostgREST `app` schema is exposed via the `pgrst.db_schemas` role setting
(migration `expose_app_schema_to_postgrest`).

## Deployment (Vercel)

1. Connect the repo on Vercel and select `web/` as the **Root Directory**.
2. Add the three env vars in Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as **Secret**)
3. Add the Vercel production URL to Supabase Auth → URL Configuration → Redirect URLs.
4. Deploy.

## Key Next.js 16 notes

- All `cookies()` and `params` calls are **async** (`await`)
- Middleware filename is **`proxy.ts`** at the project root
- Auth flow uses **Server Actions** + `useActionState` (no API routes)

See `AGENTS.md` / `CLAUDE.md` for the reminder to always read the bundled docs
in `node_modules/next/dist/docs/` rather than relying on training-data
patterns.
