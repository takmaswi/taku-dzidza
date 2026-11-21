# Deploy

Production: site https://takudzidza.vercel.app (Vercel project `takudzidza`), backend Convex deployment `disciplined-condor-946` (eu-west-1). First deployed 29 October 2026.

## Every deploy

`pnpm deploy:prod --dry-run` first: it shows the Convex target and the schema and index changes, and the Vercel project, and changes nothing. Then `pnpm deploy:prod` (scripts/deploy-vercel.mjs). With no tokens set it uses the stored Convex and Vercel CLI logins on this machine. It: deploys the Convex functions with `CONVEX_DEPLOY_KEY`, builds the site against that deployment without test fixtures, and publishes `dist` to Vercel as a prebuilt output. The Vercel project is not linked to GitHub; deploys come from this command.

## Production Convex settings

Set once, and again only to change them. In this cloud environment the Convex CLI's `env` commands hang (their connection does not use the proxy), so values are set through the deployment's HTTP API, which does:

`POST https://<deployment>.convex.cloud/api/update_environment_variables` with `Authorization: Convex $CONVEX_DEPLOY_KEY` and body `{"changes":[{"name":"...","value":"..."}]}`.

Set on 29 October 2026: `AI_MODE=live`, `OPENROUTER_APP_NAME`, `ADMIN_EMAILS`, `SITE_URL` and `OPENROUTER_SITE_URL` (https://takudzidza.vercel.app), `OPENROUTER_API_KEY`, `AI_DAILY_USD_CAP=0.5`, `LEARNER_DAILY_AI_CALLS=60`, `JWT_PRIVATE_KEY` and `JWKS` (Convex Auth; changing them signs everyone out). On a normal machine `node scripts/setup-env.mjs --prod --mode live --site-url <url>` does the same, except the OpenRouter key and caps.

### Added by MVP hardening (5 November 2026): not set in production yet

| Setting | Where | Effect when unset |
|---|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Convex | Sign up works with no email check, and there is no password reset. `EMAIL_FROM` falls back to Resend's test sender, which only reaches the Resend account's owner, so set a verified domain's address. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Convex | No Google button. Redirect URL for the Google client: `<CONVEX_SITE_URL>/api/auth/callback/google`. |
| `LEARNER_DAILY_USD_CAP` | Convex | USD 0.05 per learner per day. Replaces `LEARNER_DAILY_AI_CALLS`, which nothing reads now and can be removed. |
| `AI_DAILY_USD_CAP` | Convex | USD 0.50 for the whole deployment. Raise it before learners arrive. |
| `MODEL_MAIN`, `MODEL_FAST` | Convex | The default chain. Each takes a comma separated list. |
| `VITE_SENTRY_DSN` | Vercel build | No error tracking. |
| An SMS provider | Code, then Convex | **New under 18s cannot finish guardian consent.** Implement `SmsSender` in `convex/accounts/sms.ts` and make `smsSender` and `smsReady` use it when its key is set. |

### Added by Stage 1 hardening (16 November 2026)

| Setting | Where | Effect when unset |
|---|---|---|
| `STORAGE_QUOTA_MB` | Convex | 500 MB of uploaded files per account. |
| `TEACHER_MODE` | Convex | `on` shows teachers, classes and guardians (Stage 2). Off by default. |
| `BOOKS_MODE` | Convex | `on` shows the licensed shelf (Stage 4). Off by default; stays off in production. |
| `EMBEDDINGS_MODE` | Convex | Off: keyword search only and no embedding calls. Set to `on` only after `ai/embeddings:liveCheck` passes. |
| `EMBED_MODEL`, `EMBED_PROVIDER` | Convex | `openai/text-embedding-3-small` on `azure` (DECISIONS.md, Stage 1). |

Run once after the first Stage 1 deploy: `npx convex run notebooks/uploads:backfill`, then `npx convex run ai/embeddings:backfill` (the second spends against the AI caps).

Security headers are written by `pnpm deploy:prod` from `scripts/lib/security-headers.mjs`, with the deployment's own Convex origin. Before a deploy, `pnpm build` then `pnpm csp-check` (local backend running) proves the app works under the policy.

Read spending with `npx convex run ai/usage:costPerTool` and `npx convex run ai/usage:alerts`, and feature counts with `npx convex run analytics:summary '{"day":"YYYY-MM-DD"}'`.

## Checks after a deploy

Serve `dist` with `npx vite preview` and run a browser through the proxy against production: sign up a throwaway account, add a note, ask one question, delete the account. Done on 29 October 2026: a cited answer came back and the account was deleted.

## Vercel deployment protection

The project has Vercel Authentication on for all vercel.app addresses ("all except custom domains"), so visitors must be signed in to Vercel. Turn it off in the Vercel project settings (Deployment Protection) or add a custom domain before learners use it.
