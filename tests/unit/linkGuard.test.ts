import { describe, expect, test } from "vitest";
import { guardedLookup } from "../../convex/sources/linkFetch";
import { followLink, isPublicAddress, LINK_ERRORS, MAX_LINK_HOPS, type LinkResponse } from "../../convex/sources/linkGuard";
import { linkProblem } from "../../convex/sources/text";

const page = (body = "hello"): LinkResponse => ({ status: 200, location: null, contentType: "text/html", body });
const hop = (location: string | null, status = 302): LinkResponse => ({ status, location, contentType: "", body: "" });
const follow = (start: string, fetchOnce: (url: string) => Promise<LinkResponse>) => followLink(start, linkProblem, fetchOnce);

describe("public address rule", () => {
  test.each(["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1", "0.0.0.0", "192.0.0.1", "198.18.0.1", "224.0.0.1", "255.255.255.255", "::", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "2002:7f00:1::", "2001:db8::1", "not an address", ""])("%s is not public", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
  test.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "192.169.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "64:ff9b::808:808"])("%s is public", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe("link check", () => {
  test.each(["http://localhost:3210", "http://localhost./x", "http://foo.localhost/", "http://127.0.0.1/", "http://2130706433/", "http://0x7f.1/", "http://169.254.169.254/latest/meta-data/", "http://100.64.0.1/", "http://[::1]/", "http://printer.local/", "http://user:pass@example.com/", "ftp://example.com/", "file:///etc/passwd"])("%s is refused", (url) => {
    expect(linkProblem(url)).not.toBeNull();
  });
  test("a public web address passes", () => {
    expect(linkProblem("https://example.com/notes")).toBeNull();
  });
});

describe("following a link", () => {
  test("a page with no redirect is returned", async () => {
    expect(await follow("https://example.com/a", async () => page())).toMatchObject({ ok: true, url: "https://example.com/a" });
  });

  test("a redirect to a private address is stopped before it is fetched", async () => {
    const fetched: string[] = [];
    const outcome = await follow("https://example.com/a", async (url) => {
      fetched.push(url);
      return hop("http://169.254.169.254/latest/meta-data/");
    });
    expect(outcome).toEqual({ ok: false, error: LINK_ERRORS.badRedirect });
    expect(fetched).toEqual(["https://example.com/a"]);
  });

  test("every hop is checked, not only the first and the last", async () => {
    const chain: Record<string, LinkResponse> = { "https://a.example.com/": hop("https://b.example.com/"), "https://b.example.com/": hop("http://localhost/admin") };
    expect(await follow("https://a.example.com/", async (url) => chain[url])).toEqual({ ok: false, error: LINK_ERRORS.badRedirect });
  });

  test("relative redirects resolve against the current address", async () => {
    const fetched: string[] = [];
    const outcome = await follow("https://example.com/a/b", async (url) => {
      fetched.push(url);
      return url.endsWith("/c") ? page() : hop("/c");
    });
    expect(outcome).toMatchObject({ ok: true, url: "https://example.com/c" });
    expect(fetched).toEqual(["https://example.com/a/b", "https://example.com/c"]);
  });

  test(`${MAX_LINK_HOPS} redirects are followed and one more is refused`, async () => {
    const run = (redirects: number) => {
      let n = 0;
      return follow("https://example.com/0", async () => (n++ < redirects ? hop(`https://example.com/${n}`) : page()));
    };
    expect((await run(MAX_LINK_HOPS)).ok).toBe(true);
    expect(await run(MAX_LINK_HOPS + 1)).toEqual({ ok: false, error: LINK_ERRORS.tooManyHops });
  });

  test("a redirect with no location is refused", async () => {
    expect(await follow("https://example.com/", async () => hop(null))).toEqual({ ok: false, error: LINK_ERRORS.badRedirect });
  });
});

describe("resolving the host at connection time", () => {
  const lookupWith = (addresses: { address: string; family: number }[], options: { all?: boolean } = {}) =>
    new Promise<{ error: Error | null; address: unknown }>((resolve) => {
      guardedLookup((_host, cb) => cb(null, addresses))("example.com", options as never, (error, address) => resolve({ error, address }));
    });

  test("a host that resolves to a private address is refused", async () => {
    const { error } = await lookupWith([{ address: "169.254.169.254", family: 4 }]);
    expect(error?.message).toBe("private address");
  });
  test("one private address among public ones is refused", async () => {
    const { error } = await lookupWith([{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]);
    expect(error?.message).toBe("private address");
  });
  test("a public host connects, in both lookup forms", async () => {
    expect(await lookupWith([{ address: "8.8.8.8", family: 4 }])).toEqual({ error: null, address: "8.8.8.8" });
    expect(await lookupWith([{ address: "8.8.8.8", family: 4 }], { all: true })).toEqual({ error: null, address: [{ address: "8.8.8.8", family: 4 }] });
  });
});
