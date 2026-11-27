import { useConvexAuth } from "convex/react";
import { ChevronDown, Mail } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/**
 * Contact us (SPEC.md 3.13): why people get in touch, each opening the right
 * route, and one quiet safety line at the very bottom. The safety layer's
 * distress reply links to /contact#safety, which scrolls to that line.
 *
 * TODO(Takunda): no contact address exists yet. Set VITE_CONTACT_EMAIL at
 * build time; until then each reason shows its in app route only, with a
 * note that email is not set up.
 */
const CONTACT_EMAIL = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? "").trim();

type Reason = (typeof copy.contact.reasons)[number];

export default function Contact() {
  const t = copy.contact;
  const { hash } = useLocation();
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => {
    if (hash === "#safety") document.getElementById("safety")?.scrollIntoView({ block: "center" });
  }, [hash]);
  return (
    <Layout>
      <div className="narrow stack contact">
        <div>
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>
        <div className="contact-reasons">
          {t.reasons.map((r) => (
            <details key={r.id} className="panel contact-reason">
              <summary>
                <span>{r.title}</span>
                <ChevronDown size={18} aria-hidden="true" className="contact-chev" />
              </summary>
              <p>{r.line}</p>
              <ReasonActions reason={r} signedIn={isAuthenticated} />
            </details>
          ))}
        </div>
        {CONTACT_EMAIL === "" && <p className="soft">{t.noEmail}</p>}
        <p id="safety" className="contact-safety soft">
          {t.safetyBefore} <a href="tel:116">{t.safetyCall}</a> {t.safetyAfter}
        </p>
      </div>
    </Layout>
  );
}

/** A reason's way through: its page in the app (sign in first when signed out), and email once an address is set. */
function ReasonActions({ reason, signedIn }: { reason: Reason; signedIn: boolean }) {
  const t = copy.contact;
  const route = reason.route === null ? null : signedIn ? reason.route : { to: "/signin", label: t.signInFirst };
  if (route === null && CONTACT_EMAIL === "") return null;
  return (
    <div className="actions">
      {route !== null && (
        <Link to={route.to} className="pill small">
          {route.label}
        </Link>
      )}
      {CONTACT_EMAIL !== "" && (
        <a className={route === null ? "pill small" : "pill ghost small"} href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(reason.subject)}`}>
          <Mail size={16} aria-hidden="true" /> {t.email}
        </a>
      )}
    </div>
  );
}
