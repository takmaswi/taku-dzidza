export function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input id={id} type="checkbox" role="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  );
}
