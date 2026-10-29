import { useAuthActions } from "@convex-dev/auth/react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signIn" | "signUp">(params.get("mode") === "signUp" ? "signUp" : "signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = copy.auth;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("flow", mode);
    setBusy(true);
    try {
      await signIn("password", form);
    } catch (e) {
      const text = errorText(e, "");
      setError(text !== "" ? text : mode === "signIn" ? t.wrong : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="narrow card">
        <h1>{mode === "signIn" ? t.signInTitle : t.signUpTitle}</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">{t.password}</label>
            <input id="password" name="password" type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} required minLength={10} />
            {mode === "signUp" && <small>{t.passwordHint}</small>}
          </div>
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="pill" type="submit" disabled={busy}>
              {busy ? t.working : mode === "signIn" ? t.signIn : t.signUp}
            </button>
            <button className="link" type="button" onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
              {mode === "signIn" ? t.toSignUp : t.toSignIn}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
