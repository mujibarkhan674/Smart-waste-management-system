# Smart Waste Management System

A full-stack web application (BCA final-year project) that helps a city manage waste digitally:

- **Classify waste from a photo** into five categories with a real image model, and get the correct bin and disposal tips.
- **Monitor waste bins** — fill levels, status, location, collection history.
- **Plan collection routes** with the Nearest Neighbour algorithm over Haversine (great-circle) distances, with optional road-distance estimates from OSRM.
- **Administer operations** through a dashboard whose figures are all calculated from PostgreSQL records.

Waste categories: **Organic**, **Recyclable**, **Hazardous**, **General**, **E-Waste**.

---

## Features

| Module | What it does |
|---|---|
| Home | Project introduction with **live** statistics from the database (bins, classifications, 30-day collections, diversion rate). Shows "—" when the database is not connected. |
| Authentication | Sign up, sign in, sign out and 7-day sessions (Better Auth, email + password, 8+ character passwords, built-in rate limiting). |
| Roles | **Admin** – manage bins, routes, users, analytics. **Collection Staff** – view bins, assigned routes, mark bins collected. **General User** – classify waste, view own history. New sign-ups are General Users; an admin promotes them. |
| AI Waste Classification | JPG/PNG/WebP up to 4 MB, validated by file signature (magic bytes). Returns category, confidence, per-category scores, closest matching description, suggested bin and disposal tips. Every result is saved to PostgreSQL. |
| Bin Status Monitor | Add / edit / delete bins (with confirmation), search & filter, mark as collected, maintenance mode, "Sample" badge for seeded data. |
| Route Optimizer | Configurable fill threshold with auto-selection, manual selection, optional start point (depot), staff assignment, ordered sequence with per-leg distances, saved route history, Pending → In Progress → Completed. Completing a route marks every bin collected in one transaction. |
| Admin Dashboard | KPI cards, date-range filter (7/30/90 days or custom), bins by type, fill levels, daily trends, weekly & monthly analytics, collection history, classification statistics, user role management, active alerts, 60-second auto-refresh. |

### Bin status rules

| Fill level | Status |
|---|---|
| 0–49 % | Active |
| 50–69 % | Monitoring |
| 70–89 % | Almost Full |
| 90–100 % | Needs Collection |
| (manual) | Maintenance — overrides the above, excluded from automatic routes |

### How statistics are defined

- **Bins needing collection** = bins whose status is *Needs Collection* (≥ 90 %).
- **Today's collections** = rows in `collection_history` collected today in `APP_TIMEZONE` (default Asia/Kolkata).
- **Estimated collected volume** of one collection = fill level before collection × bin capacity (litres).
- **Recycling / Diversion rate** = estimated volume from *recyclable + organic + e-waste* bins ÷ estimated volume from *all* bins, in the selected period. The recyclable-only rate is shown alongside.
- **Average fill level** = mean of current fill levels across all bins.

No figures are hard-coded. With an empty database the dashboard shows zeros / "—".

---

## Technology

Next.js 16 (App Router, API routes) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Lucide · Recharts ·
PostgreSQL · Drizzle ORM + drizzle-kit migrations · Better Auth · Zod validation ·
transformers.js (CLIP, ONNX) · optional Anthropic Claude vision · optional OSRM routing.

---

## About the AI classification (please read)

The classifier sits behind a provider interface (`lib/classifier/`). Choose one with `CLASSIFIER_PROVIDER`:

| Provider | What it is | Confidence shown as |
|---|---|---|
| `clip-local` (default) | OpenAI **CLIP ViT-B/32** run locally with transformers.js. Zero-shot: the image is compared with text descriptions of typical items in each category (e.g. "a plastic bottle", "used batteries"); a category's confidence is the sum of the softmax probabilities of its descriptions. No API key. The ~90 MB model is downloaded from Hugging Face on first use and cached. | Model probability |
| `anthropic` | Claude vision model via the Anthropic API with structured JSON output. Needs `ANTHROPIC_API_KEY`. | The model's own estimate (not calibrated) |
| `demo` | **Not AI.** Picks a category from a hash of the file so the UI can be demonstrated offline. A red "Demo mode" banner is shown and results are stored with provider `demo`. | Not shown |

**Limitations (be honest about these in the project report):** CLIP is a general-purpose model and is **not fine-tuned on waste images**. It works well on clear photos of a single item but can be wrong on cluttered scenes, unusual items, or items that belong to several categories (e.g. a battery is both hazardous and e-waste). Results below 50 % are flagged "Low confidence" in the UI. For production accuracy, fine-tune a model on a waste dataset (e.g. TrashNet / TACO) and add it as another provider.

Measured during testing on five public-domain photos from Wikimedia Commons:

| Photo | Prediction | Confidence |
|---|---|---|
| Bales of PET bottles | Recyclable ("a plastic bottle") | 93 % |
| Banana | Organic ("rotten fruit") | 72 % |
| AA battery | Hazardous ("used batteries") | 66 % |
| Smartphone | E-Waste ("a mobile phone") | 58 % |
| Skateboarder jumping a cardboard box | Recyclable ("a cardboard box") | 46 % (low-confidence warning) |

