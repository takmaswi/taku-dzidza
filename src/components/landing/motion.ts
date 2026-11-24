import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Motion helpers for the landing page. Nothing moves while it is off screen,
 * while the tab is hidden, or when the visitor asks for less motion (the
 * phone's reduced motion setting or the app's data-motion="off").
 */

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeStill(onChange: () => void): () => void {
  const list = window.matchMedia(REDUCE);
  list.addEventListener("change", onChange);
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    list.removeEventListener("change", onChange);
    watch.disconnect();
  };
}

export function isStill(): boolean {
  return document.documentElement.dataset.motion === "off" || window.matchMedia(REDUCE).matches;
}

/** True when animations should hold still. False on the server, where nothing moves anyway. */
export function useStill(): boolean {
  return useSyncExternalStore(subscribeStill, isStill, () => false);
}

/**
 * active: the element is at least partly on screen and the tab is visible;
 * sections start their animations with it. idle: it is known to be off screen
 * or the tab is hidden, so running animations pause. Before the first check
 * (and in the prerendered page) it is neither.
 */
export function useInView<T extends Element>(rootMargin = "0px"): [RefObject<T | null>, boolean, boolean] {
  const ref = useRef<T | null>(null);
  const [onScreen, setOnScreen] = useState<boolean | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (!("IntersectionObserver" in window)) {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return [ref, onScreen === true && pageVisible, onScreen === false || !pageVisible];
}
