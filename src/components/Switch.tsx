import { useSettling } from "./hooks";

export function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input id={id} type="checkbox" role="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  );
}

/** A checkbox whose value lives on the server (see useSettling). */
export function SavedCheckbox({ checked, save }: { checked: boolean; save: (on: boolean) => Promise<unknown> }) {
  const [value, set] = useSettling(checked, save);
  return <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />;
}
