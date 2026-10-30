import { useMutation, useQuery } from "convex/react";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

const NB_COLOURS = ["var(--butter)", "var(--sage-tint)", "var(--msasa-tint)", "var(--honey)"];

export default function Notebooks() {
  const t = copy.notebooks;
  const h = copy.home;
  const notebooks = useQuery(api.notebooks.notebooks.list);
  const create = useMutation(api.notebooks.notebooks.create);
  const createSample = useMutation(api.notebooks.sample.create);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const id = await create({ title: String(new FormData(event.currentTarget).get("title") ?? "") });
      navigate(`/n/${id}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    }
  };

  return (
    <Layout signedIn>
      <div className="stack-lg">
        <div className="rise">
          <span className="eyebrow">{copy.nav.notebooks}</span>
          <h1>{t.title}</h1>
          <p className="lead soft">{t.lead}</p>
          <div className="actions">
            <button type="button" className="pill" onClick={() => setOpen(true)}>
              <Plus size={18} aria-hidden="true" /> {h.newNotebook}
            </button>
            <button type="button" className="pill ghost" onClick={() => void createSample({}).then((id) => navigate(`/n/${id}`))}>
              <Sparkles size={18} aria-hidden="true" /> {h.tiles.sample.title}
            </button>
          </div>
        </div>
        {open && (
          <form onSubmit={submit} className="card stack rise">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="title">{h.newName}</label>
              <input id="title" name="title" type="text" placeholder={h.newPlaceholder} maxLength={80} required autoFocus />
            </div>
            {error !== null && <p className="error">{error}</p>}
            <div className="actions">
              <button className="pill" type="submit">
                {h.create}
              </button>
              <button className="pill ghost" type="button" onClick={() => setOpen(false)}>
                {h.cancel}
              </button>
            </div>
          </form>
        )}
        {notebooks !== undefined && notebooks.length === 0 && <p className="soft">{t.empty}</p>}
        <div className="grid three">
          {(notebooks ?? []).map((nb, i) => (
            <Link key={nb._id} to={`/n/${nb._id}`} className="nb-card rise" style={{ ["--nb" as string]: NB_COLOURS[i % NB_COLOURS.length], ["--i" as string]: i }}>
              <BookOpen size={22} aria-hidden="true" style={{ position: "relative" }} />
              <span>
                <b>{nb.title}</b>
                <br />
                <span className="eyebrow" style={{ margin: 0 }}>
                  {h.sources(nb.sourceCount)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