This is a 5-image sanity check, not an accuracy evaluation.

---

## About route distances

- Ordering always uses **Nearest Neighbour** over **straight-line (Haversine)** distances. It starts from the given start point / `DEPOT_LATITUDE,DEPOT_LONGITUDE`, or otherwise from the fullest bin.
- **Straight-line distance** is "as the crow flies" — always calculated and stored.
- With `ROUTING_PROVIDER=osrm`, the ordered sequence is also sent to an OSRM server to get an **estimated road distance** and driving time. If OSRM is unavailable the app falls back to straight-line distance. The UI labels which one is which.
- Straight-line time estimate = distance ÷ `ROUTE_AVG_SPEED_KMH` (25) + `ROUTE_SERVICE_MIN_PER_STOP` (5) per stop.
- There is **no GPS or live vehicle tracking**.

Nearest Neighbour is a fast heuristic, not an optimal solver; routes can be a little longer than the true shortest tour.

---

## Getting started (local)

Requirements: **Node.js 20+** (tested on 24), **pnpm** (`npm i -g pnpm` or `npx pnpm`), and a **PostgreSQL 14+** database (local install, Docker, or a free hosted one such as Neon/Supabase).

```bash
pnpm install                 # install dependencies (uses pnpm-lock.yaml)
cp .env.example .env.local   # then edit DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate              # create tables
pnpm db:seed                 # optional: sample bins, sample history, demo accounts
pnpm dev                     # http://localhost:3000
```

Generate a secret with `openssl rand -base64 32`.

### Demo accounts (created by `pnpm db:seed`)

| Email | Role | Password |
|---|---|---|
| admin@smartwaste.demo | Admin | `SEED_ADMIN_PASSWORD` or `ChangeMe123!` |
| staff@smartwaste.demo | Collection Staff | `SEED_STAFF_PASSWORD` or `ChangeMe123!` |
| user@smartwaste.demo | General User | `SEED_USER_PASSWORD` or `ChangeMe123!` |

Change these passwords (or set the env vars) before any public deployment.

### Sample data

The seed inserts **10 bins at clearly labelled SAMPLE locations around Kolkata** (addresses end with "(sample location)"). They are **not official municipal bin locations**. It also creates ~60 days of sample collection history so the charts have something to show. All seeded rows have `is_sample = true`; the dashboard shows an "Includes sample data" notice, and bins show a "Sample" badge. **No classification records are seeded** — those only come from real model predictions.

`pnpm db:seed --reset` deletes and recreates the sample bins and sample history (real data is untouched).

### Making someone an admin

Either use **Admin Dashboard → Users**, or from the command line:

```bash
pnpm user:role someone@example.com admin    # admin | staff | user
```

---

## Database

Schema: `lib/db/schema.ts` · Migrations: `drizzle/` · Config: `drizzle.config.ts`.

| Table | Purpose |
|---|---|
| `user`, `session`, `account`, `verification` | Better Auth (camelCase columns). `user.role` ∈ admin/staff/user (check constraint). |
| `bins` | Name, waste type (enum), address, latitude/longitude (range checks), fill level (0–100 check), capacity, status (enum), last collected, `is_sample`. |
| `classifications` | User (FK, set null on delete), predicted type, confidence (0–1 check), provider, model, per-category scores (jsonb), matched label, image name/type/size. Images themselves are **not stored**. |
| `collection_routes` | Status (enum), straight-line & road distance, distance method, estimated minutes, threshold, start point, assigned staff (FK), creator (FK), timestamps. |
| `route_stops` | Ordered stops (route FK cascade, bin FK set null, unique route+sequence) with bin name snapshot and leg distance. |
| `collection_history` | One row per collection: bin (FK set null) + name/type snapshot, route (FK), collector (FK), fill before, estimated volume, `is_sample`. |

Indexes exist on all foreign keys and on the columns used for filtering (`status`, `type`, `fill_level`, `created_at`, `collected_at`).

