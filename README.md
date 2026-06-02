# PriceEngine — B2B SaaS Pricing & Packaging Engine

A production-ready **Configure-Price-Quote (CPQ)** platform built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Prisma/PostgreSQL. Designed for Vercel deployment with zero-dependency pricing math and a terminal-style UI.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Running Locally](#running-locally)
5. [Running Tests](#running-tests)
6. [Project Structure](#project-structure)
7. [Architecture & Design Decisions](#architecture--design-decisions)
8. [Business Logic Reference](#business-logic-reference)
9. [Deployment to Vercel](#deployment-to-vercel)
10. [Extension Points](#extension-points)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL

# 3. Run database migration
npm run db:migrate

# 4. Seed sample data (optional but recommended)
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — auto-redirects to `/admin`.

---

## Environment Setup

Create a `.env` file from the example:

```env
# PostgreSQL connection string (required)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

### Local PostgreSQL via Docker

```bash
docker run --name pricing-pg \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=pricing_engine \
  -p 5432:5432 \
  -d postgres:16

# Then set:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/pricing_engine"
```

### Prisma Postgres (Cloud — Zero Config)

```bash
npx create-db
# Follow prompts, paste the DATABASE_URL into .env
```

---

## Database Setup

```bash
npm run db:migrate        # Create/update schema (dev — generates migration files)
npm run db:migrate:prod   # Apply migrations in production (no prompts)
npm run db:push           # Sync schema without migration files (dev prototyping only)
npm run db:seed           # Load sample data: 1 product, 3 tiers, 5 features, 1 quote
npm run db:studio         # Open Prisma Studio browser UI
```

---

## Running Locally

```bash
npm run dev      # Dev server → http://localhost:3000 with hot reload
npm run build    # Production build (runs prisma generate first)
npm run start    # Production server (requires npm run build first)
npm run lint     # ESLint check
```

---

## Running Tests

### Unit Tests (Vitest)

Pure pricing math tests — **zero database or Next.js runtime dependency**.

```bash
npm run test            # Run all unit tests (CI mode)
npm run test:unit       # Verbose reporter
npm run test:watch      # Watch mode (development)
npm run test:coverage   # Coverage report → ./coverage/index.html
```

**Coverage:** 100% of pricing math in `src/lib/pricing.ts`:
- All 3 add-on models (`FIXED_MONTHLY`, `PER_SEAT`, `PERCENT_OF_PRODUCT`)
- All term length conversions (1, 12, 24 months with correct discounts)
- Global discount cascading on subtotal

### E2E Tests (Playwright)

Requires a running dev server and seeded database:

```bash
# Terminal 1: start the app
npm run dev

# Terminal 2: run E2E tests
npm run test:e2e            # Headless Chromium
npm run test:e2e:ui         # Playwright interactive UI
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3001 npm run test:e2e
```

**E2E coverage:** Full user path:
1. Create product with tier and feature
2. Configure feature matrix (set PAID_ADD_ON with PER_SEAT model)
3. Build 12-month quote with add-ons and global discount
4. Navigate to public `/quote/[id]` and verify computed values

---

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma          # Relational model (Product, Tier, Feature, Matrix, Quote)
│   └── seed.ts                # Sample data (tsx prisma/seed.ts)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout — JetBrains Mono, SEO metadata
│   │   ├── globals.css        # Design system — CSS tokens, component classes
│   │   ├── page.tsx           # Root → redirects to /admin
│   │   │
│   │   ├── admin/             # Admin Catalog Configurator (Task 1 & 2)
│   │   │   ├── layout.tsx     # Admin shell with sidebar
│   │   │   ├── page.tsx       # Dashboard + workflow guide
│   │   │   ├── products/      # Product/Tier/Feature CRUD UI
│   │   │   ├── matrix/        # Interactive Feature×Tier grid editor
│   │   │   └── quotes/        # 5-step Quote wizard + list
│   │   │
│   │   ├── quote/
│   │   │   └── [id]/page.tsx  # Public Quote View — server-rendered (Task 3)
│   │   │
│   │   └── api/               # REST API (Route Handlers)
│   │       ├── products/
│   │       ├── tiers/
│   │       ├── features/
│   │       ├── matrix/        # Upsert FeatureMatrix + AddOnPricing atomically
│   │       └── quotes/
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Singleton client (hot-reload safe)
│   │   └── pricing.ts         # Pure pricing engine — all math, zero side effects
│   │
│   ├── components/admin/
│   │   └── AdminSidebar.tsx
│   │
│   └── tests/
│       └── pricing.test.ts    # Vitest unit tests (Task 4)
│
├── e2e/
│   └── quote-flow.spec.ts     # Playwright E2E tests (Task 4)
│
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## Architecture & Design Decisions

### Pure-Function Pricing Engine

`src/lib/pricing.ts` is a **zero-dependency module** (no Prisma, no Next.js). All business math is implemented as pure functions. This enables:
- Fast unit tests with no mock setup
- Reuse in API routes, Server Components, and client-side preview simultaneously
- Easy extraction as an npm package or serverless function

### Server Components for Public Quote View

`/quote/[id]` is a **Next.js Server Component**. Prisma runs server-side; the client receives rendered HTML. Benefits:
- Zero JavaScript bundle sent to unauthenticated users
- Full SEO via `generateMetadata()`
- No additional API round-trips

### Decimal Handling

Prisma schema uses `@db.Decimal(10,2)` for prices and `@db.Decimal(5,2)` for discounts. JavaScript arithmetic operates on `number` (IEEE 754). For regulated financial calculations beyond 15 significant digits, integrate `decimal.js` or `big.js` in the pricing engine.

### Matrix Upsert Atomicity

`/api/matrix POST` atomically upserts `FeatureMatrix` and `AddOnPricing`. When availability changes away from `PAID_ADD_ON`, the orphaned `AddOnPricing` row is deleted. This keeps the data model consistent without separate clean-up jobs.

### Terminal UI Design Philosophy

No Tailwind utility classes in component markup — all design tokens are CSS custom properties in `globals.css`. This provides:
- A single source of truth for the design system
- Easy theme switching (swap one `:root` block)
- Monospace terminal aesthetic with JetBrains Mono via Google Fonts

### Next.js 15 API Conventions

All Route Handlers `await params` (async params API introduced in Next.js 15). Zod validates all request bodies. Errors return `{ error: string | ZodError[] }` with appropriate HTTP status codes.

---

## Business Logic Reference

| Term | Duration | Applied Discount |
|------|----------|-----------------|
| `MONTHLY` | 1 month | 0% |
| `ANNUAL` | 12 months | 15% off base product |
| `TWO_YEAR` | 24 months | 25% off base product |

### Formulas

**Base Product Cost:**
```
Core Seats × Base Price ($/seat/mo) × Duration Months × (1 − Term Discount)
```

**Add-On Costs (calculated for full contract duration):**

| Model | Formula |
|-------|---------|
| `FIXED_MONTHLY` | `Value × Duration Months` |
| `PER_SEAT` | `Selected Seats × Value × Duration Months` |
| `PERCENT_OF_PRODUCT` | `(Value / 100) × Base Product Cost` |

> **Important:** `PER_SEAT` add-on seats are **independent** of `coreSeats`. The user specifies separate seat allocation per add-on.

**Final TCV:**
```
Subtotal = Base Product Cost + Σ(All Add-On Costs)
Final TCV = Subtotal × (1 − Global Discount %)
```

---

## Deployment to Vercel

### Prerequisites

- A PostgreSQL database (Neon, Supabase, Railway, or Vercel Postgres)
- `DATABASE_URL` connection string

### Steps

```bash
# Install Vercel CLI
npm i -g vercel

# Link and deploy
vercel

# Set environment variable
vercel env add DATABASE_URL production

# Run migrations against production DB
DATABASE_URL="<prod-url>" npx prisma migrate deploy
```

### Build Configuration (Vercel)

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `prisma generate && next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Full PostgreSQL connection string | ✅ |

---

## Extension Points

### Multi-Currency Support
1. Add `currency` (ISO 4217 enum) to `Product` and `Quote` models
2. Create `src/lib/currency.ts` wrapping an exchange rate API
3. Extend `calculateQuote()` to accept `currencyCode` and convert before math
4. Update `formatCurrency()` with locale + currency arguments

### Quote Lifecycle / Approval Workflow
1. Add `status` enum (`DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | EXPIRED`) to `Quote`
2. Add `PATCH /api/quotes/[id]/status` endpoint
3. Add `QuoteComment` model for reviewer notes
4. Integrate Resend or SendGrid for email notifications on status change

### Usage-Based / Metered Billing
1. Add `METERED` to `PricingModel` enum with `unit` string field
2. Extend `AddOnPricing` with `minUnits` and JSON `tiers` for tiered pricing
3. Add `UsageEvent` model for recording actual consumption

### Multi-Tenant Authentication
1. Integrate Clerk or NextAuth.js
2. Add `organizationId` FK to `Product` and `Quote`
3. Add `createdBy` (userId) to `Quote`
4. Implement PostgreSQL Row-Level Security (RLS) policies

### Analytics Dashboard
1. Track quote conversion rates (approved / total issued)
2. Add `QuoteVersion` model for revision history and audit trail
3. Build ARR/TCV dashboard aggregating across active quotes

---

*Built with Next.js 15 · TypeScript · Prisma · PostgreSQL · Tailwind CSS · Vitest · Playwright*
