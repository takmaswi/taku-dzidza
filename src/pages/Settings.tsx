import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { STUDY_STYLES } from "../../convex/accounts/styles";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { Switch } from "../components/Switch";
import { copy } from "../copy/en";

type Access = Doc<"profiles">["accessibility"];
const ACCESS_KEYS: (keyof Access)[] = ["dyslexia", "largeText", "readAloud", "shortChunks", "highContrast", "reducedMotion"];

export default function Settings({ profile, email }: { profile: Doc<"profiles">; email: string }) {
  const t = copy.settings;
  const setStyle = useMutation(api.accounts.profiles.setStyle);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  const setAccessibility = useMutation(api.accounts.profiles.setAccessibility);
  const setDisplayName = useMutation(api.accounts.profiles.setDisplayName);
  const deleteMyAccount = useMutation(api.accounts.deletion.deleteMyAccount);
  const { signOut } = useAuthActions();
  const [name, setName] = useState(profile.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Switches move at once; the server copy follows (and the theme with it).
  const [access, setAccess] = useState<Access>(profile.accessibility);

  return (
    <Layout signedIn>
      <div className="narrow stack">
        <h1>{t.title}</h1>

        <section className="card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void setDisplayName({ displayName: name }).then(() => setSaved(true));
            }}
          >
            <div className="field">
              <label htmlFor="name">{t.name}</label>
              <input id="name" type="text" value={name} maxLength={40} onChange={(e) => (setName(e.target.value), setSaved(false))} />
            </div>
            <button className="pill small" type="submit">
              {saved ? t.saved : t.save}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>{t.styleTitle}</h2>
          <div className="choices">
            {STUDY_STYLES.map((s) => (
              <button key={s} type="button" className="choice" aria-pressed={profile.studyStyle === s} onClick={() => void setStyle({ studyStyle: s })}>
                <b>{copy.styles[s].name}</b>
                <span>{copy.styles[s].line}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>{t.answersTitle}</h2>
          <div className="choices">
            {(["answer", "guide"] as const).map((m) => (
              <button key={m} type="button" className="choice" aria-pressed={profile.answerMode === m} onClick={() => void setAnswerMode({ answerMode: m })}>
                <b>{t[m].name}</b>
                <span>{t[m].line}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>{t.accessTitle}</h2>
          {ACCESS_KEYS.map((key) => (
            <div className="toggle-row" key={key}>
              <label htmlFor={`a-${key}`} style={{ margin: 0 }}>
                {t.access[key].name}
                <small className="soft" style={{ display: "block", fontWeight: 400 }}>
                  {t.access[key].line}
                </small>
              </label>
              <Switch
                id={`a-${key}`}
                label={t.access[key].name}
                checked={access[key]}
                onChange={(value) => {
                  const next = { ...access, [key]: value };
                  setAccess(next);
                  void setAccessibility({ accessibility: next });
                }}
              />
            </div>
          ))}
        </section>

        <section className="card">
          <h2>{t.deleteTitle}</h2>
          <p>{t.deleteBody}</p>
          <div className="field">
            <label htmlFor="confirmEmail">{t.deleteConfirm}</label>
            <input id="confirmEmail" type="email" value={confirm} placeholder={email} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="pill danger"
            type="button"
            disabled={confirm.trim().toLowerCase() !== email.toLowerCase()}
            onClick={() =>
              void deleteMyAccount({ confirmEmail: confirm }).then(
                // The session rows are already gone; signing out clears the browser copy.
                () => signOut().catch(() => undefined).finally(() => window.location.assign("/")),
                (e) => setError(errorText(e, copy.errors.generic)),
              )
            }
          >
            {t.deleteButton}
          </button>
        </section>
      </div>
    </Layout>
  );
}
