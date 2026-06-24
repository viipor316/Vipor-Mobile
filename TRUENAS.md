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

## B. TrueNAS Apps → Custom App (GHCR image) — UI, no SSH

The Custom App form needs a registry image, so a GitHub Action
(`.github/workflows/docker-publish.yml`) builds and publishes the backend to
**GHCR** on every push to `main`.

### One-time: make the image pullable
1. Push to `main` (or run the **Publish backend image** action manually under the
   repo's **Actions** tab). It pushes `ghcr.io/<owner>/vipor-backend:latest`.
2. GitHub → your profile → **Packages** → `vipor-backend` → **Package settings** →
   **Change visibility → Public**. (Or keep it private and add a GHCR pull
   credential in TrueNAS — public is simpler.)

### In TrueNAS: Apps → Discover Apps → Custom App
- **Application Name:** `vipor-api`
- **Image Configuration**
  - **Repository:** `ghcr.io/<your-github-username>/vipor-backend`  (lowercase)
  - **Tag:** `latest`
  - **Pull Policy:** *Always* (so redeploys pick up new pushes)
- **Container Configuration:** leave Hostname / Entrypoint / Args blank — the
  image already runs `node server.js`.
- **Container Environment Variables** → Add each:
  | Name | Value |
  |---|---|
  | `JWT_SECRET` | a long random string (e.g. from `openssl rand -hex 32`) |
  | `SEED_DEMO` | `true` (or `false` for a clean pilot) |
  | `CORS_ORIGIN` | `*` (tighten later) |
  | `DATA_FILE` | `/data/vipor-db.json` |
- **Network Configuration** → Add a port:
  - **Container Port:** `3001` · **Host (Node) Port:** `3001`
- **Storage Configuration** → Add:
  - **Type:** Host Path · **Host Path:** `/mnt/<pool>/apps/vipor-data` ·
    **Mount Path:** `/data`
- **Install.**

Verify (TrueNAS shell or any LAN box): `curl http://<truenas-ip>:3001/health`

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
