// VIPOR Service — DEV MOCK server (now with real auth).
// Zero-config: no database. Holds data in memory and mirrors the real endpoints.
// Auth is REAL (bcrypt password hashing + JWT) so the login flow is genuine —
// only the data store is in-memory. Production swaps the store for Prisma; the
// auth logic moves verbatim into ../auth.js.

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Stripe runs in MOCK mode unless STRIPE_SECRET_KEY is set — so this is runnable
// and testable with no account. Set the key + STRIPE_WEBHOOK_SECRET for real billing.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = STRIPE_KEY ? require('stripe')(STRIPE_KEY) : null;
const MOCK_BILLING = !stripe;

const app = express();

// CORS: open by default for local dev; lock to your app's origin(s) for a pilot
// with CORS_ORIGIN=https://your.app,https://other.app
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()) }));

// Webhook MUST see the raw body (signature verification) — register before json().
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Liveness/readiness probe for load balancers and uptime monitors (public).
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', billing: MOCK_BILLING ? 'mock' : 'stripe', tenants: Object.keys(db.tenants).length }));

// In production read this from an env var / secret store. Never commit a real one.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_TTL = '7d';
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production. Refusing to start with the dev secret.');
    process.exit(1);
  }
  console.warn('⚠  Using the insecure dev JWT secret — set JWT_SECRET before any real pilot.');
}

// ---- subscription tiers (illustrative pricing) ----------------------------
const TIERS = {
  starter: { name: 'Starter', price: 49, stripePriceId: 'price_starter', features: { tracking: false, payments: false, maxTechs: 1 } },
  pro:     { name: 'Pro',     price: 99, stripePriceId: 'price_pro',     features: { tracking: true,  payments: false, maxTechs: 3 } },
  fleet:   { name: 'Fleet',   price: 199, stripePriceId: 'price_fleet',  features: { tracking: true,  payments: true,  maxTechs: 999 } },
};

// ---- persistent store -----------------------------------------------------
// Pilot mode: data is held in memory for speed but mirrored to a JSON file, so a
// restart (deploy, crash, reboot) never loses a garage's accounts, quotes or
// jobs. Set DATA_FILE to control the path; SEED_DEMO=false starts empty (real
// garages onboard themselves via /api/onboard).
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'vipor-db.json');
const SEED_DEMO = process.env.SEED_DEMO !== 'false';

function buildSeed() {
  const seed = {
    tenants: {}, users: {}, requests: {}, quotes: {}, jobs: {},
    reqSeq: 2000, quoteSeq: 2000, jobSeq: 30, userSeq: 1,
  };
  if (!SEED_DEMO) return seed;

  // tenantId -> garage record (branding + subscription state)
  seed.tenants.vipor = {
    id: 'vipor', name: 'Vipor', status: 'active', tier: 'pro',
    stripeCustomerId: null, stripeSubscriptionId: null,
    branding: { name: 'Vipor', primaryColor: '#c8102e', logoUrl: null, locales: ['en', 'fr'] },
  };

  // Open service requests waiting in the technician's inbox.
  seed.requests.r_1041 = {
    id: 'r_1041', tenantId: 'vipor', status: 'open', customerName: 'J. Tremblay',
    vehicle: { year: 2019, make: 'Ford', model: 'F-150' },
    description: 'Grinding noise when braking', photoUrls: [], createdAt: 1718900000000,
  };
  seed.requests.r_1040 = {
    id: 'r_1040', tenantId: 'vipor', status: 'open', customerName: 'A. Tran',
    vehicle: { year: 2015, make: 'Honda', model: 'Civic' },
    description: 'Oil change + inspection', photoUrls: [], createdAt: 1718890000000,
  };

  // A quote already sent to the customer demo account (their app approves it).
  seed.quotes.q_1042 = {
    id: 'q_1042', tenantId: 'vipor', status: 'sent', markupPct: 30, total: 225.0,
    customerName: 'Jordan Customer',
    request: { vehicle: { year: 2018, make: 'Honda', model: 'Civic' }, description: 'Brakes + service' },
    lineItems: [
      { label: 'Brake pads & rotors', qty: 1, unitPrice: 150.0, kind: 'part' },
      { label: 'Oil & air filter', qty: 1, unitPrice: 43.0, kind: 'part' },
      { label: 'Labour', qty: 1.5, unitPrice: 80.0, kind: 'labour' },
    ],
  };

  // An active job so the technician dashboard isn't empty.
  seed.quotes.q_1900 = {
    id: 'q_1900', tenantId: 'vipor', status: 'approved', markupPct: 30, total: 156.0,
    customerName: 'M. Roy',
    request: { vehicle: { year: 2020, make: 'Toyota', model: 'RAV4' }, description: 'Diagnostic' },
    lineItems: [{ label: 'Diagnostic', qty: 1, unitPrice: 120.0, kind: 'labour' }],
  };
  seed.jobs.j_29 = { id: 'j_29', tenantId: 'vipor', quoteId: 'q_1900', status: 'in_progress', locations: [] };

  // two demo accounts so you can log in immediately
  const seedUser = (email, name, role, password) => {
    seed.users[email] = {
      id: `u_${seed.userSeq++}`, tenantId: 'vipor', email, name, role,
      passwordHash: bcrypt.hashSync(password, 10),
    };
  };
  seedUser('customer@demo.com', 'Jordan Customer', 'customer', 'password');
  seedUser('tech@demo.com', 'Marc Technician', 'technician', 'password');
  return seed;
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`Loaded persisted data from ${DATA_FILE}`);
      return data;
    }
  } catch (e) {
    console.error(`Could not read ${DATA_FILE} (${e.message}) — starting from seed`);
  }
  return buildSeed();
}

