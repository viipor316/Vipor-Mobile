# Deploy the VIPOR backend on TrueNAS Scale

Run the API on TrueNAS so it's always-on and your existing Cloudflare tunnel can
reach it locally. The app then talks to `https://<your-hostname>` → tunnel →
backend on TrueNAS.

There are two ways: **A) SSH + Docker Compose** (simplest, recommended) or
**B) the TrueNAS Apps "Custom App"** UI.

---

## A. SSH + Docker Compose (recommended)

TrueNAS Scale (ElectricEel 24.10+) ships Docker. SSH into TrueNAS, then:

```bash
# 1. pick a dataset path to hold the app (adjust pool name)
cd /mnt/<your-pool>/apps          # e.g. /mnt/tank/apps
git clone https://github.com/viipor316/Vipor-Mobile.git vipor
cd vipor

# 2. set a real JWT secret (persists tokens across restarts)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 3. build + run
docker compose up -d --build

# 4. verify
curl localhost:3001/health        # {"status":"ok","billing":"mock",...}
```

Data persists in `/mnt/<your-pool>/apps/vipor/vipor-data/`. **Back that folder up.**

Update later:
```bash
cd /mnt/<your-pool>/apps/vipor && git pull && docker compose up -d --build
```

---

## B. TrueNAS Apps → Custom App

If you prefer the UI: **Apps → Discover Apps → Custom App** and set:

- **Image repository:** `vipor-api` (you must build/push it first — Compose in A is
  easier since it builds from source). Or point at a registry image if you push one.
- **Container Port:** `3001`  → **Node Port / published:** `3001`
- **Environment variables:**
  - `JWT_SECRET` = a long random string
  - `SEED_DEMO` = `true` (or `false` for a clean pilot)
  - `CORS_ORIGIN` = `*` (tighten later)
  - `DATA_FILE` = `/data/vipor-db.json`
- **Storage:** mount a host path (e.g. `/mnt/<pool>/apps/vipor-data`) → `/data`

> The Compose path (A) builds the image from the repo for you; the UI path expects
> a prebuilt image, so most people use A.

---

## Point the Cloudflare tunnel at it

In **Zero Trust → Networks → Tunnels → (your tunnel) → Public Hostname → Add**:

- **Subdomain:** `vipor-api` · **Domain:** your domain
- **Type:** `HTTP`
- **URL:**
  - `localhost:3001` if `cloudflared` runs on the TrueNAS host network, **or**
  - `<truenas-LAN-IP>:3001` if it runs in a separate container/app, **or**
  - `vipor-api:3001` if `cloudflared` shares the same Docker network as this app.

Result: `https://vipor-api.yourdomain.com` → your backend.

Test it: `curl https://vipor-api.yourdomain.com/health`

---

## Then point the app at it

Tell the app where the API lives by setting, at build/start time:

```
EXPO_PUBLIC_API_URL=https://vipor-api.yourdomain.com/api
```

- Expo Go / dev:  `EXPO_PUBLIC_API_URL=https://vipor-api.yourdomain.com/api npx expo start`
- EAS build: add it to the build profile's `env` in `eas.json`.

Once it's live, share the hostname and we'll wire the app + verify the round-trip.
