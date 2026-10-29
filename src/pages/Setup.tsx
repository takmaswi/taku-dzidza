import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

export default function Setup() {
  const create = useMutation(api.accounts.profiles.create);
  const [error, setError] = useState<string | null>(null);
  const [tooYoung, setTooYoung] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = copy.setup;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => thisYear - 10 - i);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await create({ displayName: String(form.get("displayName") ?? ""), birthMonth: Number(form.get("birthMonth")), birthYear: Number(form.get("birthYear")) });
    } catch (e) {
      const text = errorText(e, copy.errors.generic);
      if (text === copy.errors.tooYoung) setTooYoung(true);
      else setError(text);
    } finally {
      setBusy(false);
    }
  };

  if (tooYoung) {
    return (
      <Layout signedIn>
        <div className="narrow card warm">
          <h1>{copy.tooYoung.title}</h1>
          <p>{copy.tooYoung.body}</p>
          <a className="pill" href="https://amayi-learn.vercel.app">
            {copy.tooYoung.link}
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout signedIn>
      <div className="narrow card">
        <h1>{t.title}</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="displayName">{t.name}</label>
            <input id="displayName" name="displayName" type="text" autoComplete="given-name" maxLength={40} required />
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 1rem" }}>
            <legend style={{ fontWeight: 600, marginBottom: "0.35rem" }}>{t.birth}</legend>
            <div className="row">
              <div>
                <label htmlFor="birthMonth" className="soft" style={{ fontWeight: 400 }}>
                  {t.month}
                </label>
                <select id="birthMonth" name="birthMonth" required defaultValue="">
                  <option value="" disabled />
                  {t.months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="birthYear" className="soft" style={{ fontWeight: 400 }}>
                  {t.year}
                </label>
                <select id="birthYear" name="birthYear" required defaultValue="">
                  <option value="" disabled />
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <small className="soft">{t.why}</small>
          </fieldset>
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="pill" type="submit" disabled={busy}>
            {t.next}
          </button>
        </form>
      </div>
    </Layout>
  );
}
