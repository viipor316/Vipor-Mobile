# VIPOR — Pilot / Beta Deployment

How to run VIPOR for a **real beta**: one (or a few) garages and their customers
using it for actual jobs. This is the step between the in-browser demo and full
production scale.

What pilot mode gives you over the demo:

- **Durable data** — accounts, quotes and jobs are persisted to a JSON file and
  survive restarts, crashes and deploys. (Demo mode kept everything in memory.)
- **Deploy safety** — the server refuses to boot in production with the insecure
  dev JWT secret, CORS can be locked to your app's origin, and `/health` exists
  for uptime monitors and load balancers.
- **Clean paywall** — when a garage's subscription lapses, the customer app shows
  a "temporarily unavailable" screen instead of a raw error.

> This still uses the file-backed store, not Postgres. That's deliberate: it's
> plenty for a single-garage / low-volume pilot and needs zero database server.
> When the pilot proves out, swap to Postgres via `schema.prisma` + `routes.js`
> (the API shapes already match, so the app needs no changes).

---

## 1. Backend

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | **yes (prod)** | Signs auth tokens. Must be a long random string. Server exits if unset when `NODE_ENV=production`. |
| `NODE_ENV` | recommended | Set to `production` to enforce the JWT-secret guard. |
| `DATA_FILE` | no | Path to the persisted store. Default `./data/vipor-db.json`. Put it on a **persistent volume**, not ephemeral container disk. |
| `SEED_DEMO` | no | `false` to start empty (real garages onboard via `/api/onboard`). Default `true` (demo accounts + sample quote). |
| `PORT` | no | Default `3001`. |
| `CORS_ORIGIN` | no | Comma-separated allowed origins, e.g. `https://app.vipor.com`. Default `*`. |
| `STRIPE_SECRET_KEY` | for real billing | Switches billing from MOCK to live Stripe. |
| `STRIPE_WEBHOOK_SECRET` | for real billing | Verifies Stripe webhook signatures. |

### Run it

```bash
cd vipor/backend
npm install --omit=dev
JWT_SECRET="$(openssl rand -hex 32)" \
NODE_ENV=production \
SEED_DEMO=false \
DATA_FILE=/var/lib/vipor/db.json \
npm start
```

The startup log confirms the persistence path, seed mode, and billing mode.

### Generate a secret

```bash
openssl rand -hex 32        # use as JWT_SECRET
```

### Health check

```bash
curl https://api.your-host.com/health
# {"status":"ok","billing":"mock","tenants":3}
```

### Keep it alive

Use a process manager or container restart policy so it comes back after a reboot.
Graceful shutdown (SIGTERM, which deploys send) flushes the last writes before exit.

- **systemd / Docker** — set `Restart=always` / `restart: unless-stopped`.
- **PM2** — `pm2 start server.js --name vipor-api`.

**Back up `DATA_FILE`.** It is the entire pilot's data. A nightly copy is enough.

---

## 2. Mobile app

Point the app at the deployed backend and rebuild:

```bash
cd vipor/mobile
EXPO_PUBLIC_API_URL=https://api.your-host.com/api npx expo start   # for OTA/dev
# or bake it into an EAS build profile for store/TestFlight betas
```

Distribute the beta build via **TestFlight** (iOS) and **Google Play internal
testing** (Android) using EAS Build — no Mac required:

```bash
npx eas build --platform all --profile preview
```

Android live maps need a Google Maps API key in `app.json`
(`android.config.googleMaps.apiKey`); iOS uses Apple Maps, no key.

---

## 3. Billing (optional for first pilot)

A first pilot can run in **MOCK billing** (no Stripe account) — onboarding and the
paywall still work end to end. To take real money:

1. Create the 3 products/prices in Stripe (Starter / Pro / Fleet) and put the
   price IDs in `TIERS` in `server.js`.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
3. Point a Stripe webhook at `https://api.your-host.com/webhook/stripe`
   (events: `checkout.session.completed`, `invoice.payment_failed`,
   `customer.subscription.deleted`).

---

## Pilot checklist

- [ ] Backend deployed with `JWT_SECRET` set and `NODE_ENV=production`
- [ ] `DATA_FILE` on a persistent volume + nightly backup
- [ ] `SEED_DEMO=false` (or keep demo data if you want a fallback login)
- [ ] `CORS_ORIGIN` locked to the app's origin
- [ ] `/health` wired to an uptime monitor
- [ ] App built (EAS) pointing at the deployed API, distributed via TestFlight / Play internal testing
- [ ] Onboard the pilot garage via the in-app signup
- [ ] (If charging) Stripe live keys + products + webhook

## After the pilot: scaling to production

The only remaining swap is the data layer — move from the JSON store to Postgres:

1. `schema.prisma` is written; run `npx prisma migrate dev` against your DB.
2. Wire `routes.js` (Prisma) in place of the in-memory handlers in `server.js`
   (auth/onboard/billing logic moves over too — `routes.js` currently covers the
   request → quote → job flow).
3. Set `DATABASE_URL`. The API responses are unchanged, so the app needs no edits.
