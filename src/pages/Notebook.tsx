import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Eraser, FileText, LifeBuoy, MoreHorizontal, PanelLeftClose, PanelLeftOpen, PanelRightClose, Pencil, Shapes, Trash2 } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { BrandMark } from "../components/BrandMark";
import { AppShell } from "../components/Layout";
import { useMedia, useStored, WIDE, XWIDE } from "../components/hooks";
import { Menu, Sheet } from "../components/ui";
import { copy } from "../copy/en";
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
  const railOpen = railPref === null ? messages.length === 0 : railPref === "open";
  const hasSources = data.sources.length > 0;
  const toolsOpen = xwide ? (hasSources ? toolsPref !== "closed" : toolsWhileEmpty) : toolsOverlay;

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
    const file = e.dataTransfer.files?.[0];
    if (file !== undefined) void sources.upload(file);
  };

  const sourceList = (
    <SourceList notebookId={notebookId} list={data.sources} sources={sources} />
  );
  const studyPanel = <StudyPanel notebookId={notebookId} readAloud={profile.accessibility.readAloud} initialTool={initialTool} />;

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
                      <SourcePage citation={citation} />
                    </>
                  ) : (
                    <SourceList notebookId={notebookId} list={data.sources} sources={sources} forms={!empty} />
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

        <section className="ws-center">{empty ? <EmptyNotebook sources={sources} /> : <NotebookChat notebook={notebook} profile={profile} messages={messages} titles={titles} onCite={cite} />}</section>

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
          <SourcePage citation={citation} />
        </Sheet>
      )}
      {askedForTools && <ClearParams onDone={() => setParams({}, { replace: true })} />}
    </AppShell>
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
        <Link to="/help" className="pill ghost small">
          <LifeBuoy size={16} aria-hidden="true" /> {copy.menu.help}
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
            <button type="button" role="menuitem" onClick={() => (close(), void clearChat({ notebookId: notebook._id }))}>
              <Eraser size={16} aria-hidden="true" /> {t.clearChat}
            </button>
            {!wide && (
              <Link to="/help" role="menuitem" onClick={close}>
                <LifeBuoy size={16} aria-hidden="true" /> {copy.menu.help}
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
