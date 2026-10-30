import { useEffect } from "react";

/**
 * Elements with .reveal rise in when they come into view, the way Takunda's
 * portfolio does it (src/components/Reveal.tsx there). Anything already on
 * screen shows at once, and nothing is hidden with reduced motion.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".reveal:not(.in)")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => (el.getBoundingClientRect().top < innerHeight * 0.9 ? el.classList.add("in") : io.observe(el)));
    // A safety net for fast scrolls and jumps the observer can miss: anything in view or passed shows.
    const sweep = () => {
      for (const el of els) if (!el.classList.contains("in") && el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add("in");
    };
    addEventListener("scroll", sweep, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", sweep);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
