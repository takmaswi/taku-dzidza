import { useMutation, useQuery } from "convex/react";
import { BookOpen, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** The dashboard: notebooks first. The study plan arrives in Phase 4 (SPEC.md section 8). */
export default function Home({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.home;
  const notebooks = useQuery(api.notebooks.notebooks.list);
  const create = useMutation(api.notebooks.notebooks.create);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const style = copy.styles[profile.studyStyle];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    try {
      const id = await create({ title });
      navigate(`/n/${id}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    }
  };

  return (
    <Layout signedIn>
      <div className="stack">
        <div>
          <h1>{t.hello(profile.displayName)}</h1>
          <p className="soft lead">{t.lead}</p>
        </div>
        <div className="grid two">
          <section className="card warm stack">
            <h2>{t.notebooksTitle}</h2>
            {notebooks !== undefined && notebooks.length > 0 ? (
              <ul className="notebook-list">
                {notebooks.map((n) => (
                  <li key={n._id}>
                    <Link to={`/n/${n._id}`} className="notebook-link">
                      <BookOpen size={20} aria-hidden="true" />
                      <span>
                        <b>{n.title}</b>
                        <small className="soft">{t.sources(n.sourceCount)}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="soft">{notebooks === undefined ? copy.loading : t.notebooksBody}</p>
            )}
            {adding ? (
              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="title">{t.newName}</label>
                  <input id="title" name="title" type="text" placeholder={t.newPlaceholder} maxLength={80} required autoFocus />
                </div>
                {error !== null && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="pill" type="submit">
                  {t.create}
                </button>
              </form>
            ) : (
              <button className="pill" type="button" onClick={() => setAdding(true)}>
                <Plus size={18} aria-hidden="true" /> {t.newNotebook}
              </button>
            )}
            {notebooks !== undefined && notebooks.length === 0 && <ImageSlot slug="empty-notebook" alt="Hands photographing a textbook page with a phone" />}
          </section>
          <div className="grid">
            <div className="card">
              <h2>{t.planTitle}</h2>
              <p className="soft">{t.planBody}</p>
            </div>
            <div className="card">
              <h2>{t.styleTitle}</h2>
              <p>
                <b>{style.name}</b>
              </p>
              <p className="soft">{style.line}</p>
              <Link to="/settings" className="pill ghost small">
                {t.change}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
