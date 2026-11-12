import { createContext } from "react";

/**
 * True inside the signed in app: AppShell once the learner is set up, and
 * every FocusShell. People (Cutout, Scene) belong to Landing, SignIn and
 * Setup only, so src/components/Art.tsx draws nothing when this is true.
 * Inside the app, objects (src/components/ObjectArt.tsx) carry the warmth.
 */
export const SignedInContext = createContext(false);
