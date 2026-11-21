import { useMutation } from "convex/react";
import qrcode from "qrcode-generator";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { copy } from "../copy/en";

/**
 * Pieces shared by the teacher, learner and guardian pages (Stage 2). The
 * surfaces show only while TEACHER_MODE is on (convex/flags.ts); the server
 * checks it again on every call.
 */

/** A QR code drawn as SVG squares, no image and no inline script. */
export function QrCode({ text, label, size = 200 }: { text: string; label: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const dark: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) dark.push([c, r]);
    return { n, dark };
  }, [text]);
  const quiet = 4;
  const box = cells.n + quiet * 2;
  return (
    <svg className="qr" role="img" aria-label={label} viewBox={`0 0 ${box} ${box}`} width={size} height={size} shapeRendering="crispEdges" data-testid="qr">
      <rect width={box} height={box} fill="#ffffff" />
      {cells.dark.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x + quiet} y={y + quiet} width={1} height={1} fill="#000000" />
      ))}
    </svg>
  );
}

/** Type a class code. Used in Settings and on the join page. */
export function JoinForm({ initial = "", onDone }: { initial?: string; onDone?: () => void }) {
  const t = copy.classes;
  const join = useMutation(api.classes.joining.requestJoin);
  const [code, setCode] = useState(initial);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setNote(null);
        void join({ code })
          .then((r) => {
            if (!r.ok) return setNote({ ok: false, text: r.message });
            setNote({ ok: true, text: r.status === "approved" ? t.joined(r.className) : t.waiting(r.className) });
            onDone?.();
          })
          .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }));
      }}
    >
      <div className="field">
        <label htmlFor="class-code">{t.codeLabel}</label>
        <input id="class-code" type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <button className="pill small" type="submit">
        {t.join}
      </button>
      {note !== null && (
        <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </form>
  );
}

/** A child types the code their guardian made. Works before consent too. */
export function GuardianCodeForm() {
  const t = copy.classes;
  const redeem = useMutation(api.classes.guardians.redeemChildCode);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void redeem({ code })
          .then((r) => setNote(r.ok ? { ok: true, text: t.guardianCodeDone } : { ok: false, text: r.message }))
          .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }));
      }}
    >
      <div className="field">
        <label htmlFor="guardian-code">{t.guardianCodeTitle}</label>
        <small className="soft">{t.guardianCodeLine}</small>
        <input id="guardian-code" type="text" autoCapitalize="characters" autoComplete="off" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <button className="pill small" type="submit">
        {t.link}
      </button>
      {note !== null && (
        <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </form>
  );
}
