// Security headers for the site (audit S7), in one place. vercel.json carries
// them for a Git build on Vercel; scripts/deploy-vercel.mjs writes them into
// the prebuilt output, with the deployment's exact Convex origin; and
// scripts/csp-check.mjs serves a local build with them to prove the app still
// works. tests/unit/headers.test.ts fails when vercel.json drifts from this file.
import { createHash } from "node:crypto";

/**
 * The one inline script: it hides the prerendered landing page before paint
 * for anyone signed in or on another address (scripts/prerender.mjs). The
 * policy allows it by its hash, so no other inline script can run.
 */
export const LANDING_HIDE_SCRIPT = `(function(){var saved=false;try{saved=Object.keys(localStorage).some(function(k){return k.indexOf("__convexAuth")===0})}catch(e){}if(saved||location.pathname!=="/"){document.getElementById("prerender").remove()}})()`;

export function scriptHash(script = LANDING_HIDE_SCRIPT) {
  return `sha256-${createHash("sha256").update(script, "utf8").digest("base64")}`;
}

/** Any Convex cloud deployment, for a build that does not know its deployment yet. */
const ANY_CONVEX = { http: ["https://*.convex.cloud", "https://*.convex.site"], socket: ["wss://*.convex.cloud"] };

/** The origins of one deployment: its API (https and wss) and its HTTP actions site. */
export function convexOrigins(convexUrl) {
  if (convexUrl === undefined) return ANY_CONVEX;
  const url = new URL(convexUrl);
  const socket = `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
  const site = url.host.endsWith(".convex.cloud") ? [`https://${url.host.replace(/\.convex\.cloud$/, ".convex.site")}`] : [];
  return { http: [url.origin, ...site], socket: [socket] };
}

export function contentSecurityPolicy(convexUrl) {
  const convex = convexOrigins(convexUrl);
  return [
    "default-src 'self'",
    `script-src 'self' '${scriptHash()}'`,
    // KaTeX and the art set styles on elements, so inline styles stay allowed; scripts do not.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${convex.http.join(" ")}`,
    "font-src 'self' data:",
    // Convex over https and wss, uploads to the same origin, and error reports when a Sentry DSN is set.
    `connect-src 'self' ${[...convex.http, ...convex.socket].join(" ")} https://*.sentry.io`,
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Header name and value pairs for every response. */
export function securityHeaders(convexUrl) {
  return [
    ["Content-Security-Policy", contentSecurityPolicy(convexUrl)],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
    // The guardian's link carries its token in the path, so no address is ever sent on to another site.
    ["Referrer-Policy", "no-referrer"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"],
    ["Cross-Origin-Opener-Policy", "same-origin"],
  ];
}

/** The `headers` block of vercel.json. */
export function vercelHeaders(convexUrl) {
  return [{ source: "/(.*)", headers: securityHeaders(convexUrl).map(([key, value]) => ({ key, value })) }];
}
