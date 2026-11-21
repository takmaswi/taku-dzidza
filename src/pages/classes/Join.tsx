import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { JOIN_KEY } from "../../classes/flags";
import { JoinForm } from "../../classes/shared";
import { AppShell, Layout } from "../../components/Layout";
import { copy } from "../../copy/en";

/** /join/:code signed out: keep the code and send the learner to sign in; they come back here after. */
export function JoinSignedOut() {
  const t = copy.classes;
  const { code = "" } = useParams();
  useEffect(() => {
    if (code !== "") window.localStorage.setItem(JOIN_KEY, code);
  }, [code]);
  return (
    <Layout>
      <div className="narrow panel stack">
        <h1>{t.joinPageTitle}</h1>
        <p>{t.joinSignIn}</p>
        <Link to="/signin" className="pill">
          {t.joinGo}
        </Link>
      </div>
    </Layout>
  );
}

/** /join/:code signed in: one tap to join. */
export default function Join() {
  const t = copy.classes;
  const { code = "" } = useParams();
  const navigate = useNavigate();
  return (
    <AppShell title={t.joinPageTitle}>
      <div className="narrow panel stack">
        <h1>{t.joinPageTitle}</h1>
        <p className="soft">{t.joinTap(code)}</p>
        <JoinForm initial={code} onDone={() => window.setTimeout(() => navigate("/"), 1500)} />
      </div>
    </AppShell>
  );
}
