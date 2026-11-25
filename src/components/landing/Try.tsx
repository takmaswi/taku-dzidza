import { Pointer } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copy } from "../../copy/en";

/**
 * Marks a demo the visitor can play with: a small "Try it" pill, and a soft
 * pulsing ring on the element inside marked .try-target. Both go for good at
 * the first tap, click, key press or swipe inside. Styles: .try in landing.css.
 */
export function Try({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [tried, setTried] = useState(false);
  const done = tried ? undefined : () => setTried(true);
  return (
    <div className={`try ${className}`.trim()} data-tried={tried ? "true" : undefined} onPointerDownCapture={done} onKeyDownCapture={done} onScrollCapture={done}>
      <span className="try-pill" aria-hidden="true">
        <Pointer size={14} />
        {copy.landing.tryIt}
      </span>
      {children}
    </div>
  );
}
