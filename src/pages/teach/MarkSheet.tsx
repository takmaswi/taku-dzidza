import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Camera, Printer } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../access";
import { AppShell } from "../../components/Layout";
import { copy } from "../../copy/en";

type Question = { number: number; marks: number; kind: string };
type Mark = { markId: Id<"classMarks">; via: string; score: number; total: number; confirmed: boolean; perQuestion: { number: number; got: number; marks: number }[]; check: number[]; notes: { number: number; answer: string; reason: string }[] };
type Row = { key: string; enrolmentId: Id<"enrolments"> | null; rosterId: Id<"rosterNames"> | null; firstName: string; mark: Mark | null };

/**
 * Marks for one paper. For each learner or listed name: type the marks from a
 * printed paper, or photograph the script for Taku to mark. Marks from a photo
 * are a draft until the teacher confirms them, with the questions the second
 * check flagged shown first.
 */
export default function MarkSheet() {
  const t = copy.classes;
  const { classId = "", assignmentId = "" } = useParams();
  const sheet = useQuery(api.classes.assignments.sheet, { assignmentId: assignmentId as Id<"assignments"> });
  const [open, setOpen] = useState<string | null>(null);
  if (sheet === undefined) {
    return (
      <AppShell title={t.teachPage}>
        <p className="app-loading">{copy.loading}</p>
      </AppShell>
    );
  }
  return (
    <AppShell title={t.markingTitle(sheet.title)}>
      <div className="page-narrow stack">
        <Link to={`/teach/${classId}`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {copy.classes.teachPage}
        </Link>
        <h1>{t.markingTitle(sheet.title)}</h1>
        <PrintLink outputId={sheet.outputId} />
        {sheet.rows.length === 0 && <p className="soft">{t.noLearners}</p>}
        <ul className="plain-list stack">
          {sheet.rows.map((row) => (
            <li key={row.key} className="panel stack" data-testid="mark-row">
              <div className="row-between">
                <b>{row.firstName}</b>
                <span className="status">
                  <span className="status-label">{row.mark === null ? t.notMarked : `${row.mark.confirmed ? t.markedTag : t.draftTag}: ${t.scoreOf(row.mark.score, row.mark.total)}`}</span>
                </span>
              </div>
              {open === row.key ? (
                <RowMarker key={`${row.mark?.markId ?? "none"}:${row.mark?.score ?? 0}:${String(row.mark?.confirmed)}`} assignmentId={assignmentId as Id<"assignments">} classId={classId as Id<"classes">} row={row} questions={sheet.questions} onDone={() => setOpen(null)} />
              ) : (
                <button type="button" className="pill small ghost" onClick={() => setOpen(row.key)}>
                  {row.mark !== null && !row.mark.confirmed ? t.confirmMarks : t.typeMarks}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

/** The teacher's own paper, which prints with its marking scheme. */
function PrintLink({ outputId }: { outputId: Id<"outputs"> }) {
  const data = useQuery(api.study.tools.get, { outputId });
  if (data === undefined || data === null) return null;
  return (
    <Link to={`/n/${data.output.notebookId}/o/${outputId}`} className="pill small ghost">
      <Printer size={16} aria-hidden="true" /> {copy.classes.printPaper}
    </Link>
  );
}

function RowMarker({ assignmentId, classId, row, questions, onDone }: { assignmentId: Id<"assignments">; classId: Id<"classes">; row: Row; questions: Question[]; onDone: () => void }) {
  const t = copy.classes;
  const enterMarks = useMutation(api.classes.assignments.enterMarks);
  const confirm = useMutation(api.classes.marking.confirm);
  const uploadUrl = useMutation(api.classes.marking.uploadUrl);
  const markScript = useAction(api.classes.marking.markScript);
  const start = Object.fromEntries((row.mark?.perQuestion ?? []).map((q) => [q.number, q.got]));
  const [marks, setMarks] = useState<Record<number, number>>(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = row.enrolmentId !== null ? { enrolmentId: row.enrolmentId } : { rosterId: row.rosterId! };
  const draft = row.mark !== null && !row.mark.confirmed ? row.mark : null;
  const order = draft === null ? questions : [...questions].sort((a, b) => Number(!draft.check.includes(a.number)) - Number(!draft.check.includes(b.number)));
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));

  const photograph = async (files: FileList | null) => {
    if (files === null || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const photos = [];
      for (const file of [...files].slice(0, 4)) {
        const { url, uploadId } = await uploadUrl({ classId });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!res.ok) throw new Error("upload");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        photos.push({ uploadId, storageId });
      }
      const result = await markScript({ assignmentId, ...who, photos });
      if (!result.ok) setError(result.message);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const list = questions.map((q) => ({ number: q.number, got: marks[q.number] ?? 0 }));
    const done = draft !== null ? confirm({ markId: draft.markId, marks: list }) : enterMarks({ assignmentId, ...who, marks: list });
    void done.then(onDone).catch(fail);
  };

  return (
    <div className="stack">
      {draft !== null && draft.check.length > 0 && <p className="notice">{t.checkThese(draft.check.join(", "))}</p>}
      <div className="marks-grid">
        {order.map((q) => {
          const note = draft?.notes.find((n) => n.number === q.number);
          return (
            <div key={q.number} className={`field${draft?.check.includes(q.number) === true ? " flagged" : ""}`}>
              <label htmlFor={`m-${row.key}-${q.number}`}>
                {t.question(q.number)} ({copy.tools.marks(q.marks)})
              </label>
              {note !== undefined && (
                <small className="soft">
                  {t.readAs}: {note.answer || "..."} {note.reason}
                </small>
              )}
              <select id={`m-${row.key}-${q.number}`} value={marks[q.number] ?? 0} onChange={(e) => setMarks({ ...marks, [q.number]: Number(e.target.value) })}>
                {Array.from({ length: q.marks + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <div className="actions wrap">
        <button type="button" className="pill small" onClick={save} disabled={busy}>
          {draft !== null ? t.confirmMarks : t.saveMarks}
        </button>
        <label className="pill small ghost file-pick">
          <Camera size={16} aria-hidden="true" /> {busy ? t.marking : t.photoScript}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" data-testid="script-input" disabled={busy} onChange={(e) => void photograph(e.target.files)} />
        </label>
      </div>
      <p className="soft small-text">{t.photoLine}</p>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
