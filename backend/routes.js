// VIPOR Service — core API routes (Express + Prisma)
// Flow: client requests service (+ optional photo) → you create a quote →
// client approves → job is created and live tracking unlocks.

const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// ---------------------------------------------------------------------------
// Tenant scoping. Assumes auth middleware has already set req.user = { id, tenantId, role }.
// Every query below is filtered by req.tenantId so data never crosses garages.
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  if (!req.user?.tenantId) return res.status(401).json({ error: 'unauthenticated' });
  req.tenantId = req.user.tenantId;
  next();
});

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });

// ---------------------------------------------------------------------------
// 1. CLIENT: submit a service request (+ optional photos)
//    photoUrls are produced by a separate upload endpoint (S3/Azure Blob) and
//    passed in here — keeps this route simple.
// ---------------------------------------------------------------------------
router.post('/service-requests', async (req, res) => {
  const { vehicleId, description, photoUrls = [] } = req.body;
  if (!vehicleId || !description) {
    return res.status(400).json({ error: 'vehicleId and description are required' });
  }

  // Confirm the vehicle belongs to this tenant before attaching to it.
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, tenantId: req.tenantId },
  });
  if (!vehicle) return res.status(404).json({ error: 'vehicle not found' });

  const request = await prisma.serviceRequest.create({
    data: { tenantId: req.tenantId, vehicleId, description, photoUrls },
  });
  res.status(201).json(request);
});

// ---------------------------------------------------------------------------
// 2. YOU (tech/admin): create a quote for a request, then send it.
//    lineItems: [{ label, qty, unitPrice, kind: 'part'|'labour' }]
// ---------------------------------------------------------------------------
router.post('/quotes', requireRole('technician', 'admin'), async (req, res) => {
  const { requestId, lineItems, markupPct = 0 } = req.body;
  if (!requestId || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'requestId and lineItems are required' });
  }

  const request = await prisma.serviceRequest.findFirst({
    where: { id: requestId, tenantId: req.tenantId },
  });
  if (!request) return res.status(404).json({ error: 'request not found' });

  const subtotal = lineItems.reduce((s, li) => s + Number(li.qty) * Number(li.unitPrice), 0);
  const total = subtotal * (1 + Number(markupPct) / 100);

  const quote = await prisma.quote.create({
    data: {
      tenantId: req.tenantId,
      requestId,
      lineItems,
      markupPct: new Prisma.Decimal(markupPct),
      total: new Prisma.Decimal(total.toFixed(2)),
      status: 'sent',
      sentAt: new Date(),
    },
  });

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: 'quoted' },
  });

  // TODO: notify customer (email/SMS link + push)
  res.status(201).json(quote);
});

// ---------------------------------------------------------------------------
// 3. CLIENT: approve a quote.  THE PIVOT.
//    One transaction flips the quote to approved AND creates the job, so we can
//    never end up approved-with-no-job (or vice versa).
// ---------------------------------------------------------------------------
router.post('/quotes/:id/approve', async (req, res) => {
  try {
    const job = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
      });
      if (!quote) throw new HttpError(404, 'quote not found');
      if (quote.status !== 'sent') throw new HttpError(409, `quote is ${quote.status}, cannot approve`);

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'approved', decidedAt: new Date() },
      });

      return tx.job.create({
        data: { tenantId: req.tenantId, quoteId: quote.id, status: 'pending' },
      });
    });

    // TODO: notify tech/admin that a job is ready to dispatch
    res.status(201).json(job);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.code).json({ error: err.message });
    throw err;
  }
});

router.post('/quotes/:id/reject', async (req, res) => {
  const result = await prisma.quote.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId, status: 'sent' },
    data: { status: 'rejected', decidedAt: new Date() },
  });
  if (result.count === 0) return res.status(409).json({ error: 'quote not in a rejectable state' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// 4. TECH: update job status (dispatch / arrive / finish)
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS = {
  pending: ['en_route', 'canceled'],
  en_route: ['in_progress', 'canceled'],
  in_progress: ['completed'],
};

router.patch('/jobs/:id/status', requireRole('technician', 'admin'), async (req, res) => {
  const { status } = req.body;
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!job) return res.status(404).json({ error: 'job not found' });

  if (!VALID_TRANSITIONS[job.status]?.includes(status)) {
    return res.status(409).json({ error: `cannot go ${job.status} → ${status}` });
  }
  const updated = await prisma.job.update({ where: { id: job.id }, data: { status } });
  res.json(updated);
});

// ---------------------------------------------------------------------------
// 5. LIVE TRACKING — gated behind active job status (server-side, non-negotiable)
// ---------------------------------------------------------------------------
const TRACKABLE = ['en_route', 'in_progress'];

// Tech pushes GPS. (Socket.io broadcast omitted for brevity — emit after write.)
router.post('/jobs/:id/location', requireRole('technician'), async (req, res) => {
  const { lat, lng } = req.body;
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!job) return res.status(404).json({ error: 'job not found' });
  if (!TRACKABLE.includes(job.status)) {
    return res.status(409).json({ error: 'tracking not active for this job' });
  }
  const loc = await prisma.jobLocation.create({
    data: { tenantId: req.tenantId, jobId: job.id, lat, lng },
  });
  res.status(201).json(loc);
});

// Customer reads latest location — ONLY when the job is trackable.
router.get('/jobs/:id/location', async (req, res) => {
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!job) return res.status(404).json({ error: 'job not found' });
  if (!TRACKABLE.includes(job.status)) {
    return res.status(403).json({ error: 'tracking unavailable' }); // gate before approval/active
  }
  const loc = await prisma.jobLocation.findFirst({
    where: { jobId: job.id },
    orderBy: { recordedAt: 'desc' },
  });
  res.json(loc ?? null);
});

class HttpError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

module.exports = router;
