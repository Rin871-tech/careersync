import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Code2,
  ExternalLink,
  RefreshCw,
  Award,
  CheckCircle2,
  FolderGit2,
  GitCommitHorizontal,
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

function formatRepositoryDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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
  aiInsight?: CareerInsight;
  aiGeneratedAt?: string;
};

type GitHubAnalysis = {
  repository: {
    id: number;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
    description: string | null;
    private: boolean;
    topics: string[];
    language: string | null;
    stars: number;
    forks: number;
    updatedAt: string;
    pushedAt: string | null;
  };
  projectType: string;
  technologies: string[];
  confidence: number;
  summary: string;
  evidence: {
    readme: { available: boolean; contentPreview?: string };
    manifests: string[];
    sourceFiles: Array<{ path: string; contentPreview: string }>;
    sourceFileCount: number;
    inspectedSourceFileCount: number;
    recentCommits: Array<{ sha: string; message: string }>;
    releases: Array<{ id: number; tag: string; name: string; publishedAt: string | null }>;
  };
  analyzedAt: string;
};

type SkillEvidence = {
  skill: string;
  confidence: number;
  evidence: string[];
};

type CareerInsight = {
  projectTitle: string;
  oneLineSummary: string;
  problem: string;
  solution: string;
  keyFeatures: string[];
  technicalSkills: string[];
  keyContributions: string[];
  evidenceClaims: string[];
  resumeBullets: string[];
  suggestedTags: string[];
  demonstratedSkills: SkillEvidence[];
};

