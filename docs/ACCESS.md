# Access rules

Every exported public Convex query, mutation and action calls an access helper (see `tests/convex/scan-helpers.ts`), except the functions in the list below. `tests/convex/access-scan.test.ts` reads this list from this file, so it cannot quietly grow in the test. Ported from Amayi Learn (`docs/ACCESS.md` at `ec3496e`).

5. Every exported public query, mutation and action calls an access helper. The list of exceptions is fixed and the test asserts exact membership: `auth:isAuthenticated`, `auth:signIn`, `auth:signOut`, `accounts/authOptions:available`, `accounts/consent:requestInfo`, `accounts/consent:sendCode`, `accounts/consent:give`, `accounts/consent:withdraw`, `accounts/consent:requestDeletion`, `accounts/consent:sendApprovalCode`, `accounts/consent:decideClass`, `flags:get`.

The five consent functions are the guardian's page, opened from the learner's link with no sign in. Each needs the link's secret token, checked against its SHA 256 hash, and shows only the learner's display name. `accounts/consent:sendCode` also limits how many messages go out per learner and per phone. `accounts/consent:requestDeletion` deletes the learner's account and works only on a link where a guardian has given consent (with the phone code), so the learner's copy of the link alone cannot delete anything a guardian did not first approve. `accounts/authOptions:available` says only which sign in options are switched on. `accounts/consent:sendApprovalCode` and `accounts/consent:decideClass` (Stage 2) let a guardian answer a class request from the link; the learner holds the link too, so the decision needs a fresh code sent to the phone the guardian verified when giving consent, and works only while that consent stands. `flags:get` says only which new surfaces are switched on (TEACHER_MODE, BOOKS_MODE); every function behind a flag checks it again.

## Who can reach what

| Helper | Who | Used by |
| --- | --- | --- |
| `requireUser` | any signed in user | finishing sign up, reading their own account, deleting their account |
| `requireProfile` | a user who finished sign up | settings, study style, making a guardian link |
| `requireLearner` | an adult, or an under 18 whose guardian consented | every study feature (Phase 2 onward) |
| `requireLearnerInAction` | the same, from an action | asking Taku |
| `ownNotebook`, `ownSource`, `ownChat` | `requireLearner` plus: the notebook, source or chat belongs to this learner, and is not being deleted | every notebook, source and chat function |
| `requireAdmin` | the owner: an address on `ADMIN_EMAILS` that has been verified | owner screens (Phase 7), listing, checking and merging organisations people added |
| `requireTeacher` | TEACHER_MODE on, an adult with the teacher role switched on | creating classes, marking photographed scripts, marking a source as a published book |
| `ownClass` | `requireTeacher` plus: the class is theirs | everything on a class page: roster, names, shares, papers, marks, results |
| `requireTeacherInAction` | `ownClass` from an action | marking a photographed script |
| `requireGuardian` | TEACHER_MODE on, an adult | adding a child, the family page, answering class requests (only for a child whose standing consent this account gave) |
| `requireClassMember` | TEACHER_MODE on, `requireLearner`, approved in the class | shared material, the papers set, handing in, marking written answers, leaving |
| `requireJoiningLearner` | TEACHER_MODE on, `requireLearner` | joining by code, the learner's class list, cancelling a request |
| `requireOrgsProfile` | TEACHER_MODE on, `requireLearner` | searching organisations (listed and checked only), following, adding a missing one, the one code box, an organisation's public page |
| `requireOrgMember` | `requireOrgsProfile` plus: a member of the organisation in one of the given roles; a staff or guardian role only counts for an adult | leaving an organisation |
| `requireOrgAdmin` | `requireOrgMember` as an admin | join codes (make, revoke, new learner code) |

Teachers see a learner's first name only (the first word of their display name), never an email, birth date or anything they study on their own. Results by topic are counts and percentages with no names.
