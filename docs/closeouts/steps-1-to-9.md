# Closeout: Steps 1 to 9 and the packs fix

Date: 22 November 2026. For Takunda. The full reasoning for each change is in DECISIONS.md under the heading of the same name.

## What changed

Steps 1 to 6 (21 November)

- Step 1. The Stage 2 teacher foundation (e947872) and the four looks, folding chats panel and charts in Taku's replies (72dcf63) were pushed.
- Step 2. The "I teach" switch now holds a tap until the server agrees, so it no longer looks ignored on a slow line (1352314). The tests were fixed at the cause, not weakened.
- Step 3. Study modes and Taku's voice replace the three study styles (4f9f128). Voice is Gentle, Direct or Upbeat. Modes are Learn, Test me, Sprint and Exam prep. Onboarding asks one optional question about what gets in the way. Every production profile now has a voice (0 left to move).
- Step 4. Schools became organisations of any type, with members, codes, following and an owner page for pending entries (2db810e). The list starts empty: no institution was added by us.
- Step 5. "Where do you study?" in onboarding, and "Set up my school or institution" in Settings for adults (685effa).
- Step 6. Course packs: a teacher publishes a notebook once and learners add it as their own linked notebook (e58b9e8).
- Packs fix. A pack belongs to its organisation, not the teacher, and every pack source and tool passes the under 18 checks before it publishes (b4a82d5).

Steps 7 to 9 (21 and 22 November)

- Step 7. The organisation admin page: members by role, join codes as link, QR code and WhatsApp text, course packs with learner counts (never names), and results by topic across classes. Long worked equations in Taku's answers now scroll inside the message on phones instead of widening the page (3e4d633).
- Step 8. In Ask Taku, "Use my notebooks" lets a learner pick up to 5 notebooks, including course packs and bought notes. Taku then answers from them with citations, under the same safety rules as a notebook answer. The choice stays with the chat (2b94ddd).
- Step 9. The notes marketplace with demo payments (b6a80eb). Adults become sellers and list a notebook. Every listing waits for the owner's approval, where the under 18 checks run. Buyers search, pay through a demo provider and get a linked notebook marked Bought or Rented until a date. The reader is view only, with the buyer's name and email across every page. There is a ledger with 20% commission, refunds within 7 days, payouts marked by hand, and a Money section in Settings. TEACHER_MODE and MARKETPLACE_MODE now each take off, admins or on.

## The checks

On the final code, in one run on 22 November:

- Lint: no errors. Typecheck: clean. Unit tests: 448 passed. Build: passed.
- Full end to end suite: 100 journeys on phone (360 by 780) and desktop (1280 by 800). 100 passed, 0 failed, 0 skipped.
- All tests use the mock AI, with recorded answers for every AI call.

Live check on production, 22 November, with a throwaway adult account at 1280 by 800 and 360 by 780. The account was deleted afterwards and could no longer sign in.

- Passed: sign up, a notebook with pasted notes, setting up a school, the admin page at both sizes, publishing a course pack, the notebook picker at both sizes, the Marketplace tab in the rail and the phone tab bar, the seller sign up form and terms, Settings > Money at both sizes, and a long worked equation from a live answer on a phone. That line was 408 pixels wide and scrolled inside its 295 pixel box; the page itself never scrolled sideways.
- A normal account (not on the owner list) saw the admin page for its school, the marketplace and Settings > Money.
- Not checked live: a demo purchase and the reader watermark. Production has no email provider, so no account has a verified email, and approving a listing needs an owner with one. With nothing approved there is nothing to buy. Both are covered by the end to end journeys, which buy, read with the watermark, rent, expire, refund and pay out.
- The home internet connection dropped in and out during the check. One reload of the admin page after publishing hung on Loading; the publish itself had already shown "Published. Version 1".

## What was deployed

- Convex production deployment `disciplined-condor-946`. Every dry run showed additions only: new tables, indexes and optional fields. No data was rewritten or deleted.
- Vercel: https://takudzidza.vercel.app now serves `index-Ce8np5gk.js` (from b6a80eb). Earlier in this run: Step 6 and the packs fix `index-8qcIsfxA.js`, Step 7 `index-CF2N0kTN.js`, Step 8 `index-D-N_8c5H.js`.
- Production settings: TEACHER_MODE on (21 November) and MARKETPLACE_MODE on (22 November), so every tester sees everything.

## How to switch features off

Run from the project folder, with your Convex login:

```
$env:CONVEX_DEPLOYMENT = "prod:disciplined-condor-946"
pnpm exec convex env set MARKETPLACE_MODE off --prod
pnpm exec convex env set TEACHER_MODE off --prod
```

- Each takes `off`, `admins` or `on`. `admins` shows the feature only to accounts on ADMIN_EMAILS with a verified email, which today means nobody on production (see below).
- Off hides the pages and refuses the functions behind the flag at once, with no deploy. Notebooks people already bought still open, because reading goes through the notebook.

## Still open

- Real payments. Paynow is the first real provider (EcoCash, OneMoney, InnBucks, Omari, ZimSwitch, Visa and Mastercard, through its official Node SDK). Nothing real is wired yet; checkout says "Demo payment, no real money".
- SMS for guardian codes. Guardian phone codes still need a real SMS sender.
- The POTRAZ licence, before taking real payments or sending SMS at scale.
- A lawyer's look at the seller terms at `/market/terms`, which are marked as a draft.
- Email on production. Without an email provider no address is verified, so the owner pages (approving listings, marking payouts, listing organisations) reach nobody there. Adding the email key, or another way for the owner to sign in, is needed before the first listing can go live.
- The narrow step of the voice migration: clearing the old study style field. Every profile has a voice now, so it can go when you say so; it deletes the old value.