const db = loadDb();

// Debounced atomic save: write to a temp file then rename, so a crash mid-write
// can never corrupt the store. flushNow() forces a synchronous write on exit.
let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(flushNow, 250);
}
function flushNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error(`Persist failed: ${e.message}`);
  }
}
// Deploys send SIGTERM — flush the last writes before exiting.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { flushNow(); process.exit(0); });
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, tenantId: u.tenantId });
const signToken = (u) => jwt.sign({ sub: u.id, tenantId: u.tenantId, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });

// ===========================================================================
// AUTH (public)
// ===========================================================================
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password, role = 'customer' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'email, name and password are required' });
  if (db.users[email]) return res.status(409).json({ error: 'email already registered' });

  const user = {
    id: `u_${db.userSeq++}`, tenantId: 'vipor', email, name,
    role: role === 'technician' ? 'technician' : 'customer', // never let the client self-assign admin
    passwordHash: await bcrypt.hash(password, 10),
  };
  db.users[email] = user;
  persist();
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users[email];
  // same error whether the email is unknown or the password is wrong — don't leak which
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// PUBLIC — white-label onboarding. A new garage signs up: creates their tenant
// (inactive until paid), an admin user, and branding. Returns an admin token +
// a checkout URL to start the subscription.
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

app.post('/api/onboard', async (req, res) => {
  const { garageName, primaryColor = '#1b2434', email, ownerName, password, tier = 'starter' } = req.body;
  if (!garageName || !email || !password || !ownerName) {
    return res.status(400).json({ error: 'garageName, ownerName, email and password are required' });
  }
  if (!TIERS[tier]) return res.status(400).json({ error: 'unknown tier' });
  if (db.users[email]) return res.status(409).json({ error: 'email already registered' });
  const id = slugify(garageName);
  if (!id || db.tenants[id]) return res.status(409).json({ error: 'garage name unavailable' });

  db.tenants[id] = {
    id, name: garageName, status: 'incomplete', tier, // inactive until payment confirmed
    stripeCustomerId: null, stripeSubscriptionId: null,
    branding: { name: garageName, primaryColor, logoUrl: null, locales: ['en', 'fr'] },
  };
  const admin = {
    id: `u_${db.userSeq++}`, tenantId: id, email, name: ownerName, role: 'admin',
    passwordHash: await bcrypt.hash(password, 10),
  };
  db.users[email] = admin;
  persist();

  res.status(201).json({
    token: signToken(admin),
    tenant: { id, name: garageName, status: 'incomplete', tier },
    checkoutUrl: MOCK_BILLING ? `mock://checkout?tenant=${id}&tier=${tier}` : null,
  });
});

// ===========================================================================
// AUTH MIDDLEWARE — everything below requires a valid token
// ===========================================================================
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, tenantId: payload.tenantId, role: payload.role, email: payload.email };
    req.tenantId = payload.tenantId;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });

// Blocks business routes when the tenant's subscription isn't active. Status,
// branding and billing stay reachable so a paused garage can see the paywall and pay.
function subscriptionGate(req, res, next) {
  const p = req.path; // relative to the /api mount
  if (p === '/me' || p === '/tenant/status' || p === '/tenant/branding' || p.startsWith('/billing')) return next();
  const t = db.tenants[req.tenantId];
  if (!t) return res.status(404).json({ error: 'tenant not found' });
  if (!['active', 'trialing'].includes(t.status)) {
    return res.status(402).json({ error: 'subscription_inactive', status: t.status, tier: t.tier });
  }
  next();
}

app.use('/api', authRequired);
app.use('/api', subscriptionGate);

// who am I (handy for the app to restore session)
app.get('/api/me', (req, res) => res.json(req.user));

// tenant subscription status — reachable even when paused, so the app can paywall
app.get('/api/tenant/status', (req, res) => {
  const t = db.tenants[req.tenantId];
  if (!t) return res.status(404).json({ error: 'tenant not found' });
  res.json({ id: t.id, name: t.name, status: t.status, tier: t.tier });
});

