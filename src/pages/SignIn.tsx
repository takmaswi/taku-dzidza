import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

type Step = "form" | "verify" | "forgot" | "reset";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const options = useQuery(api.accounts.authOptions.available);
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signIn" | "signUp">(params.get("mode") === "signUp" ? "signUp" : "signIn");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = copy.auth;

  const run = async (work: () => Promise<void>, fallback: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      const text = errorText(e, "");
      setError(text !== "" ? text : fallback);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("flow", mode);
    const address = String(form.get("email") ?? "").trim();
    void run(async () => {
      const result = await signIn("password", form);
      // No session yet means a code is on its way to confirm the address.
      if (!result.signingIn) {
        setEmail(address);
        setStep("verify");
      }
    }, mode === "signIn" ? t.wrong : t.failed);
  };

  const verify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    void run(async () => {
      await signIn("password", { email, code, flow: "email-verification" });
    }, t.badCode);
  };

  const resend = () =>
    void run(async () => {
      await signIn("password", { email, flow: "email-verification" });
      setNotice(t.codeResent);
    }, t.failed);

  const forgot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    void run(async () => {
      // The same reply whether or not the address has an account, so this page cannot be used to find out.
      await signIn("password", { email: address, flow: "reset" }).catch(() => undefined);
      setEmail(address);
      setStep("reset");
    }, t.failed);
  };

  const reset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      await signIn("password", { email, code: String(form.get("code") ?? "").trim(), newPassword: String(form.get("newPassword") ?? ""), flow: "reset-verification" });
    }, t.badCode);
  };

  const feedback = (
    <>
      {notice !== null && <p className="notice">{notice}</p>}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );

  return (
    <Layout>
      <div className="split-page">
        <div className="card rise" style={{ maxWidth: 520, width: "100%", justifySelf: "center" }}>
          <span className="eyebrow">{copy.appName}</span>
          {step === "form" && (
            <>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>{mode === "signIn" ? t.signInTitle : t.signUpTitle}</h1>
              {options?.google === true && (
                <button type="button" className="pill ghost" style={{ width: "100%", marginBottom: "1rem" }} disabled={busy} onClick={() => void run(async () => void (await signIn("google")), t.failed)}>
                  {t.google}
                </button>
              )}
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
                {feedback}
                <div className="actions">
                  <button className="pill" type="submit" disabled={busy}>
                    {busy ? t.working : mode === "signIn" ? t.signIn : t.signUp}
                  </button>
                  <button className="link" type="button" onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
                    {mode === "signIn" ? t.toSignUp : t.toSignIn}
                  </button>
                  {mode === "signIn" && options?.emailCodes === true && (
                    <button className="link" type="button" onClick={() => setStep("forgot")}>
                      {t.forgot}
                    </button>
                  )}
                </div>
              </form>
              {mode === "signUp" && (
                <p className="soft small-text">
                  {t.agreeStart} <Link to="/terms">{copy.legal.termsLink}</Link> {t.agreeAnd} <Link to="/privacy">{copy.legal.privacyLink}</Link>.
                </p>
              )}
            </>
          )}

          {step === "verify" && (
            <>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>{t.verifyTitle}</h1>
              <p>{t.verifyBody(email)}</p>
              <form onSubmit={verify}>
                <div className="field">
                  <label htmlFor="code">{t.code}</label>
                  <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required />
                </div>
                {feedback}
                <div className="actions">
                  <button className="pill" type="submit" disabled={busy}>
                    {busy ? t.working : t.confirm}
                  </button>
                  <button className="link" type="button" disabled={busy} onClick={resend}>
                    {t.resend}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "forgot" && (
            <>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>{t.forgotTitle}</h1>
              <p>{t.forgotBody}</p>
              <form onSubmit={forgot}>
                <div className="field">
                  <label htmlFor="email">{t.email}</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                {feedback}
                <div className="actions">
                  <button className="pill" type="submit" disabled={busy}>
                    {busy ? t.working : t.sendCode}
                  </button>
                  <button className="link" type="button" onClick={() => setStep("form")}>
                    {t.back}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>{t.resetTitle}</h1>
              <p>{t.resetBody(email)}</p>
              <form onSubmit={reset}>
                <div className="field">
                  <label htmlFor="code">{t.code}</label>
                  <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required />
                </div>
                <div className="field">
                  <label htmlFor="newPassword">{t.newPassword}</label>
                  <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
                  <small>{t.passwordHint}</small>
                </div>
                {feedback}
                <div className="actions">
                  <button className="pill" type="submit" disabled={busy}>
                    {busy ? t.working : t.setPassword}
                  </button>
                  <button className="link" type="button" onClick={() => setStep("form")}>
                    {t.back}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        <div className="split-photo rise" style={{ ["--i" as string]: 2 }}>
          <ImageSlot slug="onboarding-2-senior-student" alt="A student revising with his phone and textbook" shape="arch" eager />
          <div className="card float-card">
            <span className="eyebrow">Taku</span>
            {copy.landing.floatCard}
          </div>
        </div>
      </div>
    </Layout>
  );
}
