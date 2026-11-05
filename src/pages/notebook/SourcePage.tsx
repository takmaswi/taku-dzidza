import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { copy } from "../../copy/en";
import type { Citation } from "./NotebookChat";

/** The cited page with the quote highlighted. In the sources rail on wide screens, in a sheet on phones. */
export function SourcePage({ citation }: { citation: Citation }) {
  const t = copy.notebook;
  const page = useQuery(api.notebooks.sources.page, { sourceId: citation.sourceId, page: citation.page });
  const mark = useRef<HTMLElement>(null);
  const text = page?.text ?? null;
  const at = text === null ? -1 : text.toLowerCase().indexOf(citation.quote.toLowerCase());
  useEffect(() => {
    mark.current?.scrollIntoView({ block: "center" });
  }, [at, citation]);
  const heading = page ? t.fromPage(page.title, citation.page) : copy.loading;
  return (
    <section className="source-page" data-testid="source-page" aria-label={heading}>
      <h3>{heading}</h3>
      {page !== undefined && text === null && <p>{t.pageMissing}</p>}
      {text !== null && at < 0 && <blockquote className="quote">{citation.quote}</blockquote>}
      {text !== null && (
        <div className="page-text">
          {at < 0 ? (
            text
          ) : (
            <>
              {text.slice(0, at)}
              <mark ref={mark}>{text.slice(at, at + citation.quote.length)}</mark>
              {text.slice(at + citation.quote.length)}
            </>
          )}
        </div>
      )}
    </section>
  );
}