// ---- billing --------------------------------------------------------------
app.get('/api/billing/tiers', (_req, res) =>
  res.json(Object.entries(TIERS).map(([id, t]) => ({ id, name: t.name, price: t.price, features: t.features }))));

// admin starts/changes a subscription -> Stripe Checkout URL
app.post('/api/billing/checkout', requireRole('admin'), async (req, res) => {
  if (!TIERS[req.body.tier]) return res.status(400).json({ error: 'unknown tier' });
  const tenant = db.tenants[req.tenantId];
  if (MOCK_BILLING) return res.json({ url: `mock://checkout?tenant=${tenant.id}&tier=${req.body.tier}`, mock: true });
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: TIERS[req.body.tier].stripePriceId, quantity: 1 }],
    success_url: `${req.body.returnUrl}?status=success`,
    cancel_url: `${req.body.returnUrl}?status=cancel`,
    client_reference_id: tenant.id,
    metadata: { tenantId: tenant.id, tier: req.body.tier },
  });
  res.json({ url: session.url });
});

// manage card / cancel via Stripe Billing Portal
app.post('/api/billing/portal', requireRole('admin'), async (req, res) => {
  const tenant = db.tenants[req.tenantId];
  if (MOCK_BILLING) return res.json({ url: `mock://portal?tenant=${tenant.id}`, mock: true });
  const portal = await stripe.billingPortal.sessions.create({ customer: tenant.stripeCustomerId, return_url: req.body.returnUrl });
  res.json({ url: portal.url });
});

const TRACKABLE = ['en_route', 'in_progress'];

// branding now resolves per-tenant; feature flags come from the paid tier
app.get('/api/tenant/branding', (req, res) => {
  const t = db.tenants[req.tenantId];
  if (!t) return res.status(404).json({ error: 'tenant not found' });
  res.json({ ...t.branding, features: (TIERS[t.tier] || TIERS.starter).features });
});

app.get('/api/quotes/:id', (req, res) => {
  const q = db.quotes[req.params.id];
  if (!q || q.tenantId !== req.tenantId) return res.status(404).json({ error: 'quote not found' });
  res.json(q);
});

// customers approve
app.post('/api/quotes/:id/approve', (req, res) => {
  const q = db.quotes[req.params.id];
  if (!q || q.tenantId !== req.tenantId) return res.status(404).json({ error: 'quote not found' });
  if (q.status !== 'sent') return res.status(409).json({ error: `quote is ${q.status}, cannot approve` });
  q.status = 'approved';
  const id = `j_${db.jobSeq++}`;
  db.jobs[id] = { id, tenantId: req.tenantId, quoteId: q.id, status: 'pending', locations: [] };
  persist();
  res.status(201).json(db.jobs[id]);
});

app.post('/api/quotes/:id/reject', (req, res) => {
  const q = db.quotes[req.params.id];
  if (!q || q.tenantId !== req.tenantId || q.status !== 'sent') return res.status(409).json({ error: 'quote not in a rejectable state' });
  q.status = 'rejected';
  persist();
  res.json({ ok: true });
});

// ---- technician / admin: inbox, quote building, jobs ----------------------
const fmtVehicle = (v) =>
  v && typeof v === 'object' ? `${v.year} ${v.make} ${v.model}`.trim() : (v || '—');

// customer submits a service request -> lands in the tech inbox
app.post('/api/requests', (req, res) => {
  const { vehicle = null, description, photoUrls = [] } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });
  const id = `r_${db.reqSeq++}`;
  db.requests[id] = {
    id, tenantId: req.tenantId, status: 'open',
    customerName: req.user.name || req.user.email, vehicle, description, photoUrls,
    createdAt: Date.now(),
  };
  persist();
  res.status(201).json(db.requests[id]);
});

// tech/admin inbox — open requests awaiting a quote
app.get('/api/requests', requireRole('technician', 'admin'), (req, res) => {
  const list = Object.values(db.requests)
    .filter((r) => r.tenantId === req.tenantId && r.status === 'open')
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// tech/admin builds & sends a quote for a request
app.post('/api/quotes', requireRole('technician', 'admin'), (req, res) => {
  const { requestId, lineItems, markupPct = 0 } = req.body;
  const r = db.requests[requestId];
  if (!r || r.tenantId !== req.tenantId) return res.status(404).json({ error: 'request not found' });
  if (r.status !== 'open') return res.status(409).json({ error: 'request already quoted' });
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'at least one line item is required' });
  }
  const subtotal = lineItems.reduce((s, li) => s + (Number(li.qty) || 1) * Number(li.unitPrice || 0), 0);
  const total = Math.round(subtotal * (1 + Number(markupPct) / 100) * 100) / 100;
  const id = `q_${db.quoteSeq++}`;
  db.quotes[id] = {
    id, tenantId: req.tenantId, status: 'sent', markupPct: Number(markupPct), total,
    customerName: r.customerName, requestId,
    request: { vehicle: r.vehicle, description: r.description },
    lineItems: lineItems.map((li) => ({
      label: li.label, qty: Number(li.qty) || 1, unitPrice: Number(li.unitPrice || 0),
      kind: li.kind === 'part' ? 'part' : 'labour',
    })),
  };
  r.status = 'quoted';
  persist();
  res.status(201).json(db.quotes[id]);
});

