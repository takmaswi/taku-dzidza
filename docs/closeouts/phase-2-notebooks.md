# Phase 2 closeout: notebooks

Date: 29 October 2026. Scope: SPEC.md section 8, Phase 2.

## Built
- Notebooks: create, list on the dashboard, rename, delete (with sources, pages, chunks, files and chat), clear chat.
- Sources: upload a PDF, Word file or photo (up to 15 MB), paste text, add a web link. Reading status shows on each source; failures say why in plain words.
- Reading: text, links, Word files and text PDFs with no AI call; photos and scanned PDFs through the model (mock fixtures in tests).
- Search: Convex full text search over page chunks, per notebook.
- Ask Taku: answers in parts, each cited to a source and page with a quote; the server checks every quote on its page. Source mode toggle (Only my material, My material plus Taku's ideas) and answer mode toggle (Show me the answer, Guide me) on the notebook screen. Tapping a citation opens the page with the quote highlighted.
- Safety on questions: prefilter for everyone, model input check for under 18s, Get help on distress, redirects for companion and off limits requests.
- Account deletion now deletes notebooks too.

## Checks (mock mode, no AI spend)
- `pnpm lint` and `pnpm typecheck`: clean.
- `pnpm test`: 82 passed (adds quote check, source modes, pages and chunks, links, PDF text layer, notebook ownership, consent gate, deletion, and asking Taku in both modes, Guide me, distress, companion, under 18 input check, empty notebook).
- `pnpm build`: passes.
- `pnpm e2e`: 8 passed on phone and desktop, including a notebook journey that pastes notes, uploads a real PDF read by the local backend, asks Taku, opens the citation and checks Only my material.

## Not done here
- No live AI calls yet. The first live check needs Takunda's go ahead and a stated spending cap (OpenRouter budget is limited).
- No deploy yet.
- Embeddings (D8) deferred; full text search covers Phase 2.
