import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./styles/app.css";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = url ? new ConvexReactClient(url) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convex === null ? (
      <p style={{ padding: 24 }}>This build has no backend address. Set VITE_CONVEX_URL and rebuild.</p>
    ) : (
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    )}
  </StrictMode>,
);
