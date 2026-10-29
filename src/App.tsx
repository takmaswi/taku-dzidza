import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { api } from "../convex/_generated/api";
import { canStudyState } from "./access";
import { copy } from "./copy/en";
import { applyTheme } from "./theme";

const Landing = lazy(() => import("./pages/Landing"));
const SignIn = lazy(() => import("./pages/SignIn"));
const Setup = lazy(() => import("./pages/Setup"));
const Guardian = lazy(() => import("./pages/Guardian"));
const StyleQuiz = lazy(() => import("./pages/StyleQuiz"));
const Home = lazy(() => import("./pages/Home"));
const Settings = lazy(() => import("./pages/Settings"));
const GetHelp = lazy(() => import("./pages/GetHelp"));
const Consent = lazy(() => import("./pages/Consent"));

/**
 * Takudzidza routes. Public: "/", "/signin", "/help" and "/consent/:token"
 * (a guardian's page, opened on their own phone). Signed in learners move
 * through setup, guardian consent (under 18), the optional style quiz, then
 * the app.
 */
export default function App() {
  return (
    <Suspense fallback={<p className="app-loading">{copy.loading}</p>}>
      <Routes>
        <Route path="/help" element={<GetHelp />} />
        <Route path="/consent/:token" element={<Consent />} />
        <Route
          path="*"
          element={
            <>
              <AuthLoading>
                <p className="app-loading">{copy.loading}</p>
              </AuthLoading>
              <Unauthenticated>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Unauthenticated>
              <Authenticated>
                <SignedIn />
              </Authenticated>
            </>
          }
        />
      </Routes>
    </Suspense>
  );
}

function SignedIn() {
  const me = useQuery(api.accounts.profiles.me);
  const { signOut } = useAuthActions();
  const profile = me?.profile ?? null;
  useEffect(() => applyTheme(profile), [profile]);
  useEffect(() => {
    if (me === null) void signOut();
  }, [me, signOut]);
  if (me === undefined || me === null) return <p className="app-loading">{copy.loading}</p>;
  if (profile === null) return <Setup />;
  if (!canStudyState(profile.consentState)) return <Guardian state={profile.consentState} />;
  if (!profile.styleChosen) return <StyleQuiz profile={profile} />;
  return (
    <Routes>
      <Route path="/" element={<Home profile={profile} />} />
      <Route path="/settings" element={<Settings profile={profile} email={me.email} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
