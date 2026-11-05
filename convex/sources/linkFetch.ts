"use node";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { SOURCE_LIMITS } from "./limits";
import { followLink, isPublicAddress, LINK_ERRORS, type LinkOutcome, type LinkResponse } from "./linkGuard";
import { linkProblem } from "./text";

/**
 * The network side of the link reader, in the Node runtime because the host
 * must be resolved. Each hop makes one request and never follows a redirect
 * (followLink does that, the same as fetch with redirect "manual"). The
 * address check sits inside the connection's own lookup, so the address that
 * is checked is the address that is connected to: a host that answers with a
 * public address for a first check and a private one for the connection
 * cannot get through.
 */

const LINK_TIMEOUT_MS = 15_000;
const PRIVATE_ADDRESS = "private address";

type Resolver = (host: string, callback: (error: Error | null, addresses: LookupAddress[]) => void) => void;

const systemResolver: Resolver = (host, callback) => dnsLookup(host, { all: true, verbatim: true }, callback);

/** A connection lookup that refuses unless every address the host resolves to is public. */
export function guardedLookup(resolve: Resolver = systemResolver): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, (error, addresses) => {
      if (error !== null) return callback(error, "", 0);
      if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
        return callback(Object.assign(new Error(PRIVATE_ADDRESS), { code: "EPRIVATEADDRESS" }), "", 0);
      }
      // Node asks for every address when it tries families in turn, and for one otherwise.
      if (options.all === true) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

/** Stops reading at the limit, so a huge page costs no more than a small one. */
function readBody(response: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size >= limit) {
        response.destroy();
        resolve(Buffer.concat(chunks).subarray(0, limit).toString("utf8"));
      }
    });
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    response.on("error", reject);
  });
}

function fetchOnce(url: string, signal: AbortSignal): Promise<LinkResponse> {
  const target = new URL(url);
  const request = target.protocol === "https:" ? httpsRequest : httpRequest;
  // A bare IP address skips the lookup, so it is checked here.
  const bare = target.hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare) !== 0 && !isPublicAddress(bare)) return Promise.reject(new Error(PRIVATE_ADDRESS));
  return new Promise((resolve, reject) => {
    const req = request(target, { method: "GET", signal, lookup: guardedLookup(), headers: { "User-Agent": "Takudzidza source reader", Accept: "text/html, text/plain" } }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location ?? null;
      const contentType = response.headers["content-type"] ?? "";
      const readable = status >= 200 && status < 300 && /text\/html|text\/plain/.test(contentType);
      if (!readable) {
        response.destroy();
        return resolve({ status, location, contentType, body: "" });
      }
      readBody(response, SOURCE_LIMITS.maxLinkBytes).then((body) => resolve({ status, location, contentType, body }), reject);
    });
    req.on("error", reject);
    req.end();
  });
}

export const fetchLink = internalAction({
  args: { url: v.string() },
  handler: async (_ctx, args): Promise<LinkOutcome> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
    try {
      return await followLink(args.url, linkProblem, (url) => fetchOnce(url, controller.signal));
    } catch (error) {
      if (error instanceof Error && error.message === PRIVATE_ADDRESS) return { ok: false, error: LINK_ERRORS.blocked };
      return { ok: false, error: LINK_ERRORS.unreachable };
    } finally {
      clearTimeout(timer);
    }
  },
});
