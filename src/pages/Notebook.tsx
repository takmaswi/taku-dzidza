import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Eraser, FileText, Mail, MoreHorizontal, PanelLeftClose, PanelLeftOpen, PanelRightClose, Pencil, Shapes, Trash2 } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { BrandMark } from "../components/BrandMark";
import { AppShell } from "../components/Layout";
import { useMedia, useStored, WIDE, XWIDE } from "../components/hooks";
import { useSprinting, useStudyMode } from "../components/studySession";
import { Menu, Sheet } from "../components/ui";
import { copy } from "../copy/en";
import { day } from "../market/format";
import { EmptyNotebook } from "./notebook/EmptyNotebook";
import { NotebookChat, type Citation } from "./notebook/NotebookChat";
import { SourcePage } from "./notebook/SourcePage";
import { BackToSources, SourceList } from "./notebook/sources";
import { StudyPanel } from "./notebook/StudyPanel";
import { toolFromParam } from "./notebook/tools";
import { useSources } from "./notebook/useSources";

/**
 * One notebook as a workspace (SPEC.md 3.2). Wide screens: sources rail,
 * the chat at reading width, and the Study tools panel. Phones: chat first,
 * with sources and tools in sheets. The shell never scrolls; each pane does.
 */
export default function Notebook({ profile }: { profile: Doc<"profiles"> }) {
  const { id = "" } = useParams();
  const notebookId = id as Id<"notebooks">;
  const data = useQuery(api.notebooks.notebooks.get, { notebookId });
  // A course pack copy brings its review cards up to a newer version when it opens.
  const syncPack = useMutation(api.packs.packs.sync);
  const stale = data?.pack?.stale === true || data?.bought?.stale === true;
  useEffect(() => {
    if (stale) void syncPack({ notebookId });
  }, [stale, notebookId, syncPack]);
  const sources = useSources(notebookId);
  const wide = useMedia(WIDE);
  const xwide = useMedia(XWIDE);
  const [params, setParams] = useSearchParams();
  const [citation, setCitation] = useState<Citation | null>(null);
  const [sheet, setSheet] = useState<"sources" | "tools" | "page" | null>(null);
  const [railPref, setRail] = useStored(`tz.rail.${id}`);
  const [toolsPref, setToolsPref] = useStored("tz.tools");
  const [toolsOverlay, setToolsOverlay] = useState(false);
  // With no source yet the tools have nothing to work on, so the panel stays folded unless opened here.
  const [toolsWhileEmpty, setToolsWhileEmpty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [studyMode, setStudyMode] = useStudyMode(profile);
  const sprinting = useSprinting(studyMode);
  // Read once: the address is cleared after the tools open.
  const [initialTool] = useState(() => toolFromParam(params.get("tool")));
  const askedForTools = params.get("tab") === "tools";

  // Links from home (?tab=tools&tool=cards) open the Study tools wherever they live on this screen.
  useEffect(() => {
    if (!askedForTools) return;
    if (!wide) setSheet("tools");
    else if (!xwide) setToolsOverlay(true);
    else {
      setToolsPref("open");
      setToolsWhileEmpty(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askedForTools]);

  if (data === undefined) {
    return (
      <AppShell scroll="panes" title={copy.loading}>
        <p className="app-loading">{copy.loading}</p>
      </AppShell>
    );
  }

  const { notebook, messages } = data;
  const titles = new Map(data.sources.map((s) => [s._id as string, s.title]));
  const empty = data.sources.length === 0 && messages.length === 0;
  // Open while there are no answers yet, folded once the learner is chatting, unless they chose.
  // A sprint folds both side panels, without changing what the learner chose for them.
  const railOpen = !sprinting && (railPref === null ? messages.length === 0 : railPref === "open");
  const hasSources = data.sources.length > 0;
  const toolsOpen = !sprinting && (xwide ? (hasSources ? toolsPref !== "closed" : toolsWhileEmpty) : toolsOverlay);

  const cite = (c: Citation) => {
    setCitation(c);
    if (wide) setRail("open");
    else setSheet("page");
  };
  const toggleTools = () => {
    if (!wide) setSheet("tools");
    else if (xwide && !hasSources) setToolsWhileEmpty(!toolsOpen);
    else if (xwide) setToolsPref(toolsOpen ? "closed" : "open");
    else setToolsOverlay(!toolsOverlay);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void sources.uploadAll([...(e.dataTransfer.files ?? [])]);
  };

  const bought = data.bought;
  const packLine =
    bought !== null ? (
      <BoughtLine bought={bought} />
    ) : data.pack === null ? undefined : (
      <p className="pack-line" data-testid="pack-line">
        {copy.packs.fromPack(data.pack.organisation, data.pack.title)}
      </p>
    );
  // Bought or rented notes: the view only reader, marked with the buyer's name and email.
  const watermark = bought !== null && bought.access !== "ended" ? bought.watermark : undefined;
  const read = watermark === undefined ? undefined : (sourceId: Id<"sources">) => cite({ sourceId, page: 1, quote: "" });
  const turn = watermark === undefined || citation === null ? undefined : (page: number) => setCitation({ ...citation, page, quote: "" });
  const sourceList = (
    <SourceList notebookId={notebookId} list={data.sources} sources={sources} header={packLine} onRead={read} />
  );
  const studyPanel = <StudyPanel notebookId={notebookId} sources={data.sources} readAloud={profile.accessibility.readAloud} initialTool={initialTool} />;

  return (
    <AppShell scroll="panes" tabs={false} bar={<NotebookBar notebook={notebook} count={data.sources.length} wide={wide} railOpen={railOpen} toolsOpen={toolsOpen} onSources={() => (wide ? setRail(railOpen ? "folded" : "open") : setSheet("sources"))} onTools={toggleTools} />}>
      {sources.inputs}
      <div
        className={`workspace${railOpen ? " rail-open" : " rail-folded"}${toolsOpen ? " tools-open" : ""}${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={onDrop}
      >
        {wide && (
          <aside className="sources-rail" aria-label={copy.notebook.sourcesTitle} data-testid="sources-rail" data-state={railOpen ? "open" : "folded"}>
            {railOpen ? (
              <>
                <div className="rail-head">
                  <h2>{copy.notebook.sourcesTitle}</h2>
                  <button type="button" className="icon-button" aria-label={copy.notebook.foldSources} title={copy.notebook.foldSources} onClick={() => setRail("folded")}>
                    <PanelLeftClose size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="rail-body">
                  {citation !== null ? (
                    <>
                      <BackToSources onBack={() => setCitation(null)} />
                      <SourcePage citation={citation} watermark={watermark} onPage={turn} />
                    </>
                  ) : (
                    <SourceList notebookId={notebookId} list={data.sources} sources={sources} forms={!empty} header={packLine} onRead={read} />
                  )}
                </div>
              </>
            ) : (
              <button type="button" className="rail-strip" aria-label={copy.notebook.openSources(data.sources.length)} onClick={() => setRail("open")}>
                <PanelLeftOpen size={18} aria-hidden="true" />
                <FileText size={18} aria-hidden="true" />
                <span className="strip-count">{data.sources.length}</span>
              </button>
            )}
          </aside>
        )}

        <section className="ws-center">{bought?.access === "ended" && <div className="ended-banner"><BoughtLine bought={bought} /></div>}{empty ? <EmptyNotebook sources={sources} /> : <NotebookChat notebook={notebook} profile={profile} messages={messages} titles={titles} onCite={cite} studyMode={studyMode} onStudyMode={setStudyMode} />}</section>

        {wide && toolsOpen && (
          <>
            {!xwide && <div className="scrim tools-scrim" onClick={() => setToolsOverlay(false)} />}
            <aside className="study-panel" aria-label={copy.tools.tabTools} data-testid="study-panel">
              <div className="rail-head">
                <h2>{copy.tools.tabTools}</h2>
                <button type="button" className="icon-button" aria-label={copy.tools.closeTools} title={copy.tools.closeTools} onClick={toggleTools}>
                  <PanelRightClose size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="rail-body">{studyPanel}</div>
            </aside>
          </>
        )}
        {dragging && <div className="drop-overlay">{copy.notebook.dropHere}</div>}
      </div>

      {sheet === "sources" && (
        <Sheet title={copy.notebook.sourcesTitle} onClose={() => setSheet(null)}>
          {sourceList}
        </Sheet>
      )}
      {sheet === "tools" && (
        <Sheet title={copy.tools.tabTools} onClose={() => setSheet(null)}>
          {studyPanel}
        </Sheet>
      )}
      {sheet === "page" && citation !== null && (
        <Sheet title={copy.notebook.sourcesTitle} onClose={() => setSheet(null)}>
          <SourcePage citation={citation} watermark={watermark} onPage={turn} />
        </Sheet>
      )}
      {askedForTools && <ClearParams onDone={() => setParams({}, { replace: true })} />}
    </AppShell>
  );
}

/** A bought or rented notebook: "Bought", "Rented until <date>", or ended with a way to renew; and the practice paper's author. */
function BoughtLine({ bought }: { bought: NonNullable<FunctionReturnType<typeof api.notebooks.notebooks.get>["bought"]> }) {
  const t = copy.market;
  return (
    <div className="pack-line stack-tight" data-testid="bought-line">
      <span>
        <b>{bought.access === "bought" ? t.bought : bought.access === "rented" ? t.rentedUntil(day(bought.endsAt ?? 0)) : t.rentalEnded}</b> {t.by(bought.author)}
      </span>
      <small className="soft">{bought.paperLabel}</small>
      {bought.access === "ended" && (
        <Link to={`/market/l/${bought.listingId}`} className="pill small">
          {t.renew}
        </Link>
      )}
    </div>
  );
}

/** Once the tools have opened from a link, the address drops the ?tab so a reload does not reopen them. */
function ClearParams({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    onDone();
  }, [onDone]);
  return null;
}

function NotebookBar({ notebook, count, wide, railOpen, toolsOpen, onSources, onTools }: { notebook: Doc<"notebooks">; count: number; wide: boolean; railOpen: boolean; toolsOpen: boolean; onSources: () => void; onTools: () => void }) {
  const t = copy.notebook;
  const rename = useMutation(api.notebooks.notebooks.rename);
  const clearChat = useMutation(api.notebooks.notebooks.clearChat);
  // A long chat is cleared a batch at a time.
  const clearAll = async () => {
    for (let i = 0; i < 50; i++) if (!(await clearChat({ notebookId: notebook._id })).more) return;
  };
  const remove = useMutation(api.notebooks.notebooks.remove);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(notebook.title);

  const save = () => {
    setEditing(false);
    const next = name.trim();
    if (next !== "" && next !== notebook.title) void rename({ notebookId: notebook._id, title: next });
    else setName(notebook.title);
  };

  return (
    <>
      {!wide && (
        <Link to="/" className="topbar-mark" aria-label={`${copy.appName}, ${copy.nav.home}`}>
          <BrandMark />
        </Link>
      )}
      {wide && (
        <>
          <Link to="/notebooks" className="crumb">
            {copy.nav.notebooks}
          </Link>
          <ChevronRight size={16} aria-hidden="true" className="crumb-sep" />
        </>
      )}
      {editing ? (
        <input
          className="nb-name-input"
          aria-label={t.nameLabel}
          value={name}
          autoFocus
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setName(notebook.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <h1 className="nb-name">
          <button type="button" title={t.renameHint} onClick={() => (setName(notebook.title), setEditing(true))}>
            {notebook.title}
          </button>
        </h1>
      )}
      <button type="button" className="chip count-chip" aria-expanded={wide ? railOpen : undefined} onClick={onSources}>
        <FileText size={15} aria-hidden="true" /> <span className="count-label">{t.sourcesChip(count)}</span>
        <span className="count-num" aria-hidden="true">
          {count}
        </span>
      </button>
      <span className="spacer" />
      {wide && (
        <Link to="/contact" className="pill ghost small">
          <Mail size={16} aria-hidden="true" /> {copy.menu.help}
        </Link>
      )}
      <button type="button" className={`pill small tools-toggle${toolsOpen ? " on" : ""}`} aria-expanded={toolsOpen} aria-label={copy.tools.tabTools} onClick={onTools}>
        <Shapes size={16} aria-hidden="true" />
        <span className="hide-narrow">{copy.tools.tabTools}</span>
      </button>
      <Menu
        label={t.more}
        align="end"
        button={
          <span className="icon-button">
            <MoreHorizontal size={20} aria-hidden="true" />
          </span>
        }
      >
        {(close) => (
          <>
            <button type="button" role="menuitem" onClick={() => (close(), setName(notebook.title), setEditing(true))}>
              <Pencil size={16} aria-hidden="true" /> {t.rename}
            </button>
            <button type="button" role="menuitem" onClick={() => (close(), void clearAll())}>
              <Eraser size={16} aria-hidden="true" /> {t.clearChat}
            </button>
            {!wide && (
              <Link to="/contact" role="menuitem" onClick={close}>
                <Mail size={16} aria-hidden="true" /> {copy.menu.help}
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              className="danger-item"
              onClick={() => {
                close();
                if (window.confirm(t.deleteConfirm)) void remove({ notebookId: notebook._id }).then(() => navigate("/notebooks"));
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> {t.deleteNotebook}
            </button>
          </>
        )}
      </Menu>
    </>
  );
}
