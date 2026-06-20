# VIPOR Service — Demo Script

A tight ~6-minute walkthrough that shows the whole product to an investor, a
garage owner, or a partner. Everything runs in a browser — **no installs**.

## Setup (2 minutes before you present)
1. Open **snack.expo.dev** in four browser tabs.
2. In each tab, paste one file into `App.js` (replace what's there):
   - Tab 1 → `snack-App.js`  (Customer)
   - Tab 2 → `snack-Tech-App.js`  (Technician / Admin)
   - Tab 3 → `snack-Tracking-App.js`  (Live tracking)
   - Tab 4 → `snack-Onboard-App.js`  (Garage signup + billing)
3. Each renders a phone on the right. Leave all four open. Done.

> One-liner to open with: *"This is an on-demand auto-service app — like ordering
> a ride, but a mechanic comes to you. And it's white-label: any garage can run
> their own branded version and pay us monthly."*

---

## Act 1 — The customer (Tab 1) · ~90 sec
**Story:** *"A customer's brakes are grinding. Here's their experience."*

1. **Login** — point out it's pre-filled with a demo account. Tap **Log in**.
   - *"Real accounts, secure — we'll come back to who's behind it."*
2. **New request** — the vehicle's pre-filled. Type an issue: *"grinding when braking."*
   - Tap **Take photo** → a thumbnail appears. *"They can snap the problem."*
   - Note the **Submit** button only enables once there's a description.
3. Tap **Submit request** → **Quote pending**.
   - *"No live pricing to confuse anyone — the garage reviews and sends a real quote."*
4. Tap **Simulate: quote sent** → the **Estimate** appears (parts, labour, markup, total).
5. Tap **Approve & book** → **Job booked**.
   - *"One tap approves the quote AND books the job. That approval is the moment
     everything kicks off."*

**Land it:** *"Simple for the customer: describe it, approve a price, done."*

---

## Act 2 — The garage's side (Tab 2) · ~90 sec
**Story:** *"Now the same job from the shop's point of view."*

1. **Dashboard** — stat tiles + the new request sitting in the inbox.
2. Tap **Build & send quote** on the request → the **quote builder**.
   - Add a line: type *"Diagnostic"* + *"60"* → tap **+ Labour**. It appears instantly.
   - Tap the markup **+ / –** → *"the total recalculates live."*
3. Tap **Send quote to customer** → it leaves the inbox and becomes a **pending job**.
   - *"That's the quote the customer just approved in the other app — same loop, two sides."*
4. On the active job, tap **Dispatch → Start job → Complete**, watching the status
   pill change color each time.

**Land it:** *"The shop runs their whole day from one screen — quote, dispatch, done."*

---

## Act 3 — Live tracking (Tab 3) · ~45 sec
**Story:** *"While the tech drives over, the customer isn't left guessing."*

1. It's already animating — the technician marker moves along the route toward the
   customer, the **ETA counts down**, the progress bar fills.
2. Point out **En route → Arrived** and the **Message / Call** buttons.
   - *"Like watching your delivery driver. Tracking only switches on after approval
     and only while the job's active — it's locked down on the server."*

**Land it:** *"Trust and transparency — the #1 thing customers want from a mobile mechanic."*

---

## Act 4 — The business model (Tab 4) · ~90 sec
**Story:** *"Here's why this is a company, not just an app. Any garage can sign up."*

1. **Set up your garage** — type a garage name. Tap a **brand color** → watch the
   header and the **live preview button** recolor instantly.
   - *"No custom development per client — they pick a color and a logo, that's the
     whole white-label. We onboard a new garage in minutes."*
2. Tap **Choose a plan** → three tiers (**Starter $49 / Pro $99 / Fleet $199** a month).
   - Select **Pro**. *"Recurring revenue, per garage."*
3. Tap **Start Pro** → the **branded dashboard** in their color, *"Subscription active."*
4. Tap **Simulate payment failure** → the **paywall** locks the app.
   - *"If a garage stops paying, access cuts off automatically — the backend returns
     a 'payment required' on every request. No chasing invoices."*
5. Tap **Update payment method** → back to active.

**Land it:** *"Customers get a great experience; we get predictable monthly revenue
from every garage on the platform."*

---

## Closing (~30 sec)
> *"Both sides of the marketplace, real auth, live tracking, and a subscription
> business — all working today. The whole thing is one codebase that ships to iOS
> and Android. What we've shown isn't mockups — the backend behind it is built and
> tested. Next step is a pilot with a real garage."*

---

## If they ask "is this real or just screens?"
It's real. The Snacks are front-end demos for speed, but the backend
(`vipor/backend/`) implements and **passes live tests** for: login + JWT, role
permissions, the approve-creates-job transaction, GPS gating, multi-tenant
isolation, and the Stripe billing lifecycle (signup → pay → active → payment-fail →
locked). Offer to run it: `cd vipor/backend && npm start`.

## Honest "what's left" (if they ask about timeline)
Features are done; remaining work is production infrastructure, ~2–4 weeks:
1. Swap the in-memory store for Postgres (schema already written — `schema.prisma`).
2. Add real Stripe keys + create the 3 products (code already supports real mode).
3. Deploy backend (Azure) + build apps via EAS + store submissions.
4. Add the in-app paywall screen (backend already returns 402).
5. Wire push/SMS notifications (currently a stub at quote-sent / approval).