| Command | Does |
|---|---|
| `pnpm db:generate` | Create a new migration after editing `schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Insert demo data |
| `pnpm db:studio` | Browse the database (Drizzle Studio) |

> **Upgrading from the original v0 prototype database:** the old tables (`bins` with a `location` column, `collection_routes.bin_ids` text, etc.) are incompatible. They contained only demo data. Drop them (`DROP TABLE IF EXISTS collection_history, collection_routes, classifications, bins CASCADE;`) before running `pnpm db:migrate`, or use a fresh database.

---

## API

All responses are JSON: success `{ "data": … }`, failure `{ "error": "message", "details"?: … }` with a proper status code (400 validation, 401 not signed in, 403 wrong role, 404, 409 conflict, 413 too large, 415 unsupported type, 503 database/model unavailable).

| Method & path | Who | Notes |
|---|---|---|
| `/api/auth/*` | public | Better Auth (sign-up/email, sign-in/email, sign-out, get-session) |
| `GET /api/bins` | admin, staff | All bins |
| `POST /api/bins` | admin | `{ name, type, address, latitude, longitude, fillLevel?, capacityLiters?, maintenance? }` |
| `GET /api/bins/[id]` | admin, staff | |
| `PATCH /api/bins/[id]` | admin (edit) · admin/staff (`{ "action": "collect" }`) | Partial update; status recalculated |
| `DELETE /api/bins/[id]` | admin | 409 while the bin is on a pending/in-progress route |
| `PATCH /api/bins` | legacy | `{ id, action: "collect" }` or `{ id, fillLevel }` — kept for compatibility |
| `GET /api/classify` | signed in | Own history (`?limit=`, admins `?scope=all`) |
| `POST /api/classify` | signed in | `multipart/form-data` field `image` (legacy JSON `{ imageData: dataURL }` also accepted) |
| `GET /api/routes` | admin (all), staff (assigned) | Routes with ordered stops |
| `POST /api/routes` | admin | `{ binIds?, threshold?, start?: {latitude, longitude}, assignedTo?, name? }` — omit `binIds` to use all bins ≥ threshold |
| `PATCH /api/routes` | admin, assigned staff | `{ routeId, status }`; only pending→in_progress→completed |
| `GET /api/stats` | admin | `?from=YYYY-MM-DD&to=YYYY-MM-DD` (default last 30 days) |
| `GET /api/users` | admin | `?role=staff,admin` |
| `PATCH /api/users/[id]` | admin | `{ role }` (cannot change your own role) |

---

## Development commands

| Command | |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Haversine, Nearest Neighbour, status rules, file-type sniffing) |

---

## Deploying to Vercel

The live deployment of this project uses **Vercel + Neon (Postgres)** with these settings:

| Setting | Value |
|---|---|
| Root Directory | `nextjs-app` |
| Node.js version | 24.x |
| Build command | `pnpm db:migrate && pnpm build` (migrations run automatically on every deploy) |
| Function region | Singapore `sin1` (set in `vercel.json`, next to the Neon database) |
| Production branch | the branch you deploy from (`nextjs-app` while developing, `main` after merging) |

Steps for a fresh deployment:

1. Import the GitHub repository in Vercel and set **Root Directory** to `nextjs-app`.
2. In the project → **Storage** → **Create Database** → **Neon**, choose the Singapore region and connect it to the project. This adds `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`, used for migrations) automatically.
3. In **Settings → Environment Variables** add:
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `CLASSIFIER_PROVIDER=clip-local`, `APP_TIMEZONE=Asia/Kolkata`, `MAX_UPLOAD_MB=4`, `ONNXRUNTIME_NODE_INSTALL=skip`, and — before the first seed — `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_USER_PASSWORD` (strong values; never rely on the default in public).
   `BETTER_AUTH_URL` is optional on Vercel: the production URL is detected automatically.
4. For the **first** deploy only, set the build command to `pnpm db:migrate && pnpm db:seed && pnpm build`, then change it back to `pnpm db:migrate && pnpm build` so later deploys don't re-seed.
5. Deploy by pushing to the production branch (or `vercel --prod`).

**Classifier on Vercel (tested):** `clip-local` works on Vercel. The first classification after a cold start takes ~7 s (the ~90 MB model is downloaded into `/tmp`), later ones ~1 s. The classify function is ~105 MB, below Vercel's 250 MB limit, because only the Linux x64 runtime files are bundled (`outputFileTracingIncludes` in `next.config.mjs`). Two details make this work:
- `.npmrc` sets `node-linker=hoisted`: Vercel refuses function packages with files inside symlinked folders, which is how pnpm normally stores `onnxruntime-node` and `sharp`.
- `ONNXRUNTIME_NODE_INSTALL=skip` stops `onnxruntime-node` downloading its large GPU/CUDA libraries on Linux build servers.

`CLASSIFIER_PROVIDER=anthropic` (with `ANTHROPIC_API_KEY`) remains an alternative if you prefer an external vision API.

Uploads are capped at 4 MB because Vercel limits request bodies to 4.5 MB.

---

## Project structure

```
app/                 pages (/, /classify, /bins, /routes, /dashboard, /sign-in, /sign-up) and API routes
components/          feature components + components/ui (shadcn)
lib/
  auth.ts            Better Auth server config (roles via additionalFields)
  api.ts             JSON envelope, error handling, requireUser(roles)
  page-auth.ts       server-side page guard
  validation.ts      Zod request schemas
  routing.ts         Haversine, Nearest Neighbour, OSRM client
  bin-status.ts      fill-level → status rules
  classifier/        provider interface + clip-local, anthropic, demo
  services/          collection, routes, stats (DB logic)
  db/                Drizzle client and schema
drizzle/             SQL migrations
scripts/             migrate, seed, set-role
tests/               unit tests
```
