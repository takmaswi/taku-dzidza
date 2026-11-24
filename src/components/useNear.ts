import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Turns true once the element comes within 600 px of the screen and stays
 * true. Pass false to start true. Used to hold back art and textures far
 * down a page, which a browser's own lazy loading fetches too early.
 */
export function useNear<T extends Element>(hold = true): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(!hold);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (el === null) return;
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}
