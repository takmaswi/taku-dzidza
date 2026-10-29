// Tests and e2e never use the production deploy key. It may sit in this
// environment for deploys (scripts/build-vercel.mjs), so scripts that start
// Convex for development strip it from the child environment
// (scripts/lib/local-backend.mjs) instead of refusing to run.
if (process.env.CONVEX_DEPLOY_KEY) console.log("check-env: CONVEX_DEPLOY_KEY is set; tests and local Convex runs ignore it.");
