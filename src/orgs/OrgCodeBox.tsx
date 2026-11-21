import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { copy } from "../copy/en";

/** One box for every code: a class code, an organisation's learner code, or a staff code. */
export function OrgCodeBox({ id = "org-code" }: { id?: string }) {
  const t = copy.orgs;
  const join = useMutation(api.organisations.organisations.joinWithCode);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setNote(null);
        void join({ code })
          .then((r) => {
            if (r.kind === "class") {
              if (!r.ok) return setNote({ ok: false, text: r.message });
              return setNote({ ok: true, text: r.status === "approved" ? copy.classes.joined(r.className) : copy.classes.waiting(r.className) });
            }
            if (!r.ok) return setNote({ ok: false, text: r.message });
            setNote({ ok: true, text: r.role === "learner" ? t.joinedOrg(r.name) : t.joinedStaff(r.name, t.roles[r.role]) });
            setCode("");
          })
          .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }));
      }}
    >
      <div className="field">
        <label htmlFor={id}>{t.codeTitle}</label>
        <small className="soft">{t.codeLine}</small>
        <input id={id} type="text" autoCapitalize="characters" autoComplete="off" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
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
