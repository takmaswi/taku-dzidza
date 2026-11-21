import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { copy } from "../copy/en";
import { ORG_TYPES, type OrgType } from "./types";

/**
 * Find an organisation by name (search starts after 2 letters, at most 8
 * results, entries not yet checked never show) and follow it, or add one that
 * is missing. Following is not joining: joining needs a code.
 */


export function OrgSearch({ types, followed, onPick, pickLabel }: { types?: OrgType[]; followed?: Set<string>; onPick?: (id: Id<"organisations">, name: string) => void; pickLabel?: string }) {
  const t = copy.orgs;
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const typed = text.trim().length >= 2;
  const results = useQuery(api.organisations.organisations.search, typed ? { text, types } : "skip");
  const follow = useMutation(api.organisations.organisations.follow);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="org-search">{t.searchLabel}</label>
        <input id="org-search" type="search" autoComplete="off" maxLength={100} placeholder={t.searchHint} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {typed && results !== undefined && (
        <ul className="plain-list org-results" aria-label={t.results}>
          {results.length === 0 && <li className="soft">{t.noMatches}</li>}
          {results.map((o) => (
            <li key={o._id} className="org-row">
              <span className="grow">
                <Link to={`/org/${o._id}`}>
                  <b>{o.name}</b>
                </Link>
                <small className="soft">
                  {t.types[o.type]}. {t.place(o.town, o.country)}
                  {o.verified ? `. ${t.verifiedTag}` : ""}
                </small>
              </span>
              {onPick !== undefined ? (
                <button type="button" className="pill small" onClick={() => onPick(o._id, o.name)}>
                  {pickLabel ?? t.follow}
                </button>
              ) : followed?.has(o._id) ? (
                <span className="tag">{t.following}</span>
              ) : (
                <button type="button" className="pill small ghost" aria-label={`${t.follow} ${o.name}`} onClick={() => void follow({ organisationId: o._id }).catch((err: unknown) => setError(errorText(err, copy.errors.generic)))}>
                  {t.follow}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {onPick === undefined &&
        (adding ? (
          <AddOrgForm initialName={text} types={types} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className="link" onClick={() => setAdding(true)}>
            {t.notListed}
          </button>
        ))}
    </div>
  );
}

/** Name, type, town and country. Used for "Not listed? Add it" and, for adults, setting one up as its admin. */
export function OrgFields({ types, onSubmit, submitLabel, onCancel, initialName = "", title, line }: {
  types?: OrgType[];
  onSubmit: (fields: { name: string; type: OrgType; town: string; country: string }) => Promise<unknown>;
  submitLabel: string;
  onCancel?: () => void;
  initialName?: string;
  title: string;
  line: string;
}) {
  const t = copy.orgs;
  const choices = types === undefined || types.length === 0 ? ORG_TYPES : types;
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<OrgType>(choices[0]);
  const [town, setTown] = useState("");
  const [country, setCountry] = useState("Zimbabwe");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel stack"
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        void onSubmit({ name, type, town, country })
          .catch((err: unknown) => setError(errorText(err, copy.errors.generic)))
          .finally(() => setBusy(false));
      }}
    >
      <h3>{title}</h3>
      <p className="soft">{line}</p>
      <div className="field">
        <label htmlFor="org-name">{t.name}</label>
        <input id="org-name" type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="org-type">{t.type}</label>
        <select id="org-type" value={type} onChange={(e) => setType(e.target.value as OrgType)}>
          {choices.map((c) => (
            <option key={c} value={c}>
              {t.types[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="org-town">{t.town}</label>
        <input id="org-town" type="text" maxLength={60} value={town} onChange={(e) => setTown(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="org-country">{t.country}</label>
        <input id="org-country" type="text" maxLength={60} value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button className="pill small" type="submit" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel !== undefined && (
          <button className="pill small ghost" type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

function AddOrgForm({ initialName, types, onDone }: { initialName: string; types?: OrgType[]; onDone: () => void }) {
  const t = copy.orgs;
  const add = useMutation(api.organisations.organisations.addPending);
  const [done, setDone] = useState<string | null>(null);
  if (done !== null) {
    return (
      <p className="notice" role="status">
        {t.added(done)}
      </p>
    );
  }
  return (
    <OrgFields
      title={t.addTitle}
      line={t.addLine}
      submitLabel={t.add}
      initialName={initialName.trim()}
      types={types}
      onCancel={onDone}
      onSubmit={async (fields) => {
        await add(fields);
        setDone(fields.name.trim());
      }}
    />
  );
}
