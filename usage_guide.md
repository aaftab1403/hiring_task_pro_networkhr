# PriceEngine — How to Use & Test

> ✅ App is **live** at `http://localhost:3000/admin`  
> ✅ Database migrated and seeded with sample data  
> ✅ 33 unit tests passing

---

## 🟢 Pre-flight Status

| Item | Status |
|------|--------|
| Dev server (`npm run dev`) | ✅ Running |
| DB migration | ✅ Done |
| Sample seed data | ✅ Loaded |
| Unit tests | ✅ 33/33 passing |

---

## Module 1 — Admin Catalog Configurator

### Step 1 · Visit the Dashboard

Open → **http://localhost:3000/admin**

You'll see the dashboard with:
- Sidebar: Dashboard / Products & Tiers / Feature Matrix / Quotes
- 3 quick-action cards
- 5-step workflow guide

---

### Step 2 · Explore Products & Tiers

Navigate → **http://localhost:3000/admin/products**

The seeded **"Acme Analytics Platform"** is pre-loaded with:

| Tier | Price |
|------|-------|
| Starter | $29.00 / seat / month |
| Growth | $59.00 / seat / month |
| Enterprise | $99.00 / seat / month |

**Features loaded:** API Access, SSO/SAML, Advanced Reports, Priority Support, Data Export

**To create your own product:**
1. Click **"+ New Product"** (top right)
2. Fill in product name + description → **Create Product**
3. With product selected → click **"+ Add Tier"**
   - Name: e.g. "Starter"
   - Base Price: e.g. `29` (USD per seat per month)
4. Click **"+ Add Feature"** for each capability to track

---

### Step 3 · Configure the Feature Matrix

Navigate → **http://localhost:3000/admin/matrix**

The grid shows **Tier (columns) × Feature (rows)**.

| Cell State | Meaning |
|-----------|---------|
| ✓ Included (green) | Feature included in tier base price |
| ✗ N/A (gray) | Feature not available in this tier |
| $ Add-On (amber) | Feature available as paid add-on |

**To toggle a cell:**
1. Click any cell in the grid
2. A modal opens — select the availability:
   - `Included` / `Not Available` / `Paid Add-On`
3. If you pick **Paid Add-On**, select the pricing model:
   - **Fixed Monthly** → `$200/mo × duration months`
   - **Per Seat** → `seats × $15/seat × duration months`
   - **% of Product** → `10% × base product cost`
4. Enter the value → Click **Save Cell**

> The seed configures Growth tier with SSO ($150/mo fixed) and Priority Support (10% of product)

---

## Module 2 — Quote Builder

Navigate → **http://localhost:3000/admin/quotes**

Click **"+ New Quote"** to open the 5-step wizard:

### Step 1 — Metadata
- **Customer Name** → e.g. `Acme Corp`
- **Proposal Name** → e.g. `Q3 Enterprise Proposal`

### Step 2 — Product Configuration
- Select **Product** (dropdown auto-populates)
- Select **Tier** (Growth, Starter, Enterprise)
- Enter **Core Seats** (e.g. `25`)

### Step 3 — Contract Term
| Option | Duration | Discount |
|--------|----------|---------|
| Monthly | 1 month | None |
| Annual (12 mo) | 12 months | **−15%** off base |
| 2-Year (24 mo) | 24 months | **−25%** off base |

### Step 4 — Add-Ons & Discount
- Checkboxes appear **only for PAID_ADD_ON features** of the selected tier
- For **Per Seat** add-ons: a separate seat input appears (independent of core seats)
- Optional: enter a **Global Discount %** (e.g. `5`)

### Step 5 — Review
- Shows full TCV breakdown with formulas before saving
- Click **✓ Save Quote**

After saving, the quote appears in the table with a **"View →"** button.

---

## Module 3 — Public Quote View

The seeded sample quote is ready at:

**http://localhost:3000/quote/seed-quote-001**

This is the **unauthenticated, shareable client-facing URL**. It shows:

```
Growth Plan — Base Product
  25 seats × $59.00/seat/mo × 12 months × (1 − 15% term discount)
  → $15,045.00

Add-On: SSO / SAML
  $150.00/mo × 12 months
  → $1,800.00

Add-On: Priority Support
  10% × $15,045.00 (Base Product Cost)
  → $1,504.50

Global Discount (5%)
  −5% × $18,349.50 subtotal
  → −$917.48

Total Contract Value (TCV): $17,432.02
```

---

## Running the Test Suites

### Unit Tests (no database needed)
```bash
# Run all 33 tests
npm run test

# Verbose output showing each test name
npm run test:unit

# Watch mode during development
npm run test:watch

# Coverage report → open coverage/index.html
npm run test:coverage
```

**Tests cover:**
- `TERM_CONFIG` — correct duration months and discounts for all 3 terms
- `calculateBaseProductCost` — MONTHLY / ANNUAL / TWO_YEAR formulas
- `calculateAddOnCost` — all 3 models: FIXED_MONTHLY, PER_SEAT, PERCENT_OF_PRODUCT
- PER_SEAT independence from core seats
- Global discount cascading on subtotal
- Multi-add-on scenarios
- Formula string content validation

### E2E Tests (requires running app + database)
```bash
# Terminal 1 (already running):
npm run dev

# Terminal 2:
npm run test:e2e

# Debug mode with browser visible:
npm run test:e2e:ui
```

**E2E covers the full user path:**
1. Create product → add tier → add feature
2. Configure matrix cell as Paid Add-On (PER_SEAT)
3. Build a 12-month quote with add-ons + global discount
4. Navigate to `/quote/[id]`
5. Assert formula strings and computed dollar amounts

---

## Quick Reference — URL Map

| URL | What it does |
|-----|-------------|
| `http://localhost:3000/admin` | Dashboard |
| `http://localhost:3000/admin/products` | Create/manage products, tiers, features |
| `http://localhost:3000/admin/matrix` | Feature × Tier matrix editor |
| `http://localhost:3000/admin/quotes` | Quote builder + list |
| `http://localhost:3000/quote/seed-quote-001` | Sample public quote view |
| `http://localhost:3000/quote/[any-quote-id]` | Any saved quote public view |

---

## Pricing Math Quick Reference

```
Base Product Cost =
  Core Seats × Base Price × Duration Months × (1 − Term Discount)

FIXED_MONTHLY add-on = Value × Duration Months
PER_SEAT add-on      = Add-On Seats × Value × Duration Months
PERCENT add-on       = (Value / 100) × Base Product Cost

Subtotal  = Base + Σ(All Add-Ons)
Final TCV = Subtotal × (1 − Global Discount %)
```

---

## Database Utilities

```bash
npm run db:studio     # Visual DB browser at localhost:5555
npm run db:migrate    # Apply schema changes
npm run db:seed       # Re-seed sample data
```
