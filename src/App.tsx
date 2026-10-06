import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Award,
  CheckCircle2,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";

type View =
  | "Dashboard"
  | "Connections"
  | "Projects"
  | "Achievements"
  | "Portfolio"
  | "Settings";

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Portfolio", icon: UserRound },
  { label: "Connections", icon: Users },
  { label: "Projects", icon: FolderGit2 },
  { label: "Achievements", icon: Award },
  { label: "Settings", icon: Settings },
];

const API_URL =
  import.meta.env.VITE_CAREERSYNC_API_URL as string;

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  default_branch: string;
  updated_at: string;
  pushed_at: string | null;
};

type GitHubConnection = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  connectedAt?: unknown;
};

type PortfolioMode = "manual" | "smart" | "autopilot";

type CareerEvidence = {
  id: string;
  source: "github";
  type: "project";
  status: "pending" | "approved" | "ignored" | "published";
  decision: "manual_review" | "auto_publish" | "needs_attention";
  confidence: number;
  title: string;
  description: string;
  technologies: string[];
  sourceUrl: string;
  repositoryId: number;
  repositoryName: string;
  updatedAt: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [githubConnection, setGithubConnection] =
    useState<GitHubConnection | null>(null);
  const [githubConnecting, setGithubConnecting] =
    useState(false);
  const [githubError, setGithubError] =
    useState("");
  const [githubRepositories, setGithubRepositories] =
    useState<GitHubRepository[]>([]);
  const [githubReposLoading, setGithubReposLoading] =
    useState(false);
  const [githubReposError, setGithubReposError] =
    useState("");
  const [careerEvidence, setCareerEvidence] =
    useState<CareerEvidence[]>([]);
  const [portfolioMode, setPortfolioMode] =
    useState<PortfolioMode>("smart");
    const onSetPortfolioMode = async (mode: PortfolioMode) => {
  if (!user) return;

  setPortfolioMode(mode);

  await setDoc(
    doc(db, "users", user.uid),
    {
      portfolioMode: mode,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
  const [evidenceGenerating, setEvidenceGenerating] =
    useState(false);
  const [evidenceError, setEvidenceError] =
    useState("");

  const buildEvidenceFromRepositories = async (repositories: GitHubRepository[], existingEvidenceOverride?: CareerEvidence[]) => {
    if (!user) return;

    try {
      setEvidenceGenerating(true);
      setEvidenceError("");

      const existingEvidence = existingEvidenceOverride ?? careerEvidence;
      const existingByRepository = new Map<number, CareerEvidence>(
        existingEvidence.map((item) => [item.repositoryId, item]),
      );

      const discovered: CareerEvidence[] = repositories
        .filter((repo) => !repo.fork)
        .map((repo) => {
          const existing = existingByRepository.get(repo.id);
          const technologies = [
            repo.language,
            ...repo.topics,
          ].filter((value): value is string => Boolean(value));

          return {
            id: existing?.id ?? `github-project-${repo.id}`,
            source: "github",
            type: "project",
            status: existing?.status ?? (portfolioMode === "autopilot" ? "published" : portfolioMode === "smart" && (repo.description || repo.language || repo.topics.length > 0) ? "published" : "pending"),
            decision: existing?.decision ?? (portfolioMode === "autopilot" ? "auto_publish" : portfolioMode === "smart" && (repo.description || repo.language || repo.topics.length > 0) ? "auto_publish" : "manual_review"),
            confidence: existing?.confidence ?? Math.min(0.98, 0.55 + (repo.description ? 0.15 : 0) + (repo.language ? 0.15 : 0) + Math.min(repo.topics.length, 3) * 0.04),
            title: repo.name,
            description:
              repo.description?.trim() ||
              `A project discovered from the GitHub repository ${repo.full_name}.`,
            technologies: Array.from(new Set(technologies)),
            sourceUrl: repo.html_url,
            repositoryId: repo.id,
            repositoryName: repo.full_name,
            updatedAt: repo.updated_at,
          };
        });

      await setDoc(
        doc(db, "users", user.uid),
        {
          careerEvidence: discovered,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setCareerEvidence(discovered);
    } catch (error) {
      console.error("Career evidence generation error:", error);
      setEvidenceError(
        error instanceof Error
          ? error.message
          : "Unable to generate career evidence.",
      );
    } finally {
      setEvidenceGenerating(false);
    }
  };

  const loadGitHubRepositories = async (existingEvidenceOverride?: CareerEvidence[]) => {
    if (!user || !API_URL || githubReposLoading) {
      return;
    }

    try {
      setGithubReposLoading(true);
      setGithubReposError("");

      const idToken = await user.getIdToken();
      const response = await fetch(`${API_URL}/github/repos`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = (await response.json()) as {
        repositories?: GitHubRepository[];
        error?: string;
      };

      if (!response.ok || !data.repositories) {
        throw new Error(
          data.error ?? "Unable to load GitHub repositories.",
        );
      }

      setGithubRepositories(data.repositories);
      await buildEvidenceFromRepositories(data.repositories, existingEvidenceOverride);
    } catch (error) {
      console.error("GitHub repositories error:", error);
      setGithubReposError(
        error instanceof Error
          ? error.message
          : "Unable to load GitHub repositories.",
      );
    } finally {
      setGithubReposLoading(false);
    }
  };

  const loadGitHubRepositoriesRef = useRef(loadGitHubRepositories);
  useEffect(() => {
    loadGitHubRepositoriesRef.current = loadGitHubRepositories;
  });

  const approveEvidence = async (evidenceId: string) => {
    if (!user) return;

    const updated = careerEvidence.map((item) =>
      item.id === evidenceId
        ? { ...item, status: "approved" as const }
        : item,
    );

    await setDoc(
      doc(db, "users", user.uid),
      { careerEvidence: updated, updatedAt: serverTimestamp() },
      { merge: true },
    );
    setCareerEvidence(updated);
  };

  const ignoreEvidence = async (evidenceId: string) => {
    if (!user) return;

    const updated = careerEvidence.map((item) =>
      item.id === evidenceId
        ? { ...item, status: "ignored" as const }
        : item,
    );

    await setDoc(
      doc(db, "users", user.uid),
      { careerEvidence: updated, updatedAt: serverTimestamp() },
      { merge: true },
    );
    setCareerEvidence(updated);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const loadAndCompleteGitHubConnection = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        const savedGitHub =
          userSnapshot.data()?.github as
            | GitHubConnection
            | undefined;

        if (savedGitHub) {
          setGithubConnection(savedGitHub);
        }

        const savedEvidence = userSnapshot.data()?.careerEvidence as
          | CareerEvidence[]
          | undefined;
        setCareerEvidence(savedEvidence ?? []);

        const savedPortfolioMode = userSnapshot.data()?.portfolioMode as
          | PortfolioMode
          | undefined;
        setPortfolioMode(savedPortfolioMode ?? "smart");

        const isGitHubCallback =
          window.location.pathname === "/github/callback";

        if (!isGitHubCallback) {
          return;
        }

        const completionCode =
          new URLSearchParams(
            window.location.search,
          ).get("code");

        if (!completionCode) {
          setGithubError(
            "GitHub returned without a completion code.",
          );
          window.history.replaceState(
            {},
            "",
            "/",
          );
          return;
        }

        setGithubConnecting(true);
        setGithubError("");

        const idToken =
          await user.getIdToken();

        const response = await fetch(
          `${API_URL}/github/complete`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${idToken}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              code: completionCode,
            }),
          },
        );

        const data =
          (await response.json()) as {
            connected?: boolean;
            github?: GitHubConnection;
            error?: string;
          };

        if (!response.ok || !data.connected || !data.github) {
          throw new Error(
            data.error ??
              "Unable to complete GitHub connection.",
          );
        }

        await setDoc(
          userRef,
          {
            github: {
              ...data.github,
              connectedAt:
                serverTimestamp(),
            },
            updatedAt:
              serverTimestamp(),
          },
          { merge: true },
        );

        setGithubConnection(data.github);
        await loadGitHubRepositoriesRef.current(savedEvidence ?? []);
        setActiveView("Connections");

        window.history.replaceState(
          {},
          "",
          "/",
        );
      } catch (error) {
        console.error(
          "GitHub connection completion error:",
          error,
        );

        setGithubError(
          error instanceof Error
            ? error.message
            : "Unable to complete GitHub connection.",
        );

        window.history.replaceState(
          {},
          "",
          "/",
        );
      } finally {
        setGithubConnecting(false);
      }
    };

    void loadAndCompleteGitHubConnection();
  }, [user, authLoading]);

  const handleGoogleSignIn = async () => {
    try {
      const provider =
        new GoogleAuthProvider();

      const result =
        await signInWithPopup(
          auth,
          provider,
        );

      const signedInUser =
        result.user;

      const userRef = doc(
        db,
        "users",
        signedInUser.uid,
      );

      const userSnapshot =
        await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await setDoc(userRef, {
          uid: signedInUser.uid,
          displayName:
            signedInUser.displayName ?? "",
          email:
            signedInUser.email ?? "",
          photoURL:
            signedInUser.photoURL ?? "",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        });
      } else {
        await setDoc(
          userRef,
          {
            displayName:
              signedInUser.displayName ?? "",
            email:
              signedInUser.email ?? "",
            photoURL:
              signedInUser.photoURL ?? "",
            updatedAt:
              serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch (error) {
      console.error(
        "Google Sign-In Error:",
        error,
      );
    }
  };

  const handleConnectGitHub = async () => {
    if (!user || githubConnecting) {
      return;
    }

    if (!API_URL) {
      setGithubError(
        "CareerSync API URL is not configured.",
      );
      return;
    }

    try {
      setGithubConnecting(true);
      setGithubError("");

      const idToken =
        await user.getIdToken();

      const response = await fetch(
        `${API_URL}/github/login`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${idToken}`,
            "Content-Type":
              "application/json",
          },
        },
      );

      const data =
        (await response.json()) as {
          authorizationUrl?: string;
          error?: string;
        };

      if (!response.ok || !data.authorizationUrl) {
        throw new Error(
          data.error ??
            "Unable to start GitHub connection.",
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (error) {
      console.error(
        "GitHub connection error:",
        error,
      );

      setGithubError(
        error instanceof Error
          ? error.message
          : "Unable to connect GitHub.",
      );

      setGithubConnecting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGithubConnection(null);
      setGithubError("");
      setActiveView("Dashboard");
    } catch (error) {
      console.error(
        "Sign-out error:",
        error,
      );
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] text-white">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Loading CareerSync...
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onSignOut={handleSignOut}
        githubConnection={githubConnection}
        githubConnecting={githubConnecting}
        githubError={githubError}
        onConnectGitHub={handleConnectGitHub}
        githubRepositories={githubRepositories}
        githubReposLoading={githubReposLoading}
        githubReposError={githubReposError}
        onLoadGitHubRepositories={loadGitHubRepositories}
        careerEvidence={careerEvidence}
                portfolioMode={portfolioMode}
                onSetPortfolioMode={onSetPortfolioMode}
        evidenceGenerating={evidenceGenerating}
        evidenceError={evidenceError}
        onApproveEvidence={approveEvidence}
        onIgnoreEvidence={ignoreEvidence}
      />
    );
  }

  return (
    <LandingPage
      onSignIn={handleGoogleSignIn}
    />
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
        <Sparkles size={18} />
      </div>
      <span className="text-lg font-semibold tracking-tight">CareerSync</span>
    </div>
  );
}

function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Brand />

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#connect" className="transition hover:text-white">
              Integrations
            </a>
          </div>

          <button
            onClick={onSignIn}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Sign in
          </button>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.09),transparent_35%)]" />

          <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-28 text-center md:pt-36">
            <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">
              <Sparkles size={14} />
              Your career, automatically documented
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-7xl">
              Your portfolio should
              <span className="block text-white/40">update itself.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/50">
              Connect GitHub, LinkedIn, LeetCode and the rest of your
              professional identity. CareerSync turns your achievements into
              a living portfolio.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={onSignIn}
                className="group flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-black transition hover:bg-white/90"
              >
                Create your portfolio
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              </button>

              <a
                href="#how-it-works"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-medium text-white transition hover:bg-white/[0.07]"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="ml-4 flex-1 rounded-md bg-white/[0.04] px-4 py-1.5 text-left text-xs text-white/30">
                yourname.careersync.app
              </div>
            </div>

            <div className="grid md:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-white/10 p-5 md:block">
                <div className="mb-8 flex items-center gap-2 text-sm font-medium">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
                    <Sparkles size={14} />
                  </div>
                  CareerSync
                </div>

                <div className="space-y-1 text-sm">
                  {navItems.map((item, index) => (
                    <div
                      key={item.label}
                      className={`rounded-lg px-3 py-2 ${
                        index === 0
                          ? "bg-white/10 text-white"
                          : "text-white/40"
                      }`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="p-6 md:p-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-white/40">Dashboard</p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      Your career at a glance
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Sources ready to sync
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Projects", "—"],
                    ["Skills", "—"],
                    ["Achievements", "—"],
                    ["Connections", "1"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <p className="text-xs text-white/40">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 p-5">
                    <h3 className="font-medium">Recent activity</h3>
                    <p className="mt-3 text-sm leading-6 text-white/40">
                      Once you connect your professional platforms, CareerSync
                      will start building your career timeline.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 p-5">
                    <h3 className="font-medium">Connected accounts</h3>
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3">
                        <div className="flex items-center gap-3">
                          <FaGithub size={17} />
                          <span className="text-sm">GitHub</span>
                        </div>
                        <span className="text-xs text-white/30">
                          Connect next
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3">
                        <div className="flex items-center gap-3">
                          <FaLinkedin size={17} />
                          <span className="text-sm">LinkedIn</span>
                        </div>
                        <span className="text-xs text-white/30">
                          Coming soon
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-white/10 bg-white/[0.015]"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <p className="text-sm text-white/40">HOW IT WORKS</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Connect once.
                <br />
                Keep growing.
              </h2>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {[
                [
                  "01",
                  "Connect",
                  "Link the platforms where your professional work already exists.",
                ],
                [
                  "02",
                  "Discover",
                  "CareerSync detects projects, achievements and career activity.",
                ],
                [
                  "03",
                  "Publish",
                  "Review what matters and let your portfolio update itself.",
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl border border-white/10 p-6"
                >
                  <span className="text-xs text-white/30">{number}</span>
                  <h3 className="mt-8 text-xl font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/40">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 CareerSync</span>
          <span>Your career, automatically documented.</span>
        </footer>
      </main>
    </div>
  );
}

function Dashboard({
  user,
  activeView,
  setActiveView,
  mobileMenuOpen,
  setMobileMenuOpen,
  onSignOut,
  githubConnection,
  githubConnecting,
  githubError,
  onConnectGitHub,
  githubRepositories,
  githubReposLoading,
  githubReposError,
  onLoadGitHubRepositories,
  careerEvidence,
  portfolioMode,
  onSetPortfolioMode,
  evidenceGenerating,
  evidenceError,
  onApproveEvidence,
  onIgnoreEvidence,
}: {
  user: User;
  activeView: View;
  setActiveView: (view: View) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onSignOut: () => Promise<void>;
  githubConnection: GitHubConnection | null;
  githubConnecting: boolean;
  githubError: string;
  onConnectGitHub: () => Promise<void>;
  githubRepositories: GitHubRepository[];
  githubReposLoading: boolean;
  githubReposError: string;
  onLoadGitHubRepositories: () => Promise<void>;
  careerEvidence: CareerEvidence[];
  portfolioMode: PortfolioMode;
  onSetPortfolioMode: (mode: PortfolioMode) => Promise<void>;
  evidenceGenerating: boolean;
  evidenceError: string;
  onApproveEvidence: (evidenceId: string) => Promise<void>;
  onIgnoreEvidence: (evidenceId: string) => Promise<void>;
}) {
  const firstName =
    user.displayName?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  const initials =
    user.displayName
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const selectView = (view: View) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#090909] lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-5">
            <Brand />
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => selectView(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  activeView === label
                    ? "bg-white text-black"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 transition hover:bg-white/[0.05] hover:text-white"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
            <div className="h-full w-72 border-r border-white/10 bg-[#090909] p-5">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-8 space-y-1">
                {navItems.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => selectView(label)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      activeView === label
                        ? "bg-white text-black"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-xs text-white/35">CareerSync</p>
                <h1 className="text-sm font-medium">{activeView}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="max-w-48 truncate text-xs text-white/35">
                  {user.email}
                </p>
              </div>

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Profile"}
                  className="h-9 w-9 rounded-full border border-white/10"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                  {initials}
                </div>
              )}
            </div>
          </header>

          <main className="mx-auto max-w-7xl p-5 md:p-8">
            {activeView === "Dashboard" && (
              <DashboardHome
                firstName={firstName}
                user={user}
                setActiveView={setActiveView}
                githubConnection={githubConnection}
                githubConnecting={githubConnecting}
                githubError={githubError}
                onConnectGitHub={onConnectGitHub}
              />
            )}

            {activeView === "Connections" && (
              <Connections
                githubConnection={githubConnection}
                githubConnecting={githubConnecting}
                githubError={githubError}
                onConnectGitHub={onConnectGitHub}
              />
            )}

            {activeView === "Projects" && (
              <ProjectsSection
                githubConnection={githubConnection}
                githubRepositories={githubRepositories}
                githubReposLoading={githubReposLoading}
                githubReposError={githubReposError}
                onLoadGitHubRepositories={onLoadGitHubRepositories}
                onConnectGitHub={onConnectGitHub}
                githubConnecting={githubConnecting}
                careerEvidence={careerEvidence}
                portfolioMode={portfolioMode}
                onSetPortfolioMode={onSetPortfolioMode}
                evidenceGenerating={evidenceGenerating}
                evidenceError={evidenceError}
                onApproveEvidence={onApproveEvidence}
                onIgnoreEvidence={onIgnoreEvidence}
              />
            )}

            {activeView === "Achievements" && (
              <EmptySection title="Achievements" />
            )}

            {activeView === "Portfolio" && (
              <PortfolioPreview user={user} careerEvidence={careerEvidence} />
            )}

            {activeView === "Settings" && (
              <SettingsSection user={user} onSignOut={onSignOut} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function DashboardHome({
  firstName,
  user,
  setActiveView,
  githubConnection,
  githubConnecting,
  githubError,
  onConnectGitHub,
}: {
  firstName: string;
  user: User;
  setActiveView: (view: View) => void;
  githubConnection: GitHubConnection | null;
  githubConnecting: boolean;
  githubError: string;
  onConnectGitHub: () => Promise<void>;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const cards = [
    ["Projects", "0", "Connect GitHub to discover projects."],
    ["Skills", "0", "Skills will be derived from your evidence."],
    ["Achievements", "0", "CareerSync will collect achievements here."],
    [
      "Connections",
      githubConnection ? "2" : "1",
      githubConnection
        ? "Google + GitHub connected."
        : "Google account connected.",
    ],
  ];

  return (
    <div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-white/40">Dashboard</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              {greeting}, {firstName}.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
              Your CareerSync profile is ready. Connect your professional
              sources and we&apos;ll start turning your work into career evidence.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            <CheckCircle2 size={17} className="text-emerald-400" />
            Account connected
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, description]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <p className="text-xs text-white/35">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-xs leading-5 text-white/35">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Build your career graph</h3>
              <p className="mt-1 text-sm text-white/35">
                Start with the source where your technical work lives.
              </p>
            </div>
            <Sparkles size={19} className="text-white/50" />
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                if (githubConnection) {
                  setActiveView("Connections");
                } else {
                  void onConnectGitHub();
                }
              }}
              disabled={githubConnecting}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
                  <FaGithub size={19} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {githubConnection
                      ? `Connected as @${githubConnection.login}`
                      : githubConnecting
                        ? "Connecting GitHub..."
                        : "Connect GitHub"}
                  </p>
                  <p className="text-xs text-white/35">
                    {githubConnection
                      ? "GitHub is now part of your career graph."
                      : "Discover repositories and project evidence."}
                  </p>
                </div>
              </div>
              <ArrowRight size={17} className="text-white/30" />
            </button>

            {githubError && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-300">
                {githubError}
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a66c2]">
                  <FaLinkedin size={19} />
                </div>
                <div>
                  <p className="text-sm font-medium">LinkedIn</p>
                  <p className="text-xs text-white/35">Connector coming next.</p>
                </div>
              </div>
              <span className="text-xs text-white/30">Coming soon</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-medium">Profile</h3>

          <div className="mt-5 flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? "Profile"}
                className="h-14 w-14 rounded-full border border-white/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
                <UserRound size={22} />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-medium">{user.displayName}</p>
              <p className="truncate text-sm text-white/35">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 text-white/60" />
              <div>
                <p className="text-sm font-medium">Your account is secure</p>
                <p className="mt-1 text-xs leading-5 text-white/35">
                  Authentication is handled by Firebase. CareerSync never
                  needs your Google password.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Connections({
  githubConnection,
  githubConnecting,
  githubError,
  onConnectGitHub,
}: {
  githubConnection: GitHubConnection | null;
  githubConnecting: boolean;
  githubError: string;
  onConnectGitHub: () => Promise<void>;
}) {
  return (
    <div>
      <PageHeading
        eyebrow="INTEGRATIONS"
        title="Connect your professional sources."
        description="CareerSync will use connected sources as evidence for your projects, skills, achievements and portfolio."
      />

      {githubError && (
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {githubError}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ConnectionCard
          icon={
            githubConnection?.avatar_url ? (
              <img
                src={githubConnection.avatar_url}
                alt={githubConnection.login}
                className="h-11 w-11 rounded-xl object-cover"
              />
            ) : (
              <FaGithub size={21} />
            )
          }
          title="GitHub"
          description="Repositories, languages, contributions and project activity."
          status={
            githubConnection
              ? `Connected as @${githubConnection.login}`
              : "Ready to connect"
          }
          primary
          connected={Boolean(githubConnection)}
          connecting={githubConnecting}
          onClick={onConnectGitHub}
        />

        <ConnectionCard
          icon={<FaLinkedin size={21} />}
          title="LinkedIn"
          description="Professional experience, education and career profile data."
          status="Coming soon"
        />

        <ConnectionCard
          icon={<ShieldCheck size={21} />}
          title="LeetCode"
          description="Problem-solving activity and coding progress."
          status="Coming soon"
        />
      </div>
    </div>
  );
}

function ConnectionCard({
  icon,
  title,
  description,
  status,
  primary = false,
  connected = false,
  connecting = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  status: string;
  primary?: boolean;
  connected?: boolean;
  connecting?: boolean;
  onClick?: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>

        <span
          className={`text-right text-xs ${
            connected || primary
              ? "text-emerald-400"
              : "text-white/30"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-6 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/35">
        {description}
      </p>

      <button
        disabled={!primary || connecting}
        onClick={() => {
          if (onClick) {
            void onClick();
          }
        }}
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
          primary
            ? "bg-white text-black hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
            : "cursor-not-allowed border border-white/10 text-white/25"
        }`}
      >
        {!primary
          ? "Coming soon"
          : connecting
            ? "Connecting..."
            : connected
              ? "Reconnect GitHub"
              : "Connect GitHub"}
      </button>
    </div>
  );
}

function ProjectsSection({
  githubConnection,
  githubRepositories,
  githubReposLoading,
  githubReposError,
  onLoadGitHubRepositories,
  onConnectGitHub,
  githubConnecting,
  careerEvidence,
  portfolioMode,
  onSetPortfolioMode,
  evidenceGenerating,
  evidenceError,
  onApproveEvidence,
  onIgnoreEvidence,
}: {
  githubConnection: GitHubConnection | null;
  githubRepositories: GitHubRepository[];
  githubReposLoading: boolean;
  githubReposError: string;
  onLoadGitHubRepositories: () => Promise<void>;
  onConnectGitHub: () => Promise<void>;
  githubConnecting: boolean;
  careerEvidence: CareerEvidence[];
  portfolioMode: PortfolioMode;
  onSetPortfolioMode: (mode: PortfolioMode) => Promise<void>;
  evidenceGenerating: boolean;
  evidenceError: string;
  onApproveEvidence: (evidenceId: string) => Promise<void>;
  onIgnoreEvidence: (evidenceId: string) => Promise<void>;
}) {
  if (!githubConnection) {
    return (
      <div>
        <PageHeading
          eyebrow="PROJECTS"
          title="Your projects, automatically discovered."
          description="Connect GitHub and CareerSync will turn your repositories into career evidence instead of making you maintain a portfolio by hand."
        />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black">
            <FaGithub size={22} />
          </div>
          <h3 className="mt-5 text-lg font-medium">Connect GitHub to get started</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
            CareerSync will discover your repositories first. Later, the evidence engine will classify projects, achievements and skills automatically.
          </p>
          <button
            onClick={() => void onConnectGitHub()}
            disabled={githubConnecting}
            className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
          >
            {githubConnecting ? "Connecting..." : "Connect GitHub"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <PageHeading
          eyebrow="PROJECTS"
          title="Work detected from GitHub."
          description={`Repositories from @${githubConnection.login}. This is the raw evidence layer that CareerSync will turn into portfolio-ready projects.`}
        />

        <button
          onClick={() => void onLoadGitHubRepositories()}
          disabled={githubReposLoading}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium transition hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={16} className={githubReposLoading ? "animate-spin" : ""} />
          {githubReposLoading ? "Syncing..." : "Sync GitHub"}
        </button>
      </div>

      {githubReposError && (
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {githubReposError}
        </div>
      )}

      {githubReposLoading && githubRepositories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-white/40">
          Reading your GitHub repositories...
        </div>
      ) : githubRepositories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-10 text-center">
          <FolderGit2 className="mx-auto text-white/40" size={25} />
          <h3 className="mt-4 font-medium">No repositories found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
            Your GitHub account is connected, but there are no repositories available to sync yet.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between text-xs text-white/35">
            <span>{githubRepositories.length} repositories discovered</span>
            <span>Raw GitHub evidence</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {githubRepositories.map((repo) => (
              <div
                key={repo.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderGit2 size={17} className="shrink-0 text-white/60" />
                      <h3 className="truncate font-medium">{repo.name}</h3>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/25">{repo.full_name}</p>
                  </div>
                  {repo.private ? (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/35">
                      Private
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 min-h-12 text-sm leading-6 text-white/40">
                  {repo.description || "No repository description yet."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {repo.language ? (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/55">
                      {repo.language}
                    </span>
                  ) : null}
                  {repo.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/35"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/30">
                  <div className="flex items-center gap-4">
                    <span>★ {repo.stargazers_count}</span>
                    <span>⑂ {repo.forks_count}</span>
                  </div>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-white/50 transition hover:text-white"
                  >
                    GitHub
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs tracking-[0.18em] text-white/30">PORTFOLIO CONTROL</p>
                <h3 className="mt-2 font-medium">Choose how CareerSync publishes evidence.</h3>
                <p className="mt-1 text-sm text-white/35">Smart Mode is recommended for most users.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["manual", "smart", "autopilot"] as PortfolioMode[]).map((mode) => (
                  <button key={mode} onClick={() => void onSetPortfolioMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${portfolioMode === mode ? "bg-white text-black" : "border border-white/10 text-white/45 hover:text-white"}`}>
                    {mode === "manual" ? "Manual" : mode === "smart" ? "Smart" : "Autopilot"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs tracking-[0.18em] text-white/30">CAREER EVIDENCE</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Discovered project evidence.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                  CareerSync uses evidence-grounded decisions. Smart Mode is the default: routine, well-supported updates can publish automatically while ambiguous items stay with you.
                </p>
              </div>
              {evidenceGenerating ? (
                <span className="text-xs text-white/35">Analyzing repositories...</span>
              ) : null}
            </div>

            {evidenceError ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                {evidenceError}
              </div>
            ) : null}

            {careerEvidence.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center text-sm text-white/35">
                Sync GitHub to generate your first career evidence.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {careerEvidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium">{item.title}</h4>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] ${
                            item.status === "approved"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : item.status === "ignored"
                                ? "bg-white/5 text-white/25"
                                : "bg-amber-400/10 text-amber-300"
                          }`}>
                            {item.status === "pending" ? "Needs review" : item.status === "published" ? "Published" : item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/25">{item.repositoryName}</p>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">{item.description}</p>
                        {item.technologies.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.technologies.map((technology) => (
                              <span key={technology} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/40">
                                {technology}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {item.status === "pending" ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => void onApproveEvidence(item.id)}
                            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-white/90"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void onIgnoreEvidence(item.id)}
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                          >
                            Ignore
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptySection({ title }: { title: string }) {
  return (
    <div>
      <PageHeading
        eyebrow={title.toUpperCase()}
        title={`${title} will live here.`}
        description="This area is ready for the next CareerSync connector and evidence pipeline."
      />

      <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Sparkles size={19} />
        </div>
        <h3 className="mt-5 font-medium">Building this next</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
          The structure is in place. We&apos;ll connect real career evidence here
          instead of using placeholder data.
        </p>
      </div>
    </div>
  );
}

function PortfolioPreview({ user, careerEvidence }: { user: User; careerEvidence: CareerEvidence[] }) {
  const published = careerEvidence.filter((item) => item.status === "approved" || item.status === "published");
  const technologies = Array.from(new Set(published.flatMap((item) => item.technologies)));

  return (
    <div>
      <PageHeading
        eyebrow="PUBLIC PORTFOLIO"
        title="Your living portfolio."
        description="Only approved or published evidence appears here. CareerSync never creates unsupported career claims."
      />

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
        <div className="border-b border-white/10 px-6 py-4 text-xs text-white/30">
          {user.displayName?.toLowerCase().replace(/\s+/g, "-") || "your-name"}.careersync.app
        </div>
        <div className="p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? "Profile"}
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                <UserRound size={32} />
              </div>
            )}
            <div>
              <p className="text-sm text-white/35">CareerSync profile</p>
              <h2 className="mt-1 text-3xl font-semibold">{user.displayName}</h2>
              <p className="mt-2 text-sm text-white/40">{user.email}</p>
            </div>
          </div>

          {published.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 p-6">
              <p className="text-sm font-medium">No published career evidence yet</p>
              <p className="mt-2 text-sm leading-6 text-white/35">
                Review your discovered evidence in Projects to start building this portfolio.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              <section>
                <p className="text-xs tracking-[0.18em] text-white/30">PROJECTS</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {published.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium">{item.title}</h3>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/40 hover:text-white"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/40">{item.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Array.from(new Set(item.technologies)).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/40"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              {technologies.length > 0 ? (
                <section>
                  <p className="text-xs tracking-[0.18em] text-white/30">TECHNOLOGIES</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {technologies.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div>
      <PageHeading
        eyebrow="SETTINGS"
        title="Your account."
        description="Manage your CareerSync identity and authentication."
      />

      <div className="mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? "Profile"}
              className="h-16 w-16 rounded-full border border-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
              <UserRound size={24} />
            </div>
          )}

          <div>
            <h3 className="font-medium">{user.displayName}</h3>
            <p className="mt-1 text-sm text-white/35">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs tracking-[0.18em] text-white/30">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/40">{description}</p>
    </div>
  );
}

export default App;
