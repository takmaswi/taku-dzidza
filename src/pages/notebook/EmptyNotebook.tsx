import { useMutation } from "convex/react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Scene } from "../../components/Art";
import { copy } from "../../copy/en";
import { AddForms } from "./sources";
import { ADD_ICONS, type Sources } from "./useSources";

/** A notebook with nothing in it yet: adding sources takes the whole centre. */
export function EmptyNotebook({ sources }: { sources: Sources }) {
  const t = copy.notebook;
  const createSample = useMutation(api.notebooks.sample.create);
  const navigate = useNavigate();
  return (
    <div className="empty-nb">
      <div className="empty-nb-inner">
        <div className="empty-nb-head">
          <div>
            <h2>{t.emptyTitle}</h2>
            <p className="soft">{t.emptyLead}</p>
          </div>
          <Scene slug="empty-notebook" alt={t.emptyAlt} sizes="(min-width: 900px) 320px, 60vw" className="empty-nb-scene" />
        </div>
        <div className="add-tiles">
          {(["upload", "snap", "paste", "link"] as const).map((kind, i) => {
            const Icon = ADD_ICONS[kind];
            return (
              <button key={kind} type="button" className="add-tile lift rise" style={{ ["--i" as string]: i }} aria-pressed={sources.form === kind} disabled={sources.busy} onClick={() => sources.start(kind)}>
                <span className="ct-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <b>{t.add[kind].title}</b>
                <span>{t.add[kind].line}</span>
              </button>
            );
          })}
        </div>
        <AddForms sources={sources} />
        <p className="soft small-text drop-hint">{t.dropHint}</p>
        <button type="button" className="sample-offer" onClick={() => void createSample({}).then((id) => navigate(`/n/${id}`))}>
          <Sparkles size={18} aria-hidden="true" />
          <span>
            <b>{copy.home.tiles.sample.title}</b>
            <small>{copy.home.tiles.sample.body}</small>
          </span>
        </button>
      </div>
    </div>
  );
}
