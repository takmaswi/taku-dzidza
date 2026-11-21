import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { canStudyState } from "./access";
import { storedJoinCode, useClearStoredJoin, useFlagsLoaded } from "./classes/flags";
import { copy } from "./copy/en";
import { applyTheme } from "./theme";

const Landing = lazy(() => import("./pages/Landing"));
const SignIn = lazy(() => import("./pages/SignIn"));
const Setup = lazy(() => import("./pages/Setup"));
const Guardian = lazy(() => import("./pages/Guardian"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Home = lazy(() => import("./pages/Home"));
const Settings = lazy(() => import("./pages/Settings"));
const Notebook = lazy(() => import("./pages/Notebook"));
const Chat = lazy(() => import("./pages/Chat"));
const Notebooks = lazy(() => import("./pages/Notebooks"));
const Output = lazy(() => import("./pages/Output"));
const Review = lazy(() => import("./pages/Review"));
const GetHelp = lazy(() => import("./pages/GetHelp"));
const Consent = lazy(() => import("./pages/Consent"));
const Legal = lazy(() => import("./pages/Legal"));
const Teach = lazy(() => import("./pages/teach/Teach"));
const ClassPage = lazy(() => import("./pages/teach/ClassPage"));
const MarkSheet = lazy(() => import("./pages/teach/MarkSheet"));
const LearnerClass = lazy(() => import("./pages/classes/LearnerClass"));
const SharedOutput = lazy(() => import("./pages/classes/LearnerClass").then((m) => ({ default: m.SharedOutput })));
const ClassWork = lazy(() => import("./pages/classes/ClassWork"));
const Join = lazy(() => import("./pages/classes/Join"));
const JoinSignedOut = lazy(() => import("./pages/classes/Join").then((m) => ({ default: m.JoinSignedOut })));
const Family = lazy(() => import("./pages/classes/Family"));
const OrgPage = lazy(() => import("./orgs/OrgPage"));
const OwnerOrgs = lazy(() => import("./orgs/OwnerOrgs"));
const OrgAdmin = lazy(() => import("./orgs/OrgAdmin"));

/**
 * Takudzidza routes. Public: "/", "/signin", "/help", "/privacy", "/terms" and
 * "/consent/:token" (a guardian's page, opened on their own phone). Signed in learners move
 * through setup, guardian consent (under 18), the optional onboarding, then
 * the app.
 */
export default function App() {
  return (
    <Suspense fallback={<p className="app-loading">{copy.loading}</p>}>
      <Routes>
        <Route path="/help" element={<GetHelp />} />
        <Route path="/consent/:token" element={<Consent />} />
        <Route path="/privacy" element={<Legal page="privacy" />} />
        <Route path="/terms" element={<Legal page="terms" />} />
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
                  <Route path="/join/:code" element={<JoinSignedOut />} />
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
  useEffect(() => {
    applyTheme(profile);
  }, [profile]);
  useEffect(() => {
    if (me === null) void signOut();
  }, [me, signOut]);
  useEffect(() => {
    document.getElementById("prerender")?.remove();
  }, []);
  if (me === undefined || me === null) return <p className="app-loading">{copy.loading}</p>;
  if (profile === null) return <Setup />;
  if (!canStudyState(profile.consentState)) return <Guardian state={profile.consentState} />;
  if (!profile.styleChosen) return <Onboarding profile={profile} />;
  return <AppRoutes profile={profile} email={me.email} />;
}

function AppRoutes({ profile, email }: { profile: Doc<"profiles">; email: string }) {
  const flags = useFlagsLoaded();
  const { pathname } = useLocation();
  // With classes off there is no join page, so a waiting code is dropped.
  useClearStoredJoin(flags !== null && !flags.teacher);
  if (flags === null) return <p className="app-loading">{copy.loading}</p>;
  const joinCode = flags.teacher ? storedJoinCode() : null;
  const joinPath = joinCode === null ? null : `/join/${encodeURIComponent(joinCode)}`;
  if (joinPath !== null && pathname !== joinPath) return <Navigate to={joinPath} replace />;
  return (
    <Routes>
      <Route path="/" element={<Home profile={profile} />} />
      <Route path="/settings" element={<Settings profile={profile} email={email} />} />
      <Route path="/chat" element={<Chat profile={profile} />} />
      <Route path="/chat/:chatId" element={<Chat profile={profile} />} />
      <Route path="/notebooks" element={<Notebooks />} />
      <Route path="/n/:id" element={<Notebook profile={profile} />} />
      <Route path="/n/:id/o/:outputId" element={<Output profile={profile} />} />
      <Route path="/n/:id/review" element={<Review />} />
      {flags.teacher && (
        <>
          <Route path="/teach" element={<Teach />} />
          <Route path="/teach/:classId" element={<ClassPage />} />
          <Route path="/teach/:classId/a/:assignmentId" element={<MarkSheet />} />
          <Route path="/class/:classId" element={<LearnerClass />} />
          <Route path="/class/:classId/o/:outputId" element={<SharedOutput profile={profile} />} />
          <Route path="/class/:classId/a/:assignmentId" element={<ClassWork />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/family" element={<Family />} />
          <Route path="/org/:organisationId" element={<OrgPage />} />
          <Route path="/org/:organisationId/admin" element={<OrgAdmin />} />
          <Route path="/owner/organisations" element={<OwnerOrgs />} />
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
