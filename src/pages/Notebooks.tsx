import { useMutation, useQuery } from "convex/react";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { ObjectArt } from "../components/ObjectArt";
import { copy } from "../copy/en";
import { day } from "../market/format";

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
    <AppShell title={t.title}>
      <div className="page stack-lg">
        <div className="page-head rise">
          <div>
            <h1>{t.title}</h1>
            <p className="soft">{t.lead}</p>
            <div className="actions">
              <button type="button" className="pill" onClick={() => setOpen(true)}>
                <Plus size={18} aria-hidden="true" /> {h.newNotebook}
              </button>
              <button type="button" className="pill ghost" onClick={() => void createSample({}).then((id) => navigate(`/n/${id}`))}>
                <Sparkles size={18} aria-hidden="true" /> {h.tiles.sample.title}
              </button>
            </div>
          </div>
        </div>
        {open && (
          <form onSubmit={submit} className="panel stack rise new-notebook">
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
        {notebooks !== undefined && notebooks.length === 0 && (
          <div className="panel empty-state rise">
            <ObjectArt name="open-book" alt="" size={132} />
            <p className="lead">{t.empty}</p>
          </div>
        )}
        <div className="nb-grid">
          {(notebooks ?? []).map((nb, i) => (
            <Link key={nb._id} to={`/n/${nb._id}`} className="nb-card lift rise" style={{ ["--i" as string]: i }}>
              <span className="ct-icon">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <b>{nb.title}</b>
              <small>{h.sources(nb.sourceCount)}</small>
              {nb.bought !== null && <span className="tag">{nb.bought.kind === "buy" ? copy.market.bought : nb.bought.kind === "rent" ? copy.market.rentedUntil(day(nb.bought.endsAt ?? 0)) : copy.market.rentalEnded}</span>}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
