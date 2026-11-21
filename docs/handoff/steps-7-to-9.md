# Takudzidza build brief: Steps 7, 8, 9 and FINISH (21 November 2026)

For Claude Code. Written so a cleared conversation can pick it up. Steps 1 to 6 and the packs fix (b4a82d5) are done and deployed (bundle index-8qcIsfxA.js, TEACHER_MODE=on in production).

Each step is one commit on main. After each step passes its checks: push to main, run `pnpm deploy:prod --dry-run`, then `pnpm deploy:prod`, so the live site always matches main. Do not stop between steps unless a stop rule applies. Tick each step off at the bottom of this file in the same commit.

## Standing rules

- No em dashes, en dashes or hyphens in user facing copy. Copy tests stay green.
- Mock AI only in tests, with fixtures for every new AI call (taku_chat and safety_check need fixtures per question).
- Before each commit: pnpm lint, pnpm typecheck, pnpm test, pnpm build, and e2e journeys for the new flows (stop any old Vite server on port 5199 first). 0 failed, 0 skipped.
- Record decisions in DECISIONS.md. Keep existing line endings. Leave docs/*.pdf untracked.
- Never invent facts, institutions, prices or syllabus content.
- Schema changes only add tables, indexes or optional fields.
- Stop and ask Takunda only if a production migration would delete or rewrite real user data, a deploy dry run shows more than additions, or a check fails for a reason outside this work.

## Step 7. Organisation admin page (behind TEACHER_MODE)

For admins of an organisation:
- Members by role (learner, teacher, admin, guardian), first names only for learners. Admins can remove a member or make a teacher an admin.
- Join codes and links: make, show as QR and WhatsApp text (reuse convex/classes/codes.ts), revoke.
- Course packs: draft or published, version, learner count. Never show which learners added a pack.
- Results by topic across the organisation's classes, using the existing counts and percentages, first names only.
- Phone and desktop layouts, all four looks, e2e journeys for each part.
- Also fix: on phones, a long worked equation in Taku's answer (for example the line starting (x+2)(x+3) = x² + 3x) runs past the right edge. Display maths must wrap or scroll inside the message, never widen the page. Add an e2e check at 360 px.

Commit: "feat: organisation admin page".

## Step 8. Choose which notebooks Taku answers from

In Ask Taku, a "Use my notebooks" chip beside the mode chips opens a searchable list of the learner's notebooks, including linked course packs and (after Step 9) bought or rented notebooks.
- Pick none (general knowledge, as now) or up to 5. With notebooks picked, Taku answers from them with citations, using the same search, safety checks and under 18 rules as notebook answers.
- The choice is remembered per chat and shown above the composer as removable chips.
- Fixtures and e2e journeys.

Commit: "feat: choose which notebooks Taku answers from".

## Step 9. Notes marketplace with demo payments (behind MARKETPLACE_MODE)

Who
- Anyone can browse and buy, under 18s included (their account already has guardian consent).
- Sellers must be 18 or older. They give their real name and a mobile money number for payouts, and tick: "This is my own work, or I have the right to sell it." Seller terms page in plain English.

Listings
- A listing is a notebook made into a pack (reuse course pack publishing, so notes are processed once and outputs saved).
- Fields: title, subject, level, exam (for example ACCA TX, ZIMSEC O Level Maths), description, up to 3 preview pages, price in USD, and buy, rent (7, 30 or 90 days, each priced) or both. Free listings allowed.
- Not allowed, stated on the form and in the terms: exam board past papers or marking schemes (ZIMSEC, Cambridge, ACCA or any other board) unless licensed. Practice papers must be the seller's own and are labelled on the listing and in the reader "Written by <author>, not an exam board paper".
- Flag for extra review any upload whose text names an exam board together with "mark scheme", "question paper", "past paper" or an exam session date.

Approval and reports
- Every new listing and new version waits in an owner approval queue (ADMIN_EMAILS) before anyone sees it.
- At approval, run the under 18 source screen and output check as for course packs. A listing that fails is shown to adults only, and the seller is told.
- Every listing has a "Report this" button (copyright, exam paper, wrong or harmful). A report hides the listing at once until the owner decides. Record reports and decisions.

Marketplace tab
- A Marketplace entry in the rail and the phone tab bar, only when MARKETPLACE_MODE allows it.
- Search by subject, exam and level; filters for price, buy or rent, rating. Sections: Popular, New, For your exam (matched to the learner's "studying for").
- Listing page: preview pages, seller name, sales count, ratings and short reviews (buyers only, one each), price options, Buy, Rent, Report.

Reader
- View only: no download, print or whole page copy. The buyer's name and email faint across every page.
- Offline reading keeps pages for the rental or purchase period only and drops them when access ends.

After buying or renting
- The notebook links into the buyer's notebooks like a course pack, marked "Bought" or "Rented until <date>".
- Taku answers from it and it appears in Step 8's picker. Access ends exactly when the rental ends, with a renew button.

Payments, demo only
- A payment provider interface with one provider, "demo". Checkout shows a clear "Demo payment, no real money" banner, offers EcoCash, OneMoney, InnBucks and card as demo choices, and succeeds or fails on a button.
- DECISIONS.md: the first real provider will be Paynow (EcoCash, OneMoney, InnBucks, Omari, ZimSwitch, Visa, Mastercard; official Node SDK "paynow" on npm). Stripe considered later for buyers outside Zimbabwe. No real provider code or keys.
- Commission: 20% to Takudzidza, 80% to the seller. Every sale or rental writes a ledger row: buyer, listing, amount, commission, seller share, provider, status. Refunds write a reversing row.

Money in Settings
- A "Money" section in Settings.
- Sellers: balance owed, pending (sales in the last 7 days, refundable), paid out to date, list of sales and rentals. A "Become a seller" button for adults who have not started.
- Everyone: purchases and rentals with expiry dates and receipts.
- Owner page: amounts owed per seller, "Mark as paid" (amount, date, reference), full ledger as CSV. No automatic payouts.

Refunds: the owner can refund within 7 days. Access ends on refund and the seller's pending balance drops.

Deletion
- A buyer's deletion removes their access and private work. Ledger rows stay, with the buyer shown as "deleted account".
- A seller's deletion hides their listings from new buyers. Current buyers keep access until their rental ends; bought copies stay. The seller's unpaid balance shows on the owner page.

e2e journeys: become a seller, list, approve, search, buy, read (watermark visible, no download), ask Taku from it, rent and expire, report and hide, refund, seller balance after a sale, owner marks paid.

Commit: "feat: notes marketplace with demo payments".

## Feature settings

TEACHER_MODE and MARKETPLACE_MODE each take off, admins or on. "admins" shows the feature only to accounts in ADMIN_EMAILS. Default off. Test all three values.

## FINISH

1. Full check on the final code in one run: pnpm lint, pnpm typecheck, pnpm test, pnpm build, full pnpm e2e. 0 failed, 0 skipped.
2. Push to main, dry run, deploy.
3. Set TEACHER_MODE=on and MARKETPLACE_MODE=on on the production Convex deployment so every tester sees everything.
4. Live check at 1280 by 800 and 360 by 780 with a throwaway account (deleted afterwards): admin page, a course pack, the notebook picker, the marketplace, a demo purchase, the reader watermark, Settings > Money, and that long equations stay inside the screen on phones. Report the live bundle name.
5. Short closeout PDF for Takunda in docs/closeouts/ covering Steps 1 to 9 and the packs fix: what changed, the checks, what was deployed, how to switch features off, and what is still open (real payments through Paynow, SMS for guardian codes, the POTRAZ licence, a lawyer's look at the seller terms). Plain English, no dashes.

## Progress

- [x] Step 7
- [x] Step 8
- [x] Step 9
- [x] FINISH
