# Hosting: Cloudflare Workers

This app moved from Vercel to Cloudflare Workers on 2026-11-26. Vercel is no longer used. Ignore Vercel instructions in older docs; `vercel.json` is kept only for reference.

- Worker: `taku-dzidza` on the takmaswi Cloudflare account
- Live URL: https://taku-dzidza.takmaswi.workers.dev
- Deploys: Workers Builds, connected to this repo. Every push to `main` builds and deploys.
  - Build command: `pnpm build`
  - Deploy command: `npx wrangler deploy`
- Config lives in this repo: `wrangler.jsonc`. Headers and redirects that used to be in `vercel.json` are in `public/_headers` and `public/_redirects`.
- Build variables are set in Cloudflare (Worker > Settings > Builds): `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`. The old `pnpm build:vercel` script ran `convex deploy`; the Cloudflare build does not.
- Convex production deployment: `disciplined-condor-946`. Its env var `SITE_URL` must equal the live URL above, or sign in fails. Change it whenever the domain changes.
- Convex functions are not deployed by the Cloudflare build. Push `convex/` changes with `npx convex deploy` yourself.
- The Content-Security-Policy in public/_headers pins a script hash. If the inline script in index.html changes, update the hash there.
