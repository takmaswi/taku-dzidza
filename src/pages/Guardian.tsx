import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** Shown to a learner under 18 until a guardian consents. The profile query updates live when they do. */
export default function Guardian({ state }: { state: Doc<"profiles">["consentState"] }) {
  const createRequest = useMutation(api.accounts.consent.createRequest);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = copy.guardian;

  const make = async () => {
    setError(null);
    try {
      const { token } = await createRequest({});
      setLink(`${window.location.origin}/consent/${token}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    }
  };

  return (
    <Layout signedIn>
      <div className="narrow card stack">
        <h1>{t.title}</h1>
        {state === "withdrawn" && <p className="notice">{t.withdrawn}</p>}
        <p>{t.body}</p>
        {link === null ? (
          <button className="pill" type="button" onClick={() => void make()}>
            {t.make}
          </button>
        ) : (
          <>
            <input type="text" readOnly value={link} aria-label="Link for your guardian" data-testid="consent-link" onFocus={(e) => e.target.select()} />
            <div className="actions">
              <a className="pill" href={`https://wa.me/?text=${encodeURIComponent(t.shareText + link)}`} target="_blank" rel="noreferrer">
                {t.whatsapp}
              </a>
              <button
                className="pill ghost"
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link).then(() => setCopied(true));
                }}
              >
                {copied ? t.copied : t.copyLink}
              </button>
            </div>
            <p className="soft">{t.expires}</p>
            <p className="notice">{t.waiting}</p>
          </>
        )}
        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Layout>
  );
}
