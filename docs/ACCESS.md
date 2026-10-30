# Access rules

Every exported public Convex query, mutation and action calls an access helper (see `tests/convex/scan-helpers.ts`), except the functions in the list below. `tests/convex/access-scan.test.ts` reads this list from this file, so it cannot quietly grow in the test. Ported from Amayi Learn (`docs/ACCESS.md` at `ec3496e`).

5. Every exported public query, mutation and action calls an access helper. The list of exceptions is fixed and the test asserts exact membership: `auth:isAuthenticated`, `auth:signIn`, `auth:signOut`, `accounts/consent:requestInfo`, `accounts/consent:give`, `accounts/consent:withdraw`.

The three consent functions are the guardian's page, opened from the learner's link with no sign in. Each needs the link's secret token, checked against its SHA 256 hash, and shows only the learner's display name.

## Who can reach what

| Helper | Who | Used by |
| --- | --- | --- |
| `requireUser` | any signed in user | finishing sign up, reading their own account, deleting their account |
| `requireProfile` | a user who finished sign up | settings, study style, making a guardian link |
| `requireLearner` | an adult, or an under 18 whose guardian consented | every study feature (Phase 2 onward) |
| `requireLearnerInAction` | the same, from an action | asking Taku |
| `ownNotebook`, `ownSource`, `ownChat` | `requireLearner` plus: the notebook, source or chat belongs to this learner | every notebook, source and chat function |
| `requireAdmin` | the owner (`ADMIN_EMAILS`) | owner screens (Phase 7) |
