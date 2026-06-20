# VIPOR Service

A multi-tenant, white-label **on-demand auto-service platform**. Customers request
service and approve quotes; technicians build quotes and get dispatched with live
GPS tracking; garages sign up, brand the app, and pay monthly. One codebase →
**iOS and Android** (Expo / React Native).

---

## Features (all built)

| Area | What it does | Status |
|---|---|---|
| **Customer** | Register/login → submit request (+ photo) → review quote → approve/decline → live tracking | ✅ tested |
| **Technician / Admin** | Inbox of requests → build quote (line items + markup) → send → dispatch → advance job | ✅ tested |
| **Auth** | JWT, bcrypt-hashed passwords, role-based access (customer / technician / admin) | ✅ tested |
| **Live map** | Tech publishes GPS (`expo-location`); customer sees marker + route + ETA (`react-native-maps`); server-gated to active jobs | ✅ tested |
| **Multi-tenant** | Every row scoped by `tenantId`; one garage can never see another's data | ✅ tested |
| **White-label** | Per-garage branding (color + logo) from a config row — no code fork | ✅ tested |
| **Billing** | Stripe subscriptions (Starter/Pro/Fleet); webhook gates access on payment status | ✅ tested |

---

## Project layout

```
vipor/
├── backend/
│   ├── server.js        # DEV server: real auth + Stripe logic, in-memory store (run this)
│   ├── routes.js        # production Express routes (Prisma) — real target
│   ├── schema.prisma    # production DB schema (multi-tenant)
│   └── package.json
├── mobile/              # production Expo app (pinned to SDK 54)
│   ├── App.js           # auth gate + navigation + theme + safe-area
│   ├── app.json         # iOS/Android permissions + Google Maps key slot
│   └── src/
│       ├── api.js, auth.js, theme.js, useLocationPublisher.js
│       └── screens/  LoginScreen · QuoteApprovalScreen · LiveTrackingScreen
├── snack-App.js          # ┐ self-contained browser previews (snack.expo.dev)
├── snack-Tech-App.js     # │  customer · technician · tracking · onboarding/billing
├── snack-Tracking-App.js # │
├── snack-Onboard-App.js  # ┘
├── SETUP.md             # one-time local environment setup (Node 22, SDK 54)
└── README.md
```

---

## Quickest look: Snack (no install)

Go to **snack.expo.dev**, paste a `snack-*.js` file into `App.js`, see it run in the
browser. Four files = the four halves of the product. Best demo path: **DEMO.md**.

---

## Run the real stack (2 terminals)

> First time? Follow **SETUP.md** — needs **Node 22** (not newer) and the mobile app
> is pinned to **Expo SDK 54**. Skipping it is why local runs fail.

**Terminal A — backend** (zero-config; no DB or Stripe account needed):
```bash
cd vipor/backend
npm install
npm start            # VIPOR mock API on http://localhost:3001  (billing: MOCK)
```

**Terminal B — mobile app:**
```bash
cd vipor/mobile
npm install
npx expo start       # press w for web, or scan QR with iOS Expo Go (SDK 54)
```

### Demo logins (seeded)
| Role | Email | Password |
|---|---|---|
| Customer | `customer@demo.com` | `password` |
| Technician | `tech@demo.com` | `password` |

A garage **admin** account is created by signing up via the onboarding flow.

### On a physical phone
`localhost` = the phone itself. Point the app at your PC's LAN IP:
```bash
EXPO_PUBLIC_API_URL=http://YOUR.LAN.IP:3001/api npx expo start   # ipconfig → IPv4
```

---

## How the backend works (dev vs. production)

The dev `server.js` has **real** auth and **real** Stripe webhook logic — only the
data store is in-memory and Stripe runs in **MOCK mode** until you add keys.

- **Stripe:** set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → real checkout & webhooks.
- **Database:** wire `routes.js` to Postgres via `schema.prisma`
  (`DATABASE_URL`, `npx prisma migrate dev`). The API shapes match, so the app
  needs zero changes.

### Key endpoints
```
POST /api/auth/register · /api/auth/login        # public
POST /api/onboard                                # public — new garage signup (white-label)
GET  /api/me · /api/tenant/status · /api/tenant/branding
GET  /api/billing/tiers                          # plans
POST /api/billing/checkout · /api/billing/portal # admin → Stripe URLs
POST /webhook/stripe                             # Stripe events → flips tenant access
GET  /api/quotes/:id                             # customer
POST /api/quotes/:id/approve · /reject           # customer → approve creates the job
POST /api/quotes                                 # tech/admin → build a quote
PATCH /api/jobs/:id/status                       # tech/admin → dispatch lifecycle
POST /api/jobs/:id/location                      # tech → publish GPS (gated to active job)
GET  /api/jobs/:id/location                      # customer → read GPS (gated)
```
All `/api/*` routes require a valid token; business routes also require the tenant's
subscription to be **active** (else **402**).

---

## iOS / Android notes
- Location & camera permissions are pre-declared in `app.json` for both platforms.
- Android live maps need a free Google Maps API key — replace the placeholder in
  `app.json` (`android.config.googleMaps.apiKey`). iOS uses Apple Maps, no key.
- No Mac required to build iOS — use **EAS Build** (`npx eas build`).

## Running a pilot / beta
The backend now **persists to disk** (survives restarts), guards against unsafe
production config, exposes `/health`, and the app handles a lapsed-subscription
`402` with a clean "unavailable" screen — i.e. it's ready for a real beta on the
file-backed store, no database server required. See **PILOT.md** for the full
deploy guide (env vars, EAS build, backups, Stripe).

## What's left for full production scale
Only the data layer: swap the JSON store for Postgres via `schema.prisma` +
`routes.js` (`DATABASE_URL`, `npx prisma migrate dev`). The API shapes match, so
the app needs zero changes. Real Stripe keys + products are optional until you
charge. See **PILOT.md → "After the pilot"**.
