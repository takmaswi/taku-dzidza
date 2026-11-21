import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Shared } from "../packs/scope";
import { authorLabel } from "./rules";

/**
 * What the notebook screen shows for a bought or rented listing (Step 9):
 * "Bought" or "Rented until <date>", or that the rental ended with a way to
 * renew; and the buyer's name and email, which the reader marks faintly
 * across every page. The reader is view only: no download, no print, no
 * copying a whole page (src/market/Watermark.tsx).
 */

export type BoughtInfo = {
  listingId: Doc<"listings">["_id"];
  title: string;
  author: string;
  paperLabel: string;
  access: "bought" | "rented" | "ended";
  endsAt: number | null;
  stale: boolean;
  watermark: string;
};

export async function boughtInfo(ctx: QueryCtx, notebook: Doc<"notebooks">, shared: Extract<Shared, { kind: "listing" }> | null): Promise<BoughtInfo | null> {
  if (notebook.listingId === undefined || notebook.profileId === undefined) return null;
  const listing = shared?.listing ?? (await ctx.db.get(notebook.listingId));
  if (listing === null) return null;
  const seller = await ctx.db.get(listing.sellerId);
  const profile = await ctx.db.get(notebook.profileId);
  const user = profile === null ? null : await ctx.db.get(profile.userId);
  const author = seller?.realName ?? "";
  const purchase = shared?.purchase ?? null;
  return {
    listingId: listing._id,
    title: listing.title,
    author,
    paperLabel: authorLabel(author),
    access: purchase === null ? "ended" : purchase.kind === "buy" ? "bought" : "rented",
    endsAt: purchase?.endsAt ?? null,
    stale: purchase !== null && notebook.packVersion !== listing.version,
    watermark: [profile?.displayName ?? "", user?.email ?? ""].filter((s) => s !== "").join(" · "),
  };
}
