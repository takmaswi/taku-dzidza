import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ADULT_AGE, ageOn } from "../../convex/accounts/age";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { StylePicker } from "../components/StylePicker";
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
  const setAnalytics = useMutation(api.analytics.setConsent);
  const { signOut } = useAuthActions();
  const [name, setName] = useState(profile.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Switches move at once; the server copy follows (and the theme with it).
  const [access, setAccess] = useState<Access>(profile.accessibility);
  const [analytics, setAnalyticsOn] = useState(profile.analyticsConsent === true);
  const adult = ageOn(profile.birthYear, profile.birthMonth, new Date()) >= ADULT_AGE;

  return (
    <Layout signedIn>
      <div className="stack" style={{ maxWidth: 900 }}>
        <div>
          <span className="eyebrow">{copy.nav.settings}</span>
          <h1>{t.title}</h1>
        </div>

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
          <StylePicker compact value={profile.studyStyle} onPick={(s) => void setStyle({ studyStyle: s })} />
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
          <h2>{t.accountTitle}</h2>
          <p className="soft">{t.signedInAs(email)}</p>
          {adult && (
            <div className="toggle-row">
              <label htmlFor="analytics" style={{ margin: 0 }}>
                {t.analyticsTitle}
                <small className="soft" style={{ display: "block", fontWeight: 400 }}>
                  {t.analyticsLine}
                </small>
              </label>
              <Switch
                id="analytics"
                label={t.analyticsTitle}
                checked={analytics}
                onChange={(value) => {
                  setAnalyticsOn(value);
                  void setAnalytics({ consent: value });
                }}
              />
            </div>
          )}
          <p className="actions" style={{ marginTop: "1rem" }}>
            <Link to="/privacy">{copy.legal.privacyLink}</Link>
            <Link to="/terms">{copy.legal.termsLink}</Link>
          </p>
          <button type="button" className="pill ghost" onClick={() => void signOut()}>
            {copy.menu.signOut}
          </button>
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