function buildVerifiedSkillEvidence(analysis: GitHubAnalysis): SkillEvidence[] {
  const evidence = analysis.evidence;
  const sourceFiles = evidence.sourceFiles ?? [];
  const repo = analysis.repository;
  const manifestNames = new Set((evidence.manifests ?? []).map((file) => file.toLowerCase()));

  // Task 4 rule: a skill must have positive repository evidence. A word appearing
  // somewhere in a README is not sufficient on its own because that can create
  // false positives such as "not built with React".
  const aliases: Record<string, string[]> = {
    react: ["react", "react-dom", "react-dom/client", "@vitejs/plugin-react"],
    typescript: ["typescript", "\.ts", "\.tsx", "tsconfig.json"],
    javascript: ["javascript", "\.js", "\.jsx", "package.json"],
    vite: ["vite", "vite.config", "@vitejs/"],
    firebase: ["firebase", "firestore", "firebase/auth", "firebase-admin"],
    tailwindcss: ["tailwindcss", "tailwind.config", "@tailwind", "tailwind"],
    express: ["express", "express()", "app.use(", "app.listen("],
    "node.js": ["node.js", "nodejs", "from 'node:", 'from \"node:', "require('node:"],
    nextjs: ["next.js", "nextjs", "next/", "next.config"],
    python: ["python", "\.py", "requirements.txt", "pyproject.toml", "pipfile"],
    java: ["\.java", "pom.xml", "build.gradle", "gradlew"],
    c: ["\.c", "\.h", "makefile", "cmakelists.txt"],
    "c++": ["\.cpp", "\.cc", "\.cxx", "\.hpp", "cmakelists.txt"],
    "c#": ["\.cs", "\.csproj", "\.sln"],
    go: ["\.go", "go.mod", "go.sum"],
    rust: ["\.rs", "cargo.toml", "cargo.lock"],
    kotlin: ["\.kt", "\.kts", "build.gradle.kts"],
    swift: ["\.swift", "package.swift"],
  };

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.\-/]/g, "");

  const sourceEvidence = (skill: string): string[] => {
    const normalizedSkill = normalize(skill);
    const candidates = aliases[normalizedSkill] ?? [normalizedSkill];
    const found = sourceFiles
      .filter((file) => {
        const path = file.path.toLowerCase();
        const content = String(file.contentPreview ?? "").toLowerCase();
        return candidates.some((candidate) => {
          const token = candidate.toLowerCase();
          if (token.startsWith("\\.")) return path.endsWith(token.slice(1));
          if (token.includes("/") || token.includes("(") || token.includes(" ")) return content.includes(token);
          return content.includes(token) || path.includes(token);
        });
      })
      .map((file) => file.path)
      .slice(0, 3);

    return found.map((file) => `Source evidence: ${file} contains ${skill}-related implementation.`);
  };

  const languageEvidence = (skill: string): string[] => {
    if (repo.language?.toLowerCase() === skill.toLowerCase()) {
      return [`GitHub repository metadata identifies ${repo.language} as the primary language.`];
    }
    return [];
  };

  const manifestEvidence = (skill: string): string[] => {
    const normalized = normalize(skill);
    // A generic package.json/README is not proof of a technology. Only use
    // configuration files whose presence is directly tied to the skill.
    const mappings: Record<string, string[]> = {
      typescript: ["tsconfig.json"],
      vite: ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"],
      firebase: ["firebase.json", ".firebaserc"],
      tailwindcss: ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.ts", "tailwind.config.mjs"],
      nextjs: ["next.config.js", "next.config.mjs", "next.config.ts"],
      python: ["requirements.txt", "pyproject.toml", "pipfile", "setup.py"],
      java: ["pom.xml", "build.gradle", "build.gradle.kts", "gradlew"],
      go: ["go.mod", "go.sum"],
      rust: ["cargo.toml", "cargo.lock"],
      kotlin: ["build.gradle.kts"],
      swift: ["package.swift"],
    };
    const matches = (mappings[normalized] ?? []).filter((name) => manifestNames.has(name));
    return matches.map((name) => `Configuration evidence: ${name} is present in the repository.`);
  };

  return analysis.technologies
    .map((skill) => {
      const evidenceLines = Array.from(new Set([
        ...languageEvidence(skill),
        ...sourceEvidence(skill),
        ...manifestEvidence(skill),
      ])).slice(0, 4);

      // README/topic mentions alone are intentionally excluded from verification.
      // They can be useful context for the AI profile, but they cannot prove a skill.
      if (evidenceLines.length === 0) return null;

      const strongSignals = [
        languageEvidence(skill).length > 0,
        sourceEvidence(skill).length > 0,
        manifestEvidence(skill).length > 0,
      ].filter(Boolean).length;

      const confidence = strongSignals >= 2 ? 0.98 : 0.9;

      return {
        skill,
        confidence,
        evidence: evidenceLines,
      };
    })
    .filter((item): item is SkillEvidence => Boolean(item));
}

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
  const [evidenceGenerating, setEvidenceGenerating] =
    useState(false);
  const [evidenceError, setEvidenceError] =
    useState("");
  const [repositoryAnalyses, setRepositoryAnalyses] =
    useState<Record<number, GitHubAnalysis>>({});
  const [repositoryAnalyzing, setRepositoryAnalyzing] =
    useState<Record<number, boolean>>({});
  const [repositoryAnalysisErrors, setRepositoryAnalysisErrors] =
    useState<Record<number, string>>({});
  const [repositoryInsights, setRepositoryInsights] =
    useState<Record<number, CareerInsight>>({});
  const [repositoryInsightGenerating, setRepositoryInsightGenerating] =
    useState<Record<number, boolean>>({});
  const [repositoryInsightErrors, setRepositoryInsightErrors] =
    useState<Record<number, string>>({});
  const [repositoryPublicationStatus, setRepositoryPublicationStatus] =
    useState<Record<number, "draft" | "approved" | "published">>({});
  const [publicRepoUrl, setPublicRepoUrl] = useState("");
  const [publicRepoLoading, setPublicRepoLoading] = useState(false);
  const [publicRepoError, setPublicRepoError] = useState("");
  const [publicRepository, setPublicRepository] = useState<GitHubRepository | null>(null);

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
            // Repository discovery is raw evidence. Do not publish it before
            // the repository has been deeply analyzed and reviewed.
            status: existing?.status ?? "pending",
            decision: existing?.decision ?? "manual_review",
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

  const analyzeGitHubRepository = async (repo: GitHubRepository) => {
    if (!user || !API_URL) return;

    try {
      setRepositoryAnalyzing((current) => ({ ...current, [repo.id]: true }));
      setRepositoryAnalysisErrors((current) => ({ ...current, [repo.id]: "" }));

      const idToken = await user.getIdToken();
      const response = await fetch(
        `${API_URL}/github/repos/${encodeURIComponent(repo.full_name.split("/")[0])}/${encodeURIComponent(repo.name)}/analyze`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = (await response.json()) as {
        analysis?: GitHubAnalysis;
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        throw new Error(data.error ?? "Unable to analyze this repository.");
      }

      const analysis = data.analysis;
      setRepositoryAnalyses((current) => ({
        ...current,
        [repo.id]: analysis,
      }));

      // Enrich the existing evidence with analyzer-backed facts while
      // preserving an already approved/published decision.
      const currentEvidence = careerEvidence;
      const existing = currentEvidence.find((item) => item.repositoryId === repo.id);
      const enriched: CareerEvidence = {
        id: existing?.id ?? `github-project-${repo.id}`,
        source: "github",
        type: "project",
        status: existing?.status ?? "pending",
        decision: existing?.decision ?? "manual_review",
        confidence: analysis.confidence,
        title: repo.name,
        description: analysis.summary || repo.description?.trim() || `Project discovered from ${repo.full_name}.`,
        technologies: Array.from(new Set(analysis.technologies)),
        sourceUrl: repo.html_url,
        repositoryId: repo.id,
        repositoryName: repo.full_name,
        updatedAt: analysis.analyzedAt,
      };

      const updated = existing
        ? currentEvidence.map((item) => item.repositoryId === repo.id ? enriched : item)
        : [...currentEvidence, enriched];

      await setDoc(
        doc(db, "users", user.uid),
        { careerEvidence: updated, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setCareerEvidence(updated);
    } catch (error) {
      console.error("GitHub repository analysis error:", error);
      setRepositoryAnalysisErrors((current) => ({
        ...current,
        [repo.id]: error instanceof Error ? error.message : "Unable to analyze this repository.",
      }));
    } finally {
      setRepositoryAnalyzing((current) => ({ ...current, [repo.id]: false }));
    }
  };

  const generateCareerInsight = async (repo: GitHubRepository) => {
    if (!user) return;

    const analysis = repositoryAnalyses[repo.id];
    if (!analysis) {
      setRepositoryInsightErrors((current) => ({
        ...current,
        [repo.id]: "Analyze this repository first so CareerSync has verified evidence to send to Ollama.",
      }));
      return;
    }

    try {
      setRepositoryInsightGenerating((current) => ({ ...current, [repo.id]: true }));
      setRepositoryInsightErrors((current) => ({ ...current, [repo.id]: "" }));

      const evidence = analysis.evidence;
      const compactEvidence = {
        repository: analysis.repository,
        projectType: analysis.projectType,
        technologies: analysis.technologies,
        analyzerSummary: analysis.summary,
        readme: String(evidence.readme?.contentPreview ?? "").slice(0, 7000),
        manifests: evidence.manifests ?? [],
        sourceFiles: (evidence.sourceFiles ?? []).slice(0, 4).map((file) => ({
          path: file.path,
          contentPreview: String(file.contentPreview ?? "").slice(0, 5000),
        })),
        recentCommits: (evidence.recentCommits ?? []).slice(0, 15),
        releases: (evidence.releases ?? []).slice(0, 10),
      };

      const prompt = `You are CareerSync's evidence-grounded career intelligence engine.
Analyze ONLY the supplied verified GitHub evidence. Never invent users, metrics, features, architecture, responsibilities, impact, or technologies. If the evidence does not establish a problem or impact, say that clearly instead of guessing. Resume bullets must be factual and conservative.

Generate a useful project profile for a judge who may provide a completely different public GitHub repository. The project description, key features and contributions must come from the supplied evidence. Do not assume the repository is CareerSync.

Return ONLY valid JSON with exactly these keys:
projectTitle, oneLineSummary, problem, solution, keyFeatures, technicalSkills, keyContributions, evidenceClaims, resumeBullets, suggestedTags.
All list fields must be JSON arrays of strings.

If the evidence does not establish a problem, impact, or contribution, use a conservative statement such as \"Not established by available repository evidence.\"

VERIFIED GITHUB EVIDENCE:
${JSON.stringify(compactEvidence)}`;

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt,
          stream: false,
          format: "json",
          options: { temperature: 0.15 },
        }),
      });

      const data = (await response.json()) as { response?: string; error?: string };
      if (!response.ok || !data.response) {
        throw new Error(data.error ?? "Ollama did not return a career insight.");
      }

      let insight: CareerInsight;
      try {
        const parsed = JSON.parse(data.response) as Partial<CareerInsight>;
        const verifiedSkills = buildVerifiedSkillEvidence(analysis);
        insight = {
          projectTitle: String(parsed.projectTitle ?? analysis.repository.name),
          oneLineSummary: String(parsed.oneLineSummary ?? analysis.summary),
          problem: String(parsed.problem ?? "Not established by available repository evidence."),
          solution: String(parsed.solution ?? analysis.summary),
          keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures.map(String) : [],
          technicalSkills: verifiedSkills.map((item) => item.skill),
          keyContributions: Array.isArray(parsed.keyContributions) ? parsed.keyContributions.map(String) : [],
          evidenceClaims: Array.isArray(parsed.evidenceClaims) ? parsed.evidenceClaims.map(String) : [],
          resumeBullets: Array.isArray(parsed.resumeBullets) ? parsed.resumeBullets.map(String) : [],
          suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.map(String) : verifiedSkills.map((item) => item.skill).slice(0, 8),
          demonstratedSkills: verifiedSkills,
        };
      } catch {
        throw new Error("Ollama returned invalid JSON. Try generating the insight again.");
      }

      const generatedAt = new Date().toISOString();
      setRepositoryInsights((current) => ({ ...current, [repo.id]: insight }));

      const existing = careerEvidence.find((item) => item.repositoryId === repo.id);
      if (existing) {
        const updated = careerEvidence.map((item) =>
          item.repositoryId === repo.id
            ? {
                ...item,
                title: insight.projectTitle || item.title,
                description: insight.oneLineSummary || item.description,
                technologies: Array.from(new Set([...item.technologies, ...insight.technicalSkills])),
                aiInsight: insight,
                aiGeneratedAt: generatedAt,
              }
            : item,
        );
        await setDoc(doc(db, "users", user.uid), { careerEvidence: updated, updatedAt: serverTimestamp() }, { merge: true });
        setCareerEvidence(updated);
      }
    } catch (error) {
      console.error("Ollama career insight error:", error);
      setRepositoryInsightErrors((current) => ({
        ...current,
        [repo.id]: error instanceof Error ? error.message : "Unable to generate career insight with Ollama.",
      }));
    } finally {
      setRepositoryInsightGenerating((current) => ({ ...current, [repo.id]: false }));
    }
  };

  const approveRepositoryProfile = async (repo: GitHubRepository) => {
    const analysis = repositoryAnalyses[repo.id];
    const insight = repositoryInsights[repo.id];
    if (!analysis || !insight) {
      setRepositoryInsightErrors((current) => ({
        ...current,
        [repo.id]: "Generate the AI profile before approving it.",
      }));
      return;
    }

    setRepositoryPublicationStatus((current) => ({ ...current, [repo.id]: "approved" }));

    if (user) {
      const existing = careerEvidence.find((item) => item.repositoryId === repo.id);
      const updated = careerEvidence.map((item) =>
        item.repositoryId === repo.id
          ? { ...item, status: "approved" as const, decision: "manual_review" as const }
          : item,
      );
      const next = existing ? updated : [...careerEvidence, {
        id: `github-project-${repo.id}`,
        source: "github" as const,
        type: "project" as const,
        status: "approved" as const,
        decision: "manual_review" as const,
        confidence: analysis.confidence,
        title: insight.projectTitle,
        description: insight.oneLineSummary,
        technologies: insight.technicalSkills,
        sourceUrl: repo.html_url,
        repositoryId: repo.id,
        repositoryName: repo.full_name,
        updatedAt: new Date().toISOString(),
        aiInsight: insight,
        aiGeneratedAt: new Date().toISOString(),
      }];
      await setDoc(doc(db, "users", user.uid), { careerEvidence: next, updatedAt: serverTimestamp() }, { merge: true });
      setCareerEvidence(next);
    }
  };

  const publishRepositoryProfile = async (repo: GitHubRepository) => {
    const currentStatus = repositoryPublicationStatus[repo.id];
    if (currentStatus !== "approved") {
      setRepositoryInsightErrors((current) => ({
        ...current,
        [repo.id]: "Approve the generated profile before publishing it.",
      }));
      return;
    }

    setRepositoryPublicationStatus((current) => ({ ...current, [repo.id]: "published" }));

    if (user) {
      const updated = careerEvidence.map((item) =>
        item.repositoryId === repo.id
          ? { ...item, status: "published" as const }
          : item,
      );
      await setDoc(doc(db, "users", user.uid), { careerEvidence: updated, updatedAt: serverTimestamp() }, { merge: true });
      setCareerEvidence(updated);
    }
  };

  const analyzePublicRepository = async () => {
    if (!API_URL) {
      setPublicRepoError("CareerSync API URL is not configured.");
      return;
    }

    const input = publicRepoUrl.trim();
    if (!/^https?:\/\/github\.com\/[^/]+\/[^/#?]+\/?(?:[#?].*)?$/i.test(input)) {
      setPublicRepoError("Enter a public GitHub repository URL, for example https://github.com/owner/repository.");
      return;
    }

    try {
      setPublicRepoLoading(true);
      setPublicRepoError("");
      const response = await fetch(`${API_URL}/github/public/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      const data = (await response.json()) as { analysis?: GitHubAnalysis; error?: string };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error ?? "Unable to analyze the public repository.");
      }

      const analysis = data.analysis;
      const syntheticId = analysis.repository.id;
      const repository: GitHubRepository = {
        id: syntheticId,
        name: analysis.repository.name,
        full_name: analysis.repository.fullName,
        description: analysis.repository.description,
        html_url: analysis.repository.url,
        homepage: null,
        private: analysis.repository.private,
        fork: false,
        language: analysis.repository.language,
        stargazers_count: analysis.repository.stars,
        forks_count: analysis.repository.forks,
        open_issues_count: 0,
        topics: analysis.repository.topics,
        default_branch: analysis.repository.defaultBranch,
        updated_at: analysis.repository.updatedAt,
        pushed_at: analysis.repository.pushedAt,
      };

      setPublicRepository(repository);
      setRepositoryAnalyses((current) => ({ ...current, [syntheticId]: analysis }));
      setRepositoryInsightErrors((current) => ({ ...current, [syntheticId]: "" }));
    } catch (error) {
      console.error("Public repository analysis error:", error);
      setPublicRepoError(error instanceof Error ? error.message : "Unable to analyze the public repository.");
    } finally {
      setPublicRepoLoading(false);
    }
  };

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

  const onSetPortfolioMode = async (mode: PortfolioMode) => {
    if (!user) return;

    setPortfolioMode(mode);
    await setDoc(
      doc(db, "users", user.uid),
      { portfolioMode: mode, updatedAt: serverTimestamp() },
      { merge: true },
    );
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
        await loadGitHubRepositories(savedEvidence ?? []);
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
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff] text-slate-900">
        <div className="flex items-center gap-3 text-sm text-slate-500">
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
        repositoryAnalyses={repositoryAnalyses}
        repositoryAnalyzing={repositoryAnalyzing}
        repositoryAnalysisErrors={repositoryAnalysisErrors}
        onAnalyzeRepository={analyzeGitHubRepository}
        repositoryInsights={repositoryInsights}
        repositoryInsightGenerating={repositoryInsightGenerating}
        repositoryInsightErrors={repositoryInsightErrors}
        onGenerateCareerInsight={generateCareerInsight}
        repositoryPublicationStatus={repositoryPublicationStatus}
        onApproveRepositoryProfile={approveRepositoryProfile}
        onPublishRepositoryProfile={publishRepositoryProfile}
        publicRepoUrl={publicRepoUrl}
        setPublicRepoUrl={setPublicRepoUrl}
        publicRepoLoading={publicRepoLoading}
        publicRepoError={publicRepoError}
        publicRepository={publicRepository}
        onAnalyzePublicRepository={analyzePublicRepository}
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-900/30">
        <Sparkles size={18} />
      </div>
      <span className="text-lg font-semibold tracking-tight">CareerSync</span>
    </div>
  );
}

function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-[#080b16] text-slate-100">
      <nav className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Brand />

          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-slate-950">
              How it works
            </a>
            <a href="#features" className="transition hover:text-slate-950">
              Features
            </a>
            <a href="#connect" className="transition hover:text-slate-950">
              Integrations
            </a>
          </div>

          <button
            onClick={onSignIn}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Sign in
          </button>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.09),transparent_35%)]" />

          <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-28 text-center md:pt-36">
            <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <Sparkles size={14} />
              Your career, automatically documented
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-7xl">
              Your portfolio should
              <span className="block text-slate-500">update itself.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-500">
              Connect GitHub, LinkedIn, LeetCode and the rest of your
              professional identity. CareerSync turns your achievements into
              a living portfolio.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={onSignIn}
                className="group flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-black transition hover:bg-slate-100"
              >
                Create your portfolio
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              </button>

              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3.5 font-medium text-slate-900 transition hover:bg-slate-100"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <div className="ml-4 flex-1 rounded-md bg-slate-50 px-4 py-1.5 text-left text-xs text-slate-500">
                yourname.careersync.app
              </div>
            </div>

            <div className="grid md:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-slate-200 p-5 md:block">
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
                          ? "bg-white/10 text-slate-900"
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
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Dashboard</p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      Your career at a glance
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
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
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300/70">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-5">
                    <h3 className="font-medium">Recent activity</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Once you connect your professional platforms, CareerSync
                      will start building your career timeline.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-5">
                    <h3 className="font-medium">Connected accounts</h3>
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <FaGithub size={17} />
                          <span className="text-sm">GitHub</span>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Connect next
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <FaLinkedin size={17} />
                          <span className="text-sm">LinkedIn</span>
                        </div>
                        <span className="text-xs text-slate-400">
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
          className="border-y border-slate-200 bg-white/[0.015]"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <p className="text-sm text-slate-500">HOW IT WORKS</p>
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
                  className="rounded-2xl border border-slate-200 p-6"
                >
                  <span className="text-xs text-slate-400">{number}</span>
                  <h3 className="mt-8 text-xl font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
  repositoryAnalyses,
  repositoryAnalyzing,
  repositoryAnalysisErrors,
  onAnalyzeRepository,
  repositoryInsights,
  repositoryInsightGenerating,
  repositoryInsightErrors,
  onGenerateCareerInsight,
  repositoryPublicationStatus,
  onApproveRepositoryProfile,
  onPublishRepositoryProfile,
  publicRepoUrl,
  setPublicRepoUrl,
  publicRepoLoading,
  publicRepoError,
  publicRepository,
  onAnalyzePublicRepository,
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
  repositoryAnalyses: Record<number, GitHubAnalysis>;
  repositoryAnalyzing: Record<number, boolean>;
  repositoryAnalysisErrors: Record<number, string>;
  onAnalyzeRepository: (repo: GitHubRepository) => Promise<void>;
  repositoryInsights: Record<number, CareerInsight>;
  repositoryInsightGenerating: Record<number, boolean>;
  repositoryInsightErrors: Record<number, string>;
  onGenerateCareerInsight: (repo: GitHubRepository) => Promise<void>;
  repositoryPublicationStatus: Record<number, "draft" | "approved" | "published">;
  onApproveRepositoryProfile: (repo: GitHubRepository) => Promise<void>;
  onPublishRepositoryProfile: (repo: GitHubRepository) => Promise<void>;
  publicRepoUrl: string;
  setPublicRepoUrl: (value: string) => void;
  publicRepoLoading: boolean;
  publicRepoError: string;
  publicRepository: GitHubRepository | null;
  onAnalyzePublicRepository: () => Promise<void>;
}) {
  if (activeView === "Portfolio") {
    return (
      <PortfolioPreview
        user={user}
        careerEvidence={careerEvidence}
        onBack={() => setActiveView("Dashboard")}
      />
    );
  }

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
    <div className="min-h-screen bg-[#080b16] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d1224] lg:flex lg:flex-col shadow-[8px_0_40px_rgba(0,0,0,0.25)]">
          <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10 p-5">
            <Brand />
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => selectView(label)}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  activeView === label
                    ? "border-violet-400/30 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeView === label ? "bg-white/15 text-white" : "bg-white/[0.05] text-slate-400 group-hover:text-cyan-300"}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-medium text-slate-400 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden">
            <div className="h-full w-72 border-r border-white/10 bg-[#0d1224] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
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
                        : "text-white/50 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeView === label ? "bg-white/15 text-white" : "bg-white/[0.05] text-slate-400 group-hover:text-cyan-300"}`}>
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/10 bg-[#0b1020]/95 px-5 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-xs text-slate-400">CareerSync</p>
                <h1 className="text-sm font-semibold text-white">{activeView}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">{user.displayName}</p>
                <p className="max-w-48 truncate text-xs text-slate-400">
                  {user.email}
                </p>
              </div>

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Profile"}
                  className="h-9 w-9 rounded-full border border-violet-400/30 ring-2 ring-violet-500/10"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-900/30">
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
                repositoryAnalyses={repositoryAnalyses}
                repositoryAnalyzing={repositoryAnalyzing}
                repositoryAnalysisErrors={repositoryAnalysisErrors}
                onAnalyzeRepository={onAnalyzeRepository}
                repositoryInsights={repositoryInsights}
                repositoryInsightGenerating={repositoryInsightGenerating}
                repositoryInsightErrors={repositoryInsightErrors}
                onGenerateCareerInsight={onGenerateCareerInsight}
                repositoryPublicationStatus={repositoryPublicationStatus}
                onApproveRepositoryProfile={onApproveRepositoryProfile}
                onPublishRepositoryProfile={onPublishRepositoryProfile}
                publicRepoUrl={publicRepoUrl}
                setPublicRepoUrl={setPublicRepoUrl}
                publicRepoLoading={publicRepoLoading}
                publicRepoError={publicRepoError}
                publicRepository={publicRepository}
                onAnalyzePublicRepository={onAnalyzePublicRepository}
              />
            )}

            {activeView === "Achievements" && (
              <EmptySection title="Achievements" />
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
      <div className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#141a35] via-[#11162b] to-[#0e1224] p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Dashboard</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {greeting}, {firstName}.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Your CareerSync profile is ready. Connect your professional
              sources and we'll start turning your work into career evidence.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-300">
            <CheckCircle2 size={17} className="text-emerald-400" />
            Account connected
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, description]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-[#11172b] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-violet-400/25"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-[#11172b] p-6 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Build your career graph</h3>
              <p className="mt-1 text-sm text-slate-400">
                Start with the source where your technical work lives.
              </p>
            </div>
            <Sparkles size={19} className="text-violet-300" />
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
              className="flex w-full items-center justify-between rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-600/15 to-cyan-500/10 p-4 text-left transition hover:border-violet-400/40 hover:bg-violet-500/15 disabled:cursor-wait disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-900/30">
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
                  <p className="text-xs text-slate-500">
                    {githubConnection
                      ? "GitHub is now part of your career graph."
                      : "Discover repositories and project evidence."}
                  </p>
                </div>
              </div>
              <ArrowRight size={17} className="text-cyan-300" />
            </button>

            {githubError && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-300">
                {githubError}
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 opacity-80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a66c2]">
                  <FaLinkedin size={19} />
                </div>
                <div>
                  <p className="text-sm font-medium">LinkedIn</p>
                  <p className="text-xs text-slate-400">Connector coming next.</p>
                </div>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300">Coming soon</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11172b] p-6 shadow-xl shadow-black/10">
          <h3 className="font-semibold text-white">Profile</h3>

          <div className="mt-5 flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? "Profile"}
                className="h-14 w-14 rounded-full border border-violet-400/30 ring-2 ring-violet-500/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                <UserRound size={22} />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-medium">{user.displayName}</p>
              <p className="truncate text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 text-cyan-300" />
              <div>
                <p className="text-sm font-medium">Your account is secure</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
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
      <p className="mt-2 text-sm leading-6 text-slate-500">
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
            ? "bg-white text-black hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
            : "cursor-not-allowed border border-slate-200 text-slate-400"
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
  repositoryAnalyses,
  repositoryAnalyzing,
  repositoryAnalysisErrors,
  onAnalyzeRepository,
  repositoryInsights,
  repositoryInsightGenerating,
  repositoryInsightErrors,
  onGenerateCareerInsight,
  repositoryPublicationStatus,
  onApproveRepositoryProfile,
  onPublishRepositoryProfile,
  publicRepoUrl,
  setPublicRepoUrl,
  publicRepoLoading,
  publicRepoError,
  publicRepository,
  onAnalyzePublicRepository,
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
  repositoryAnalyses: Record<number, GitHubAnalysis>;
  repositoryAnalyzing: Record<number, boolean>;
  repositoryAnalysisErrors: Record<number, string>;
  onAnalyzeRepository: (repo: GitHubRepository) => Promise<void>;
  repositoryInsights: Record<number, CareerInsight>;
  repositoryInsightGenerating: Record<number, boolean>;
  repositoryInsightErrors: Record<number, string>;
  onGenerateCareerInsight: (repo: GitHubRepository) => Promise<void>;
  repositoryPublicationStatus: Record<number, "draft" | "approved" | "published">;
  onApproveRepositoryProfile: (repo: GitHubRepository) => Promise<void>;
  onPublishRepositoryProfile: (repo: GitHubRepository) => Promise<void>;
  publicRepoUrl: string;
  setPublicRepoUrl: (value: string) => void;
  publicRepoLoading: boolean;
  publicRepoError: string;
  publicRepository: GitHubRepository | null;
  onAnalyzePublicRepository: () => Promise<void>;
}) {
  const publicAnalysis = publicRepository ? repositoryAnalyses[publicRepository.id] : undefined;

  const judgeStatus = publicRepository
    ? repositoryPublicationStatus[publicRepository.id] ?? "draft"
    : "draft";
  const publicInsight = publicRepository
    ? repositoryInsights[publicRepository.id]
    : undefined;

  const judgePanel = (
    <div className="mt-8 overflow-hidden rounded-2xl border border-amber-400/15 bg-amber-400/[0.03]">
      <div className="border-b border-amber-400/10 px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-300/80">JUDGE MODE · TASK 5</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Analyze any public GitHub repository</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Paste the repository supplied by the judge. CareerSync collects repository evidence, understands the project, generates an evidence-grounded profile, and keeps unsupported skills out of the result.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-black/10 px-3 py-1.5 text-[10px] text-slate-500">
            Connect → Collect → Understand → Generate → Approve → Publish
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            value={publicRepoUrl}
            onChange={(event) => setPublicRepoUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void onAnalyzePublicRepository(); }}
            placeholder="https://github.com/owner/repository"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-black/20 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-white/20 focus:border-amber-300/30"
          />
          <button
            onClick={() => void onAnalyzePublicRepository()}
            disabled={publicRepoLoading}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
          >
            {publicRepoLoading ? "Collecting evidence..." : "Analyze repository"}
          </button>
        </div>
        {publicRepoError ? <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">{publicRepoError}</div> : null}
      </div>

      {publicRepository && publicAnalysis ? (
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-black/10 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FolderGit2 size={17} className="shrink-0 text-amber-300/70" />
                  <p className="truncate text-base font-semibold text-slate-800">{publicRepository.name}</p>
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-500">Public</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{publicRepository.full_name}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{publicRepository.description || "No repository description provided by GitHub."}</p>
              </div>
              <a href={publicRepository.html_url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 hover:text-slate-950">Open repository <ExternalLink size={13} /></a>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-slate-500"><Code2 size={13} /><span className="text-[9px] uppercase tracking-[0.12em]">Primary language</span></div>
                <p className="mt-1.5 text-xs font-medium text-slate-700">{publicRepository.language || "Not detected"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-slate-500"><CalendarDays size={13} /><span className="text-[9px] uppercase tracking-[0.12em]">Last activity</span></div>
                <p className="mt-1.5 text-xs font-medium text-slate-700">{formatRepositoryDate(publicRepository.pushed_at || publicRepository.updated_at)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-slate-500"><FolderGit2 size={13} /><span className="text-[9px] uppercase tracking-[0.12em]">Project files</span></div>
                <p className="mt-1.5 text-xs font-medium text-slate-700">{publicAnalysis.evidence.sourceFileCount} detected · {publicAnalysis.evidence.inspectedSourceFileCount} inspected</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-slate-500"><GitCommitHorizontal size={13} /><span className="text-[9px] uppercase tracking-[0.12em]">Activity</span></div>
                <p className="mt-1.5 text-xs font-medium text-slate-700">{publicAnalysis.evidence.recentCommits.length} commits · {publicAnalysis.evidence.releases.length} releases</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/80">COLLECTED EVIDENCE</p>
                <p className="mt-1 text-xs text-slate-500">Every signal below comes from the selected public repository.</p>
              </div>
              <button
                onClick={() => void onGenerateCareerInsight(publicRepository)}
                disabled={repositoryInsightGenerating[publicRepository.id]}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
              >
                {repositoryInsightGenerating[publicRepository.id] ? "Generating profile..." : publicInsight ? "Regenerate AI profile" : "Generate AI profile"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-black/10 p-3"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">README</p><p className="mt-1 text-xs font-medium text-slate-600">{publicAnalysis.evidence.readme.available ? "Found" : "Not found"}</p></div>
              <div className="rounded-lg border border-slate-200 bg-black/10 p-3"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Technologies</p><p className="mt-1 text-xs font-medium text-slate-600">{publicAnalysis.technologies.length} detected</p></div>
              <div className="rounded-lg border border-slate-200 bg-black/10 p-3"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Manifests</p><p className="mt-1 text-xs font-medium text-slate-600">{publicAnalysis.evidence.manifests.length} found</p></div>
              <div className="rounded-lg border border-slate-200 bg-black/10 p-3"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Commits</p><p className="mt-1 text-xs font-medium text-slate-600">{publicAnalysis.evidence.recentCommits.length} collected</p></div>
            </div>
            {publicAnalysis.evidence.manifests.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {publicAnalysis.evidence.manifests.map((file) => <span key={file} className="rounded-md border border-slate-200 bg-black/10 px-2 py-1 text-[10px] text-slate-500">{file}</span>)}
              </div>
            ) : null}
          </div>

          {publicInsight ? (
            <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.035] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-violet-300/80">GENERATED PROJECT PROFILE</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">{publicInsight.projectTitle}</h4>
                </div>
                <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2.5 py-1 text-[9px] text-violet-200/80">Evidence-grounded</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{publicInsight.oneLineSummary}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-black/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Project description / problem</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{publicInsight.problem}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-black/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Solution</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{publicInsight.solution}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Technologies</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {publicInsight.technicalSkills.map((skill) => <span key={skill} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-slate-600">{skill}</span>)}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/75">Demonstrated skills + supporting evidence</p>
                  <span className="text-[9px] text-slate-400">Only positively supported skills are shown</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {publicInsight.demonstratedSkills.length === 0 ? (
                    <div className="md:col-span-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] p-3 text-[10px] leading-5 text-amber-200/70">
                      No skills could be verified from the inspected repository evidence. Unsupported technologies are intentionally excluded.
                    </div>
                  ) : publicInsight.demonstratedSkills.map((item) => (
                    <div key={item.skill} className="rounded-lg border border-slate-200 bg-black/10 p-3">
                      <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-slate-700">{item.skill}</span><span className="text-[10px] text-emerald-300/70">{Math.round(item.confidence * 100)}%</span></div>
                      <ul className="mt-2 space-y-1">{item.evidence.map((evidence) => <li key={evidence} className="text-[10px] leading-4 text-slate-500">• {evidence}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>

              {publicInsight.keyContributions.length > 0 ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-black/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Key contributions</p>
                  <ul className="mt-2 space-y-1.5">{publicInsight.keyContributions.map((item) => <li key={item} className="text-xs leading-5 text-slate-500">• {item}</li>)}</ul>
                </div>
              ) : null}

              <div className="mt-5 rounded-lg border border-slate-200 bg-black/10 p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Approval workflow</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-200">✓ Generated</span>
                  <span className={`rounded-full px-2.5 py-1 ${judgeStatus === "approved" || judgeStatus === "published" ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-50 text-slate-500"}`}>{judgeStatus === "approved" || judgeStatus === "published" ? "✓ Approved" : "2 · Approve"}</span>
                  <span className={`rounded-full px-2.5 py-1 ${judgeStatus === "published" ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-50 text-slate-500"}`}>{judgeStatus === "published" ? "✓ Published" : "3 · Publish"}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => void onApproveRepositoryProfile(publicRepository)}
                    disabled={judgeStatus !== "draft"}
                    className="flex-1 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {judgeStatus === "approved" || judgeStatus === "published" ? "Profile approved" : "Approve profile"}
                  </button>
                  <button
                    onClick={() => void onPublishRepositoryProfile(publicRepository)}
                    disabled={judgeStatus !== "approved"}
                    className="flex-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {judgeStatus === "published" ? "Published to portfolio" : "Publish to portfolio"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {repositoryInsightErrors[publicRepository.id] ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">{repositoryInsightErrors[publicRepository.id]}</div> : null}
        </div>
      ) : null}
    </div>
  );

  if (!githubConnection) {
    return (
      <div>
        <PageHeading
          eyebrow="PROJECTS"
          title="Your projects, automatically discovered."
          description="Connect GitHub and CareerSync will turn your repositories into career evidence instead of making you maintain a portfolio by hand."
        />
        {judgePanel}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black">
            <FaGithub size={22} />
          </div>
          <h3 className="mt-5 text-lg font-medium">Connect GitHub to get started</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            CareerSync will discover your repositories first. Later, the evidence engine will classify projects, achievements and skills automatically.
          </p>
          <button
            onClick={() => void onConnectGitHub()}
            disabled={githubConnecting}
            className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
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
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
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
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Reading your GitHub repositories...
        </div>
      ) : githubRepositories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/[0.015] p-10 text-center">
          <FolderGit2 className="mx-auto text-slate-500" size={25} />
          <h3 className="mt-4 font-medium">No repositories found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Your GitHub account is connected, but there are no repositories available to sync yet.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between text-xs text-slate-500">
            <span>{githubRepositories.length} repositories discovered</span>
            <span>Raw GitHub evidence</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {githubRepositories.map((repo) => (
              <div
                key={repo.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderGit2 size={17} className="shrink-0 text-slate-600" />
                      <h3 className="truncate font-medium">{repo.name}</h3>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">{repo.full_name}</p>
                  </div>
                  {repo.private ? (
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-500">
                      Private
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">
                  {repo.description || "No repository description yet."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Primary language</p>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-600">{repo.language || "Not detected"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Last activity</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-600">{formatRepositoryDate(repo.pushed_at || repo.updated_at)}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {repo.topics.slice(0, 4).map((topic) => (
                    <span key={topic} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">{topic}</span>
                  ))}
                </div>

                {repositoryAnalysisErrors[repo.id] ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                    {repositoryAnalysisErrors[repo.id]}
                  </div>
                ) : null}

                {repositoryAnalyses[repo.id] ? (
                  <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] tracking-[0.16em] text-emerald-300/70">ANALYZED</span>
                      <span className="text-[10px] text-slate-500">{Math.round(repositoryAnalyses[repo.id].confidence * 100)}% confidence</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{repositoryAnalyses[repo.id].summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {repositoryAnalyses[repo.id].technologies.slice(0, 6).map((technology) => (
                        <span key={technology} className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-slate-500">{technology}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-slate-400">
                      {repositoryAnalyses[repo.id].evidence.inspectedSourceFileCount} source files inspected · {repositoryAnalyses[repo.id].evidence.manifests.length} manifests · {repositoryAnalyses[repo.id].evidence.recentCommits.length} recent commits
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">README</p>
                        <p className="mt-1 text-[11px] text-slate-600">{repositoryAnalyses[repo.id].evidence.readme.available ? "Verified" : "Not found"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Languages</p>
                        <p className="mt-1 truncate text-[11px] text-slate-600">{repositoryAnalyses[repo.id].repository.language || "Not detected"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Project files</p>
                        <p className="mt-1 text-[11px] text-slate-600">{repositoryAnalyses[repo.id].evidence.sourceFileCount}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-black/10 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Releases</p>
                        <p className="mt-1 text-[11px] text-slate-600">{repositoryAnalyses[repo.id].evidence.releases.length}</p>
                      </div>
                    </div>

                    {repositoryAnalyses[repo.id].evidence.manifests.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Detected project files</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {repositoryAnalyses[repo.id].evidence.manifests.map((file) => (
                            <span key={file} className="rounded-md border border-slate-200 bg-black/10 px-2 py-1 text-[10px] text-slate-500">{file}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {repositoryAnalyses[repo.id].evidence.recentCommits.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-black/10 p-3">
                        <div className="flex items-center gap-2">
                          <GitCommitHorizontal size={13} className="text-white/30" />
                          <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Recent activity</p>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {repositoryAnalyses[repo.id].evidence.recentCommits.slice(0, 3).map((commit) => (
                            <li key={commit.sha} className="truncate text-[10px] text-slate-500">• {commit.message}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {repositoryInsightErrors[repo.id] ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                    {repositoryInsightErrors[repo.id]}
                  </div>
                ) : null}

                {repositoryInsights[repo.id] ? (
                  <div className="mt-4 rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] tracking-[0.16em] text-violet-300/80">PROJECT INTELLIGENCE</span>
                      <span className="text-[10px] text-slate-400">Evidence-grounded</span>
                    </div>
                    <h4 className="mt-2 text-base font-medium text-slate-900">{repositoryInsights[repo.id].projectTitle}</h4>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{repositoryInsights[repo.id].oneLineSummary}</p>

                    <div className="mt-4 grid gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Problem</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{repositoryInsights[repo.id].problem}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Solution</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{repositoryInsights[repo.id].solution}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Technologies</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {repositoryInsights[repo.id].technicalSkills.slice(0, 12).map((skill) => (
                          <span key={skill} className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-slate-500">{skill}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/70">Verified skills + evidence</p>
                        <span className="text-[10px] text-slate-400">Only positively supported skills are shown</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {repositoryInsights[repo.id].demonstratedSkills.length === 0 ? (
                          <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.03] p-3 text-[10px] leading-5 text-amber-200/70">
                            No skills could be verified from the inspected repository evidence. CareerSync will not promote unsupported technologies into the profile.
                          </div>
                        ) : repositoryInsights[repo.id].demonstratedSkills.map((item) => (
                          <div key={item.skill} className="rounded-lg border border-slate-200 bg-black/10 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-slate-700">{item.skill}</span>
                              <span className="text-[10px] text-emerald-300/70">{Math.round(item.confidence * 100)}%</span>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {item.evidence.map((evidence) => (
                                <li key={evidence} className="text-[10px] leading-4 text-slate-500">• {evidence}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {repositoryInsights[repo.id].keyFeatures.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Key features</p>
                        <ul className="mt-2 space-y-1">
                          {repositoryInsights[repo.id].keyFeatures.slice(0, 8).map((feature) => (
                            <li key={feature} className="text-xs leading-5 text-slate-500">• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {repositoryInsights[repo.id].keyContributions.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Key contributions</p>
                        <ul className="mt-2 space-y-1">
                          {repositoryInsights[repo.id].keyContributions.slice(0, 6).map((contribution) => (
                            <li key={contribution} className="text-xs leading-5 text-slate-500">• {contribution}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Evidence signals</p>
                      <ul className="mt-2 space-y-1.5">
                        {repositoryInsights[repo.id].evidenceClaims.slice(0, 6).map((claim) => (
                          <li key={claim} className="text-xs leading-5 text-slate-500">• {claim}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-200 bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Resume-ready</p>
                      <ul className="mt-2 space-y-1.5">
                        {repositoryInsights[repo.id].resumeBullets.slice(0, 4).map((bullet) => (
                          <li key={bullet} className="text-xs leading-5 text-slate-600">• {bullet}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Workflow</p>
                          <p className="mt-1 text-xs text-slate-500">Generate → Approve → Publish</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          {repositoryPublicationStatus[repo.id] ?? "draft"}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => void onApproveRepositoryProfile(repo)}
                          disabled={(repositoryPublicationStatus[repo.id] ?? "draft") !== "draft"}
                          className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void onPublishRepositoryProfile(repo)}
                          disabled={repositoryPublicationStatus[repo.id] !== "approved"}
                          className="flex-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-xs font-medium text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Publish
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => void onAnalyzeRepository(repo)}
                    disabled={repositoryAnalyzing[repo.id]}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {repositoryAnalyzing[repo.id] ? "Analyzing..." : repositoryAnalyses[repo.id] ? "Re-analyze" : "Analyze repository"}
                  </button>
                  {repositoryAnalyses[repo.id] ? (
                    <button
                      onClick={() => void onGenerateCareerInsight(repo)}
                      disabled={repositoryInsightGenerating[repo.id]}
                      className="flex-1 rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-3 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-400/[0.14] disabled:cursor-wait disabled:opacity-60"
                    >
                      {repositoryInsightGenerating[repo.id] ? "Thinking..." : repositoryInsights[repo.id] ? "Regenerate insight" : "Generate career insight"}
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>★ {repo.stargazers_count}</span>
                    <span>⑂ {repo.forks_count}</span>
                  </div>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-slate-500 transition hover:text-slate-950"
                  >
                    GitHub
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs tracking-[0.18em] text-slate-500">PORTFOLIO CONTROL</p>
                <h3 className="mt-2 font-medium">Choose how CareerSync publishes evidence.</h3>
                <p className="mt-1 text-sm text-slate-500">Smart Mode is recommended for most users.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["manual", "smart", "autopilot"] as PortfolioMode[]).map((mode) => (
                  <button key={mode} onClick={() => void onSetPortfolioMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${portfolioMode === mode ? "bg-white text-black" : "border border-slate-200 text-slate-500 hover:text-slate-950"}`}>
                    {mode === "manual" ? "Manual" : mode === "smart" ? "Smart" : "Autopilot"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs tracking-[0.18em] text-slate-500">CAREER EVIDENCE</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Discovered project evidence.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  CareerSync uses evidence-grounded decisions. Smart Mode is the default: routine, well-supported updates can publish automatically while ambiguous items stay with you.
                </p>
              </div>
              {evidenceGenerating ? (
                <span className="text-xs text-slate-500">Analyzing repositories...</span>
              ) : null}
            </div>

            {evidenceError ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                {evidenceError}
              </div>
            ) : null}

            {careerEvidence.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/[0.015] p-8 text-center text-sm text-slate-500">
                Sync GitHub to generate your first career evidence.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {careerEvidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium">{item.title}</h4>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] ${
                            item.status === "approved"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : item.status === "ignored"
                                ? "bg-white/5 text-slate-400"
                                : "bg-amber-400/10 text-amber-300"
                          }`}>
                            {item.status === "pending" ? "Needs review" : item.status === "published" ? "Published" : item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{item.repositoryName}</p>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">{item.description}</p>
                        {item.technologies.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.technologies.map((technology) => (
                              <span key={technology} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
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
                            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-slate-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void onIgnoreEvidence(item.id)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
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

      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/[0.015] p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <Sparkles size={19} />
        </div>
        <h3 className="mt-5 font-medium">Building this next</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          The structure is in place. We'll connect real career evidence here
          instead of using placeholder data.
        </p>
      </div>
    </div>
  );
}

function PortfolioPreview({ user, careerEvidence, onBack }: { user: User; careerEvidence: CareerEvidence[]; onBack?: () => void }) {
  const published = careerEvidence.filter(
    (item) => item.status === "approved" || item.status === "published",
  );
  const technologies = Array.from(
    new Set(published.flatMap((item) => item.technologies)),
  ).slice(0, 14);
  const evidenceCount = published.length;
  const projectCount = published.length;
  const initials =
    user.displayName
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VC";

  return (
    <div className="relative min-h-full overflow-hidden rounded-[32px] bg-[#f8faff] text-slate-950">
      <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200/70 via-indigo-100/60 to-violet-200/70 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-72 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />

      <div className="relative px-5 pb-12 pt-5 md:px-10 md:pb-16 md:pt-8">
        <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
              <Sparkles size={17} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-950">Career<span className="text-blue-600">Sync</span></p>
              <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">Evidence-backed portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
              {published.length > 0 ? "Profile ready" : "Building profile"}
            </span>
            <div className="flex items-center gap-2">
              {onBack ? (
                <button onClick={onBack} className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
                  ← Dashboard
                </button>
              ) : null}
              <a
                href={`mailto:${user.email ?? ""}`}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        <section className="mt-10 grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:mt-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Professional portfolio</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.055em] text-slate-950 md:text-6xl">
              {user.displayName || "Your professional story"}
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                built from your real work.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              CSE (AI &amp; ML) undergraduate focused on AI/ML research, applied projects and software development.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href={published[0]?.sourceUrl || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5">
                Explore my work <ArrowRight size={16} />
              </a>
              <a href="https://github.com/Rin871-tech" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                <FaGithub size={17} /> GitHub
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {["AI / ML", "Research", "Full-Stack Development", "Evidence-backed work"].map((tag) => (
                <span key={tag} className="rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-2 text-xs font-semibold text-blue-700">{tag}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-8 rounded-[40px] bg-gradient-to-br from-blue-300/30 via-violet-200/40 to-indigo-300/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-white bg-white/90 p-5 shadow-[0_25px_80px_rgba(53,86,180,0.14)] backdrop-blur-xl md:p-7">
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? "Profile"} className="h-20 w-20 rounded-2xl object-cover ring-8 ring-blue-50" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-bold text-white ring-8 ring-blue-50">{initials}</div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-extrabold tracking-tight text-slate-950">{user.displayName || "Your Name"}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">CSE (AI &amp; ML) Undergraduate</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
                {[
                  [String(projectCount), "Projects"],
                  [String(technologies.length), "Verified skills"],
                  [String(evidenceCount), "Evidence items"],
                ].map(([value, label], index) => (
                  <div key={label} className={`px-3 py-5 text-center ${index > 0 ? "border-l border-slate-200" : ""}`}>
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Top technologies</p>
                  <span className="text-xs font-medium text-slate-400">Verified evidence</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(technologies.length ? technologies : ["Connect GitHub", "Analyze projects", "Build your profile"]).map((tech) => (
                    <span key={tech} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-slate-200">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 md:mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Selected work</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Projects that prove the work.</h2>
            </div>
            <span className="hidden text-sm font-medium text-slate-400 sm:block">{published.length} verified project{published.length === 1 ? "" : "s"}</span>
          </div>

          {published.length === 0 ? (
            <div className="mt-7 rounded-[26px] border border-dashed border-blue-200 bg-white/80 p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FolderGit2 size={24} /></div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">Your portfolio is ready for its first project.</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Review a discovered repository in Projects, approve the evidence, and it will appear here automatically.</p>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {published.map((item) => (
                <article key={item.id} className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(37,99,235,0.10)]">
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                  <div className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Verified evidence</span>
                        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{item.title}</h3>
                      </div>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"><ExternalLink size={17} /></a>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {item.technologies.slice(0, 8).map((tech) => <span key={`${item.id}-${tech}`} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{tech}</span>)}
                    </div>
                    <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
                      <span className="text-xs font-medium text-slate-400">Source: GitHub repository</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">View evidence <ArrowRight size={14} /></span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 rounded-[28px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 p-7 md:mt-20 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Evidence first</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">A portfolio built from what you actually did.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">CareerSync keeps the repository behind every project and skill so your professional story stays reviewable, explainable and grounded in real work.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20"><ShieldCheck size={29} /></div>
          </div>
        </section>
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

      <div className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? "Profile"}
              className="h-16 w-16 rounded-full border border-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
              <UserRound size={24} />
            </div>
          )}

          <div>
            <h3 className="font-medium">{user.displayName}</h3>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
      <p className="text-xs tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default App;