// tech/admin jobs list — flattened for the dashboard
app.get('/api/jobs', requireRole('technician', 'admin'), (req, res) => {
  const list = Object.values(db.jobs)
    .filter((j) => j.tenantId === req.tenantId)
    .map((j) => {
      const q = db.quotes[j.quoteId] || {};
      return {
        id: j.id, status: j.status, total: q.total ?? null,
        customerName: q.customerName || '—',
        vehicle: fmtVehicle(q.request?.vehicle),
        service: q.request?.description || '—',
      };
    });
  res.json(list);
});

// only techs/admins move jobs along
const TRANSITIONS = { pending: ['en_route', 'canceled'], en_route: ['in_progress', 'canceled'], in_progress: ['completed'] };
app.patch('/api/jobs/:id/status', requireRole('technician', 'admin'), (req, res) => {
  const job = db.jobs[req.params.id];
  if (!job || job.tenantId !== req.tenantId) return res.status(404).json({ error: 'job not found' });
  if (!TRANSITIONS[job.status]?.includes(req.body.status)) {
    return res.status(409).json({ error: `cannot go ${job.status} -> ${req.body.status}` });
  }
  job.status = req.body.status;
  persist();
  res.json(job);
});

// tech publishes GPS — only allowed while the job is trackable
app.post('/api/jobs/:id/location', requireRole('technician', 'admin'), (req, res) => {
  const job = db.jobs[req.params.id];
  if (!job || job.tenantId !== req.tenantId) return res.status(404).json({ error: 'job not found' });
  if (!TRACKABLE.includes(job.status)) return res.status(409).json({ error: 'tracking not active for this job' });
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat and lng required' });
  const loc = { lat, lng, recordedAt: Date.now() };
  job.locations.push(loc);
  persist();
  res.status(201).json(loc);
});

// customer reads latest location — gated behind active job status
app.get('/api/jobs/:id/location', (req, res) => {
  const job = db.jobs[req.params.id];
  if (!job || job.tenantId !== req.tenantId) return res.status(404).json({ error: 'job not found' });
  if (!TRACKABLE.includes(job.status)) return res.status(403).json({ error: 'tracking unavailable' });
  res.json(job.locations.at(-1) ?? null);
});

// ---- Stripe webhook -------------------------------------------------------
// Registered at the top (before json) so it gets the raw body for signature checks.
function findTenantByCustomer(customerId) {
  if (!customerId) return null;
  return Object.values(db.tenants).find((t) => t.stripeCustomerId === customerId)?.id || null;
}

function applySubscriptionEvent(type, obj) {
  const tenantId = obj?.metadata?.tenantId || findTenantByCustomer(obj?.customer);
  const t = tenantId && db.tenants[tenantId];
  if (!t) return;
  switch (type) {
    case 'checkout.session.completed':
      t.status = 'active';
      if (obj.metadata?.tier) t.tier = obj.metadata.tier;
      t.stripeCustomerId = obj.customer || t.stripeCustomerId;
      t.stripeSubscriptionId = obj.subscription || t.stripeSubscriptionId;
      break;
    case 'invoice.payment_failed':
      t.status = 'past_due';   // -> business routes start returning 402
      break;
    case 'customer.subscription.deleted':
      t.status = 'canceled';
      break;
  }
}

function handleStripeWebhook(req, res) {
  let event;
  if (MOCK_BILLING) {
    try { event = JSON.parse(req.body.toString('utf8')); } // dev: plain JSON, no signature
    catch { return res.status(400).send('bad json'); }
  } else {
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
    } catch (e) {
      return res.status(400).send(`Webhook signature failed: ${e.message}`);
    }
  }
  applySubscriptionEvent(event.type, event.data?.object || {});
  persist();
  res.json({ received: true });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`VIPOR API on http://localhost:${PORT}  (billing: ${MOCK_BILLING ? 'MOCK' : 'STRIPE'})`);
  console.log(`Persistence: ${DATA_FILE}  ·  seed demo: ${SEED_DEMO ? 'on' : 'off'}  ·  health: /health`);
  if (SEED_DEMO) console.log('Demo logins:  customer@demo.com / password   ·   tech@demo.com / password');
});
