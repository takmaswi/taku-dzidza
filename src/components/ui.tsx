import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { copy } from "../copy/en";

function useDismiss(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose, ref]);
}

/**
 * A button that opens a small menu. Items close it when picked. Used for the
 * question box chips and the more menus.
 */
export function Menu({ label, button, className = "", align = "start", up = false, children }: { label: string; button: ReactNode; className?: string; align?: "start" | "end"; up?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  return (
    <div className={`menu ${className}`} ref={ref}>
      <button type="button" className="menu-button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label} onClick={() => setOpen(!open)}>
        {button}
      </button>
      {open && (
        <div id={id} role="menu" className={`menu-panel ${align}${up ? " up" : ""}`} aria-label={label}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** One choice in a chip menu: its name and a one line explanation, ticked when it is the current one. */
export function MenuChoice({ checked, name, line, onPick }: { checked: boolean; name: string; line: string; onPick: () => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} className="menu-choice" onClick={onPick}>
      <b>{name}</b>
      <span>{line}</span>
    </button>
  );
}

/** A sheet that rises from the bottom of a phone screen, over a scrim. */
export function Sheet({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} data-testid={testId}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} aria-hidden="true" /> {copy.notebook.done}
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}
