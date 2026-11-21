import type { ReactNode } from "react";
import { copy } from "../copy/en";

/**
 * The reader for bought and rented notes (Step 9): view only. Selecting,
 * copying, the context menu and printing are off, and the buyer's name and
 * email run faintly across the page. Nothing here offers a download: the
 * listing's copies keep no files.
 */
export function Protected({ watermark, children }: { watermark: string; children: ReactNode }) {
  const stop = (e: { preventDefault: () => void }) => e.preventDefault();
  return (
    <div className="protected" data-testid="protected-reader" onCopy={stop} onCut={stop} onContextMenu={stop} onDragStart={stop}>
      <p className="soft small-text reader-line">{copy.market.readerLine}</p>
      {children}
      <div className="watermark" aria-hidden="true" data-testid="watermark">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i}>{watermark}</span>
        ))}
      </div>
    </div>
  );
}
