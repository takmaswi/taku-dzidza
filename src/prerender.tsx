import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import Landing from "./pages/Landing";

/** The landing page as plain HTML, so crawlers and link previews read the copy with no JavaScript. Used by scripts/prerender.mjs. */
export function renderLanding(): string {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <Landing />
    </StaticRouter>,
  );
}
