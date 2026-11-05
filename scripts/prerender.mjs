// After vite build: writes the landing page's HTML into dist/index.html, so
// crawlers and link previews read the copy without running JavaScript. People
// see it at once too; the app removes it when it starts (src/pages/Landing.tsx,
// src/App.tsx). A small script hides it on every other address and for anyone
// with a saved session, so nobody signed in sees the landing page flash.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const OUT = ".prerender";
await build({
  configFile: false,
  logLevel: "error",
  plugins: [react()],
  build: { ssr: "src/prerender.tsx", outDir: OUT, emptyOutDir: true, rollupOptions: { output: { entryFileNames: "prerender.mjs" } } },
});
const { renderLanding } = await import(pathToFileURL(join(process.cwd(), OUT, "prerender.mjs")).href);
const html = renderLanding();
rmSync(OUT, { recursive: true, force: true });

const hide = `<script>(function(){var saved=false;try{saved=Object.keys(localStorage).some(function(k){return k.indexOf("__convexAuth")===0})}catch(e){}if(saved||location.pathname!=="/"){document.getElementById("prerender").remove()}})()</script>`;
const noScript = `<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>`;
const path = join("dist", "index.html");
const page = readFileSync(path, "utf8");
if (!page.includes('<div id="root"></div>')) throw new Error("prerender: dist/index.html has no root element.");
const next = page.replace('<div id="root"></div>', () => `<div id="prerender">${html}</div>${hide}${noScript}<div id="root"></div>`);
writeFileSync(path, next, "utf8");

// A build that lost the copy must fail, not ship an empty page to crawlers.
for (const words of ["Your notes in. Exam ready out.", "every answer shows the page it came from"]) {
  if (!next.includes(words)) throw new Error(`prerender: "${words}" is missing from dist/index.html.`);
}
console.log(`prerender: landing copy written to dist/index.html (${Math.round(html.length / 1024)} KB).`);
