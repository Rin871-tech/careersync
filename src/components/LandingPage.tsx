import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Zap,
  GitBranch,
  GitCommit,
  Globe,
  Activity,
  Code2,
  Sliders,
  Eye,
  Bot,
  Workflow,
  Lock,
  RefreshCw,
  FolderGit2,
  Check,
  Database,
  Server,
} from "lucide-react";
import { FaGithub, FaLinkedin, FaGoogle, FaCloudflare } from "react-icons/fa";

interface LandingPageProps {
  onSignIn: () => void;
}

// Sample interactive profiles for the sandbox simulator
const ARCHETYPE_PROFILES = [
  {
    id: "systems",
    role: "Distributed Systems & AI Infrastructure",
    name: "Alex Rivera",
    subdomain: "alex-rivera.careersync.dev",
    location: "San Francisco, CA",
    experience: "Staff Infrastructure Engineer",
    bio: "Building low-latency distributed consensus engines, high-throughput SIMD embedding indexing, and GPU kernel orchestration.",
    confidenceScore: "98.8%",
    repoTarget: "github.com/alexrivera-eng",
    recentCommits: [
      {
        hash: "7f4c9a1",
        msg: "feat(consensus): Raft heartbeat lease & async disk flushes",
        time: "14m ago",
        confidence: "99%",
        verified: true,
      },
      {
        hash: "3b8e21d",
        msg: "perf(simd): AVX-512 cosine vector similarity acceleration",
        time: "2h ago",
        confidence: "98%",
        verified: true,
      },
      {
        hash: "e1a904c",
        msg: "refactor(grpc): streaming backpressure protocol for edge RPC",
        time: "1d ago",
        confidence: "96%",
        verified: true,
      },
    ],
    skills: ["Go", "Rust", "Raft Consensus", "AVX-512", "gRPC", "Prometheus", "Linux eBPF"],
    projects: [
      {
        title: "NexusKV — Distributed Raft-based Key-Value Store",
        desc: "A fault-tolerant, high-throughput distributed storage engine featuring sub-millisecond P99 latency, dynamic cluster membership changes, and LSM-tree persistence.",
        stats: "148 commits • 24 PRs • 1.4k ⭐ • Original Source",
        confidence: 99,
        tags: ["Go", "Raft Protocol", "gRPC", "RocksDB", "Docker"],
        status: "Auto-Published",
        decisionReason: "High commit density, zero fork markers, AST verified 6 core modules.",
      },
      {
        title: "FlashEmbed — SIMD-Accelerated Vector Index",
        desc: "Hardware-accelerated embedding search library utilizing AVX-512 vector extensions and custom memory allocators with zero-copy C-FFI bindings.",
        stats: "86 commits • 9 PRs • 820 ⭐ • Verified Origin",
        confidence: 97,
        tags: ["Rust", "AVX-512", "Python C-FFI", "WebAssembly"],
        status: "Auto-Published",
        decisionReason: "Algorithmic novelty detected, verified benchmark suite passing.",
      },
      {
        title: "KubeMesh — Zero-Overhead Service Fabric",
        desc: "Lightweight eBPF-driven network proxy bypassing standard socket layers for high-density Kubernetes pod communication.",
        stats: "64 commits • 5 PRs • 540 ⭐ • Verified Origin",
        confidence: 95,
        tags: ["C++", "eBPF", "Kubernetes", "Linux Kernel"],
        status: "Auto-Published",
        decisionReason: "Original kernel probes and custom eBPF bytecode verified.",
      },
    ],
  },
  {
    id: "fullstack_ai",
    role: "Full-Stack AI & Autonomous Agents",
    name: "Elena Rostova",
    subdomain: "elena-rostova.careersync.dev",
    location: "New York, NY",
    experience: "Senior Full-Stack AI Engineer",
    bio: "Architecting autonomous multi-agent orchestration systems, multimodal streaming interfaces, and high-performance WebGL visualization tools.",
    confidenceScore: "97.4%",
    repoTarget: "github.com/elena-rostova",
    recentCommits: [
      {
        hash: "9a2b5ef",
        msg: "feat(agent): tree-of-thought DAG reasoning graph engine",
        time: "38m ago",
        confidence: "98%",
        verified: true,
      },
      {
        hash: "1d4c82a",
        msg: "feat(streaming): zero-latency WebRTC bidirectional audio stream",
        time: "4h ago",
        confidence: "96%",
        verified: true,
      },
      {
        hash: "6f7e31b",
        msg: "ui(canvas): WebGL shader graph renderer for memory state",
        time: "1d ago",
        confidence: "95%",
        verified: true,
      },
    ],
    skills: ["TypeScript", "Python", "PyTorch", "Next.js", "WebRTC", "WebGL", "TailwindCSS"],
    projects: [
      {
        title: "SynapseFlow — Autonomous Multi-Agent Orchestration",
        desc: "Decentralized task delegation engine allowing autonomous LLM agents to collaborate via directed acyclic graphs with self-correcting tool feedback loops.",
        stats: "210 commits • 32 PRs • 2.1k ⭐ • Original Source",
        confidence: 98,
        tags: ["TypeScript", "Python", "FastAPI", "Redis Streams", "PostgreSQL"],
        status: "Auto-Published",
        decisionReason: "Comprehensive test suite, complex DAG execution architecture.",
      },
      {
        title: "OmniVoice — Real-Time Multimodal Voice Copilot",
        desc: "Low-latency streaming browser assistant with on-device voice activity detection and bidirectional WebSocket LLM token streaming.",
        stats: "112 commits • 14 PRs • 1.1k ⭐ • Verified Origin",
        confidence: 96,
        tags: ["React", "WebRTC", "WebAudio API", "Cloudflare Workers"],
        status: "Auto-Published",
        decisionReason: "Verified real-time streaming audio pipeline and custom hook architecture.",
      },
    ],
  },
  {
    id: "security",
    role: "Cloud Security & Cryptographic Systems",
    name: "Kaelen Vance",
    subdomain: "kaelen-vance.careersync.dev",
    location: "London, UK",
    experience: "Principal Security Architect",
    bio: "Specializing in Zero-Knowledge proof circuits, cloud enclave cryptography, and post-quantum key encapsulation protocols.",
    confidenceScore: "99.1%",
    repoTarget: "github.com/kaelen-vance",
    recentCommits: [
      {
        hash: "4d9f12b",
        msg: "feat(zkp): PLONK arithmetic constraint system optimizer",
        time: "5m ago",
        confidence: "99%",
        verified: true,
      },
      {
        hash: "8c3a77e",
        msg: "sec(enclave): AWS Nitro attestation signature verification",
        time: "3h ago",
        confidence: "98%",
        verified: true,
      },
      {
        hash: "2e1f40d",
        msg: "crypto(kyber): ML-KEM post-quantum key encapsulation shim",
        time: "8h ago",
        confidence: "97%",
        verified: true,
      },
    ],
    skills: ["Rust", "Circom", "ZKP / PLONK", "AWS Nitro", "Kyber", "Formal Verification"],
    projects: [
      {
        title: "ZK-Shield — Zero-Knowledge Identity Verification",
        desc: "Cryptographic protocol proving user authorization and credential criteria without revealing underlying identity metadata or credentials.",
        stats: "176 commits • 28 PRs • 1.8k ⭐ • Original Source",
        confidence: 99,
        tags: ["Rust", "Circom", "PLONK", "WebAssembly", "TypeScript"],
        status: "Auto-Published",
        decisionReason: "Verified mathematical constraint proofs and comprehensive formal checks.",
      },
      {
        title: "EnclavePass — Hardware-Isolated KMS Gateway",
        desc: "Secure cryptographic key management proxy executing inside hardware-isolated trusted execution environments with remote attestation.",
        stats: "94 commits • 11 PRs • 930 ⭐ • Verified Origin",
        confidence: 97,
        tags: ["Rust", "AWS Nitro", "gRPC", "TLS 1.3"],
        status: "Auto-Published",
        decisionReason: "Zero-leakage memory guarantees and secure attestation validation.",
      },
    ],
  },
];

export function LandingPage({ onSignIn }: LandingPageProps) {
  const [activeArchetype, setActiveArchetype] = useState(ARCHETYPE_PROFILES[0]);
  const [activeTerminalTab, setActiveTerminalTab] = useState<"portfolio" | "pipeline" | "decision">("portfolio");
  const [activeSyncMode, setActiveSyncMode] = useState<"autopilot" | "smart" | "manual">("smart");
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);

  const triggerLiveSimulation = () => {
    if (isSimulatingSync) return;
    setIsSimulatingSync(true);
    setSimulationStep(1);

    setTimeout(() => setSimulationStep(2), 700);
    setTimeout(() => setSimulationStep(3), 1500);
    setTimeout(() => {
      setSimulationStep(4);
      setIsSimulatingSync(false);
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-zinc-100 font-sans antialiased selection:bg-zinc-100 selection:text-black">
      {/* Precision Top Telemetry Bar */}
      <div className="border-b border-white/[0.07] bg-[#050608]/90 text-[11px] font-mono tracking-wider text-zinc-400 py-1.5 px-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              SYS_V2.4 ONLINE
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline text-zinc-400">
              AUTONOMOUS EVIDENCE PIPELINE ACTIVE
            </span>
            <span className="hidden md:inline text-zinc-600">|</span>
            <span className="hidden md:inline text-zinc-400">
              EDGE INGESTION LATENCY: <span className="text-zinc-200">14ms</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden lg:inline text-zinc-400">
              ORIGINALITY CONFIDENCE: <span className="text-emerald-400 font-medium">98.4%</span>
            </span>
            <button
              onClick={onSignIn}
              className="text-zinc-300 hover:text-white transition flex items-center gap-1 font-mono text-[11px] underline underline-offset-2"
            >
              Sign in with Google →
            </button>
          </div>
        </div>
      </div>

      {/* Floating Glass-Matte Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#08090b]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-zinc-900 text-white shadow-sm transition group-hover:border-white/40 group-hover:bg-zinc-800">
                <Sparkles size={16} className="text-zinc-200" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight text-white flex items-center gap-1.5 font-heading">
                  CareerSync
                  <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-mono font-medium tracking-wide text-zinc-400">
                    AI // LIVE
                  </span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono -mt-0.5">
                  Autonomous Portfolio Engine
                </span>
              </div>
            </a>
          </div>

          <nav className="hidden items-center gap-7 text-xs font-medium text-zinc-300 md:flex">
            <a href="#architecture" className="transition hover:text-white">
              Architecture
            </a>
            <a href="#evidence-engine" className="transition hover:text-white">
              Evidence Engine
            </a>
            <a href="#sync-modes" className="transition hover:text-white">
              Sync Modes
            </a>
            <a href="#showcase" className="transition hover:text-white">
              Living Showcase
            </a>
            <a href="#security" className="transition hover:text-white">
              Edge Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <FaGoogle size={12} className="text-zinc-800" />
              <span>Launch Portfolio</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION: Editorial + Dark Developer AI Aesthetic */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 bg-tech-grid">
          {/* Subtle Ambient Radial Lighting */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.07),transparent_70%)]" />
          <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-zinc-800/20 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-6 text-center">
            {/* Monospace Badge */}
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-300 shadow-inner backdrop-blur-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-zinc-400">ENGINEERING INTELLIGENCE v2.4</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-200">Zero Manual Maintenance</span>
            </div>

            {/* Master Editorial Headline */}
            <h1 className="mx-auto max-w-5xl font-heading text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
              Your engineering impact,{" "}
              <span className="font-serif italic font-normal text-zinc-300 block sm:inline">
                synthesized
              </span>{" "}
              in real time.
            </h1>

            {/* Technical Subheadline */}
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Connect your GitHub, repositories, and technical footprint. CareerSync’s autonomous evidence engine continuously analyzes commits, evaluates architectural depth, verifies source provenance, and deploys a living, high-conviction engineering portfolio directly to the global edge.
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <button
                onClick={onSignIn}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-zinc-100 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-xl transition hover:bg-white hover:scale-[1.01] sm:w-auto"
              >
                <FaGoogle size={15} />
                <span>Connect with Google & Launch</span>
                <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </button>

              <a
                href="#architecture"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-zinc-900/60 px-6 py-3.5 text-sm font-medium text-zinc-200 backdrop-blur-sm transition hover:border-white/25 hover:bg-zinc-900 sm:w-auto"
              >
                <span>Explore Technical Architecture</span>
                <ArrowRight size={14} className="rotate-90 text-zinc-400" />
              </a>
            </div>

            {/* Telemetry Precision Strip */}
            <div className="mt-14 grid grid-cols-2 gap-3 border-y border-white/[0.08] py-6 sm:grid-cols-4 bg-zinc-950/40 backdrop-blur-sm">
              <div className="px-4 text-center sm:border-r sm:border-white/[0.08]">
                <div className="font-mono text-2xl font-bold text-white tracking-tight">98.4%</div>
                <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Provenance Precision</div>
              </div>
              <div className="px-4 text-center sm:border-r sm:border-white/[0.08]">
                <div className="font-mono text-2xl font-bold text-white tracking-tight">&lt; 1.2s</div>
                <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Ingest to Edge</div>
              </div>
              <div className="px-4 text-center sm:border-r sm:border-white/[0.08]">
                <div className="font-mono text-2xl font-bold text-white tracking-tight">3 Sync Modes</div>
                <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Autopilot to Strict</div>
              </div>
              <div className="px-4 text-center">
                <div className="font-mono text-2xl font-bold text-emerald-400 tracking-tight">0 hrs/mo</div>
                <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Manual Maintenance</div>
              </div>
            </div>
          </div>

          {/* MASTER INTERACTIVE PRODUCT WORKSTATION */}
          <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6">
            {/* Archetype Selector for the Live Preview */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Select Engineering Archetype:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ARCHETYPE_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setActiveArchetype(profile)}
                      className={`rounded-md px-2.5 py-1 text-xs font-mono transition ${
                        activeArchetype.id === profile.id
                          ? "bg-zinc-200 text-zinc-950 font-semibold shadow-sm"
                          : "bg-zinc-900/80 text-zinc-400 border border-white/[0.08] hover:text-zinc-200 hover:border-white/20"
                      }`}
                    >
                      {profile.role.split(" & ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Simulation Trigger */}
              <button
                onClick={triggerLiveSimulation}
                disabled={isSimulatingSync}
                className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSimulatingSync ? "animate-spin" : ""} />
                {isSimulatingSync ? "Simulating Git Ingestion..." : "Simulate `git push` Ingest"}
              </button>
            </div>

            {/* Main Terminal Window Frame */}
            <div className="overflow-hidden rounded-xl border border-white/[0.12] bg-[#0c0d10] shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
              {/* Window Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#08090b] px-4 py-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-zinc-700/60" />
                  <div className="h-3 w-3 rounded-full bg-zinc-700/60" />
                  <div className="h-3 w-3 rounded-full bg-zinc-700/60" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-400 hidden sm:inline">
                    career-evidence-runtime.node
                  </span>
                </div>

                {/* Subdomain URL pill */}
                <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-zinc-900/90 px-3 py-1 font-mono text-xs text-zinc-300">
                  <Globe size={12} className="text-emerald-400" />
                  <span>https://{activeArchetype.subdomain}</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 font-semibold">
                    EDGE SSL
                  </span>
                </div>

                {/* Workstation View Switchers */}
                <div className="flex items-center rounded-lg border border-white/[0.08] bg-zinc-950 p-0.5">
                  <button
                    onClick={() => setActiveTerminalTab("portfolio")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition ${
                      activeTerminalTab === "portfolio"
                        ? "bg-zinc-800 text-white font-medium shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Eye size={12} />
                    <span>Portfolio View</span>
                  </button>
                  <button
                    onClick={() => setActiveTerminalTab("pipeline")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition ${
                      activeTerminalTab === "pipeline"
                        ? "bg-zinc-800 text-white font-medium shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <GitBranch size={12} />
                    <span>AST Pipeline</span>
                  </button>
                  <button
                    onClick={() => setActiveTerminalTab("decision")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition ${
                      activeTerminalTab === "decision"
                        ? "bg-zinc-800 text-white font-medium shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Cpu size={12} />
                    <span>AI Reasoning</span>
                  </button>
                </div>
              </div>

              {/* Simulation Banner Notification */}
              {isSimulatingSync && (
                <div className="border-b border-emerald-500/30 bg-emerald-950/40 px-4 py-2 font-mono text-xs text-emerald-300 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400 animate-spin" />
                    <span>
                      {simulationStep === 1 && "Ingesting new commits from GitHub Webhook..."}
                      {simulationStep === 2 && "Parsing Abstract Syntax Tree & checking fork provenance..."}
                      {simulationStep === 3 && "Confidence score computed (99.2%). Generating markdown case study..."}
                      {simulationStep === 4 && "Published to Cloudflare Edge in 240ms!"}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80">STEP {simulationStep} / 4</span>
                </div>
              )}

              {/* Workstation Body Grid */}
              <div className="grid lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
                {/* Left Telemetry Rail */}
                <aside className="p-4 sm:p-5 bg-[#090a0d] space-y-5">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      <span>Source Provenance</span>
                      <span className="text-emerald-400 font-semibold">SYNCED</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-zinc-900/70 p-2.5">
                      <FaGithub size={18} className="text-white" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">
                          {activeArchetype.name}
                        </div>
                        <div className="truncate text-[11px] font-mono text-zinc-400">
                          {activeArchetype.repoTarget}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Ingested Commit Stream */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      <span>Recent Commits Ingested</span>
                      <span className="text-[10px] text-zinc-400">AST_PARSED</span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {activeArchetype.recentCommits.map((c, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-white/[0.06] bg-zinc-950/60 p-2.5 text-xs hover:border-white/[0.15] transition"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <GitCommit size={11} className="text-emerald-400" />
                              {c.hash}
                            </span>
                            <span>{c.time}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-zinc-300 leading-snug font-sans">
                            {c.msg}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-emerald-400">Confidence: {c.confidence}</span>
                            <span className="text-zinc-400">Non-Fork Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inferred Skill Taxonomy */}
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Inferred Tech Taxonomy
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {activeArchetype.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>

                {/* Main View Area */}
                <div className="p-5 sm:p-7 bg-[#0b0c0f]">
                  {activeTerminalTab === "portfolio" && (
                    <div className="space-y-6">
                      {/* Editorial Profile Header */}
                      <div className="border-b border-white/[0.08] pb-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 mb-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              AUTONOMOUSLY COMPILED PORTFOLIO
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-white font-heading">
                              {activeArchetype.name}
                            </h2>
                            <p className="text-xs font-mono text-zinc-400 mt-0.5">
                              {activeArchetype.experience} • {activeArchetype.location}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="rounded-lg border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-right font-mono">
                              <div className="text-[10px] text-zinc-400">OVERALL CONFIDENCE</div>
                              <div className="text-sm font-bold text-emerald-400">
                                {activeArchetype.confidenceScore}
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-zinc-300 font-sans max-w-2xl">
                          {activeArchetype.bio}
                        </p>
                      </div>

                      {/* Evidence Project Artifacts */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <FolderGit2 size={13} className="text-zinc-300" />
                            Synthesized Evidence Projects ({activeArchetype.projects.length})
                          </h3>
                          <span className="text-[11px] font-mono text-emerald-400">
                            ● Real-time Provenance Verified
                          </span>
                        </div>

                        <div className="grid gap-4">
                          {activeArchetype.projects.map((proj, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 sm:p-5 transition hover:border-white/20 hover:bg-zinc-900/70"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white group-hover:text-zinc-100 transition">
                                      {proj.title}
                                    </h4>
                                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300">
                                      {proj.confidence}% Confidence
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] font-mono text-zinc-400">
                                    {proj.stats}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-mono text-zinc-300">
                                    {proj.status}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-3 text-xs leading-relaxed text-zinc-300 font-sans">
                                {proj.desc}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {proj.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="rounded bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/[0.05]"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                <div className="text-[10px] font-mono text-zinc-400 italic">
                                  {proj.decisionReason}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTerminalTab === "pipeline" && (
                    <div className="space-y-4 font-mono text-xs text-zinc-300">
                      <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-4 space-y-2">
                        <div className="text-zinc-400">// Ingestion Pipeline Execution Log (Live)</div>
                        <div className="text-emerald-400">
                          [0.00ms] Webhook event received: push (branch: refs/heads/main)
                        </div>
                        <div className="text-zinc-300">
                          [1.12ms] Fetching Git tree diff: 3 files modified, 142 insertions
                        </div>
                        <div className="text-zinc-300">
                          [4.80ms] AST Parser: Detected 2 new Go structs, 1 Raft state transition handler
                        </div>
                        <div className="text-zinc-300">
                          [8.40ms] Originality Checker: Match against public fork graphs = 0.02% (ORIGINAL CODEBASE)
                        </div>
                        <div className="text-emerald-400">
                          [12.10ms] AI Confidence Matrix calculated: 0.988 (PASS THRESHOLD &gt; 0.85)
                        </div>
                        <div className="text-zinc-300">
                          [15.30ms] Cloudflare Edge invalidation triggered for {activeArchetype.subdomain}
                        </div>
                        <div className="text-emerald-300 font-bold">
                          [18.90ms] SUCCESS: Edge live in 330+ locations worldwide.
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-3.5">
                          <div className="text-zinc-400 text-[11px] mb-1">AST COMPLEXITY RATING</div>
                          <div className="text-lg font-bold text-white">A+ (High Architectural Depth)</div>
                          <div className="text-[10px] text-zinc-400 mt-1">Multi-threaded concurrency & network state machines detected.</div>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-3.5">
                          <div className="text-zinc-400 text-[11px] mb-1">FORK & BOILERPLATE ISOLATION</div>
                          <div className="text-lg font-bold text-emerald-400">0% Boilerplate</div>
                          <div className="text-[10px] text-zinc-400 mt-1">Template repositories automatically isolated from evidence.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTerminalTab === "decision" && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-4 font-mono text-xs">
                        <div className="text-zinc-400 mb-2">// AI Decision Engine Breakdown: "NexusKV"</div>
                        <div className="space-y-2 text-zinc-300">
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                            <span>Repository Originality:</span>
                            <span className="text-emerald-400 font-bold">100% (Original Root)</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                            <span>Commit History & PR Velocity:</span>
                            <span className="text-emerald-400 font-bold">148 commits / 24 PRs</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                            <span>Language & Topic Depth:</span>
                            <span className="text-emerald-400 font-bold">Go, Raft, gRPC, RocksDB</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                            <span>Automated Action:</span>
                            <span className="text-white font-bold bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-300">
                              AUTO_PUBLISH_TO_EDGE
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/[0.08] bg-zinc-900/40 p-4 text-xs text-zinc-300 leading-relaxed font-sans">
                        <div className="font-semibold text-white mb-1 flex items-center gap-1.5 font-mono">
                          <Bot size={13} className="text-emerald-400" />
                          AI Synthesis Explanation
                        </div>
                        The evidence engine automatically synthesizes technical achievements by extracting architectural patterns from your repository's AST, measuring commit cadence, and verifying the technical complexity of your code — eliminating manual portfolio drafting.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: ARCHITECTURE & 3-STEP PRECISION PIPELINE */}
        <section id="architecture" className="border-t border-white/[0.08] bg-[#07080a] py-24 px-6 relative">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Workflow size={14} />
                <span>SYSTEM ARCHITECTURE</span>
              </div>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The Autonomous Career Intelligence Pipeline
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
                How CareerSync turns raw code pushes into cryptographic evidence and magazine-grade living portfolios without manual overhead.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3 relative">
              {/* Step 01 */}
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 sm:p-8 backdrop-blur-sm relative group hover:border-white/20 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1">
                    PHASE 01
                  </span>
                  <GitBranch size={18} className="text-zinc-400 group-hover:text-white transition" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-white font-heading">
                  Multi-Source Ingestion
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-300 font-sans">
                  Real-time webhook and GraphQL connectors monitor your GitHub repositories, code commits, merged PRs, and release artifacts as you ship.
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-zinc-400 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Non-invasive read scopes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Automatic fork filtering</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Zero private key exposure</span>
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 sm:p-8 backdrop-blur-sm relative group hover:border-white/20 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1">
                    PHASE 02
                  </span>
                  <Cpu size={18} className="text-zinc-400 group-hover:text-white transition" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-white font-heading">
                  AST & Confidence Scoring
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-300 font-sans">
                  Our LLM and AST reasoning engine isolates boilerplate from original logic, quantifies complexity, extracts tech taxonomy, and scores provenance confidence.
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-zinc-400 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Algorithmic confidence (0-100%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Architecture summary generation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Automated tech badge mapping</span>
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 sm:p-8 backdrop-blur-sm relative group hover:border-white/20 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1">
                    PHASE 03
                  </span>
                  <Globe size={18} className="text-zinc-400 group-hover:text-white transition" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-white font-heading">
                  Global Edge Compilation
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-300 font-sans">
                  Instantly renders an editorial, high-speed living portfolio deployed across Cloudflare global edge networks with custom subdomains and zero maintenance.
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-zinc-400 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>&lt; 20ms global edge latency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Custom yourname.careersync.dev</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400" />
                    <span>Zero-latency cache invalidation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: 3 AUTONOMOUS SYNC ENGINES */}
        <section id="sync-modes" className="border-t border-white/[0.08] bg-[#090a0d] py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto">
              <div className="font-mono text-xs uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-2">
                <Sliders size={14} />
                <span>DYNAMIC CONTROL MODES</span>
              </div>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                You dictate the level of autonomy
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                Choose between hands-free autopilot, intelligent one-click curation, or strict manual review. Change modes at any time.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mt-12 grid md:grid-cols-3 gap-4">
              {/* Autopilot Mode Card */}
              <div
                onClick={() => setActiveSyncMode("autopilot")}
                className={`cursor-pointer rounded-2xl border p-6 transition ${
                  activeSyncMode === "autopilot"
                    ? "border-emerald-500/50 bg-zinc-900/90 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                    : "border-white/[0.08] bg-zinc-950/50 hover:border-white/20 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                      <Zap size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-heading">Autopilot Mode</h3>
                      <span className="font-mono text-[10px] text-emerald-400">100% Autonomous</span>
                    </div>
                  </div>
                  <span className={`h-3 w-3 rounded-full border ${activeSyncMode === "autopilot" ? "bg-emerald-400 border-emerald-400" : "border-white/20"}`} />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-300 font-sans">
                  Zero manual touch. Every original production repository meeting confidence thresholds automatically compiles and deploys to your live portfolio domain as soon as you push code.
                </p>

                <div className="mt-5 rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400 border border-white/[0.05]">
                  <span className="text-zinc-400 block mb-1">// Ideal for:</span>
                  Active developers shipping code who want their portfolio to stay continuously updated in the background.
                </div>
              </div>

              {/* Smart Curation Mode Card */}
              <div
                onClick={() => setActiveSyncMode("smart")}
                className={`cursor-pointer rounded-2xl border p-6 transition ${
                  activeSyncMode === "smart"
                    ? "border-white/40 bg-zinc-900/90 shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                    : "border-white/[0.08] bg-zinc-950/50 hover:border-white/20 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-200 font-mono text-xs font-bold">
                      <Bot size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-heading">Smart Curation</h3>
                      <span className="font-mono text-[10px] text-zinc-300 font-semibold">AI Recommended</span>
                    </div>
                  </div>
                  <span className={`h-3 w-3 rounded-full border ${activeSyncMode === "smart" ? "bg-zinc-100 border-zinc-100" : "border-white/20"}`} />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-300 font-sans">
                  The AI continuously discovers repositories and generates drafted case studies, confidence scores, and tags. You approve or dismiss items with a single click.
                </p>

                <div className="mt-5 rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400 border border-white/[0.05]">
                  <span className="text-zinc-400 block mb-1">// Ideal for:</span>
                  Engineers wanting AI speed with executive sign-off before publishing case studies.
                </div>
              </div>

              {/* Manual Control Mode Card */}
              <div
                onClick={() => setActiveSyncMode("manual")}
                className={`cursor-pointer rounded-2xl border p-6 transition ${
                  activeSyncMode === "manual"
                    ? "border-white/40 bg-zinc-900/90 shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                    : "border-white/[0.08] bg-zinc-950/50 hover:border-white/20 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-200 font-mono text-xs font-bold">
                      <Sliders size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-heading">Manual Strict</h3>
                      <span className="font-mono text-[10px] text-zinc-400">Total Control</span>
                    </div>
                  </div>
                  <span className={`h-3 w-3 rounded-full border ${activeSyncMode === "manual" ? "bg-zinc-100 border-zinc-100" : "border-white/20"}`} />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-300 font-sans">
                  Nothing publishes without explicit manual configuration. Customize every single project description, technology tag, and metrics showcase by hand.
                </p>

                <div className="mt-5 rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400 border border-white/[0.05]">
                  <span className="text-zinc-400 block mb-1">// Ideal for:</span>
                  Tailored senior portfolio curation with granular custom storytelling.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: EVIDENCE ENGINE VS STATIC RESUME COMPARISON */}
        <section id="evidence-engine" className="border-t border-white/[0.08] bg-[#07080a] py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Code2 size={14} />
                <span>EVIDENCE VS CLAIMS</span>
              </div>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Why Static Portfolios Are Becoming Obsolete
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                In an era of AI code generators, hiring managers look for verifiable provenance and real-world commit telemetry rather than self-reported keyword lists.
              </p>
            </div>

            {/* Comparison Matrix Table */}
            <div className="mt-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
                {/* Headers */}
                <div className="p-6 bg-zinc-900/40 hidden md:block">
                  <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">Evaluation Dimension</span>
                </div>
                <div className="p-6 bg-zinc-900/60 border-b md:border-b-0">
                  <div className="font-mono text-xs text-zinc-400 uppercase tracking-wider">Legacy Static Resumes</div>
                  <div className="text-sm font-semibold text-zinc-400 mt-1">Manual PDF & Web Templates</div>
                </div>
                <div className="p-6 bg-zinc-900/90 border-b md:border-b-0">
                  <div className="font-mono text-xs text-emerald-400 uppercase tracking-wider">CareerSync Intelligence</div>
                  <div className="text-sm font-semibold text-white mt-1">Living Verifiable Evidence Engine</div>
                </div>
              </div>

              {/* Rows */}
              {[
                {
                  dim: "Source Verification",
                  legacy: "Unverifiable bullet points and claims; easily exaggerated or copied.",
                  sync: "Cryptographic commit provenance, PR velocity, and AST code complexity checks.",
                },
                {
                  dim: "Maintenance Cadence",
                  legacy: "Manual drafting once every 1–2 years; quickly becomes stale and outdated.",
                  sync: "Zero manual effort; autonomously ingests and updates on every git push.",
                },
                {
                  dim: "Skill Taxonomy",
                  legacy: "Static lists of 30+ keywords with no proof of mastery.",
                  sync: "Dynamic taxonomy mapped directly from active codebase dependencies and frameworks.",
                },
                {
                  dim: "Deployment & Latency",
                  legacy: "Clunky attachments, broken links, or neglected DIY websites.",
                  sync: "Cloudflare global edge distribution (<20ms) with custom subdomains.",
                },
                {
                  dim: "Review Control",
                  legacy: "All-or-nothing manual updates.",
                  sync: "3 flexible modes: Autopilot, 1-Click Smart Curation, or Strict Review.",
                },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-3 border-t border-white/[0.06] divide-y md:divide-y-0 md:divide-x divide-white/[0.06] text-xs font-sans"
                >
                  <div className="p-5 font-mono text-zinc-300 font-semibold bg-zinc-900/20">
                    {row.dim}
                  </div>
                  <div className="p-5 text-zinc-400 leading-relaxed bg-zinc-950/40">
                    <span className="md:hidden font-mono text-[10px] text-zinc-400 block mb-1 uppercase">Legacy:</span>
                    {row.legacy}
                  </div>
                  <div className="p-5 text-zinc-200 leading-relaxed bg-zinc-900/30 flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="md:hidden font-mono text-[10px] text-emerald-400 block mb-1 uppercase">CareerSync:</span>
                      {row.sync}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: VERIFIABLE PROOF & SECURITY */}
        <section id="security" className="border-t border-white/[0.08] bg-[#090a0d] py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <ShieldCheck size={14} />
                  <span>PRIVACY & EDGE SECURITY</span>
                </div>
                <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Built with zero-trust architectural integrity
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                  CareerSync is engineered to protect your intellectual property. We analyze public activity and only ingest authorized repositories without ever accessing proprietary backend secrets.
                </p>

                <div className="mt-8 space-y-4 font-mono text-xs text-zinc-300">
                  <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                    <Lock size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">Zero Private Repository Exposure</div>
                      <div className="text-zinc-400 mt-1 font-sans text-xs">
                        Private repositories are never indexed or published unless you explicitly approve sanitized metadata summaries.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                    <Server size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">Decentralized Global Edge CDN</div>
                      <div className="text-zinc-400 mt-1 font-sans text-xs">
                        Your public portfolio is deployed via Cloudflare Workers and Pages across 330+ points of presence worldwide.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                    <Database size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">Full Data Ownership & Export</div>
                      <div className="text-zinc-400 mt-1 font-sans text-xs">
                        Export your synthesized portfolio data to JSON, Markdown, or raw static bundle anytime with zero vendor lock-in.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Diagnostics Terminal Box */}
              <div className="rounded-2xl border border-white/[0.12] bg-[#0c0d10] p-6 shadow-2xl font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-zinc-400 text-[11px]">
                  <span>security_audit_matrix.json</span>
                  <span className="text-emerald-400">PASSED (100%)</span>
                </div>

                <div className="mt-4 space-y-3 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Authentication Protocol:</span>
                    <span className="text-white">Google OAuth 2.0 PKCE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">GitHub Token Storage:</span>
                    <span className="text-white">Client-side ephemeral / Encrypted</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Database Engine:</span>
                    <span className="text-white">Google Cloud Firestore (Enterprise)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Edge Distribution:</span>
                    <span className="text-white">Cloudflare Edge (TLS 1.3 / HTTP/3)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Fork & Plagiarism Filter:</span>
                    <span className="text-emerald-400">Active (SHA Tree Matching)</span>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-300">
                  ✓ Continuous vulnerability monitoring active • All security compliance criteria verified.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: INTEGRATIONS ECOSYSTEM */}
        <section id="integrations" className="border-t border-white/[0.08] bg-[#07080a] py-20 px-6">
          <div className="mx-auto max-w-6xl text-center">
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              SUPPORTED DEVELOPER ECOSYSTEM
            </div>
            <h3 className="mt-3 font-heading text-2xl font-bold tracking-tight text-white">
              Connect the platforms where you build
            </h3>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 transition hover:border-white/20">
                <FaGithub size={22} className="text-white" />
                <div className="text-left font-mono text-xs">
                  <div className="font-semibold text-white">GitHub</div>
                  <div className="text-[10px] text-emerald-400">Active Connector</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 transition hover:border-white/20">
                <FaCloudflare size={22} className="text-orange-400" />
                <div className="text-left font-mono text-xs">
                  <div className="font-semibold text-white">Cloudflare Edge</div>
                  <div className="text-[10px] text-emerald-400">Global DNS / CDN</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 transition hover:border-white/20">
                <FaGoogle size={20} className="text-white" />
                <div className="text-left font-mono text-xs">
                  <div className="font-semibold text-white">Google Identity</div>
                  <div className="text-[10px] text-emerald-400">Enterprise Auth</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 transition hover:border-white/20">
                <FaLinkedin size={22} className="text-blue-400" />
                <div className="text-left font-mono text-xs">
                  <div className="font-semibold text-white">LinkedIn</div>
                  <div className="text-[10px] text-zinc-400">Connector Ready</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: FINAL EDITORIAL CALL TO ACTION */}
        <section className="border-t border-white/[0.08] bg-tech-grid relative py-24 px-6 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(255,255,255,0.06),transparent_80%)]" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-300 mb-6 font-mono">
              <Sparkles size={13} className="text-emerald-400" />
              AUTONOMOUS DEPLOYMENT IN 30 SECONDS
            </div>

            <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Stop maintaining your portfolio.
              <span className="block font-serif italic font-normal text-zinc-300 mt-2">
                Let your code speak for itself.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-300">
              Connect your GitHub account in 30 seconds. CareerSync immediately analyzes your public repositories and generates your verifiable living portfolio on the edge.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={onSignIn}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-zinc-100 px-8 py-4 text-base font-semibold text-zinc-950 shadow-2xl transition hover:bg-white hover:scale-[1.02] sm:w-auto"
              >
                <FaGoogle size={16} />
                <span>Get Started with Google</span>
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-400" /> Free during public preview
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-400" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-400" /> Instant edge deployment
              </span>
            </div>
          </div>
        </section>

        {/* TECHNICAL FOOTER */}
        <footer className="border-t border-white/[0.08] bg-[#050608] py-12 px-6">
          <div className="mx-auto max-w-7xl flex flex-col gap-8 md:flex-row md:items-center md:justify-between text-xs text-zinc-400 font-mono">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-white font-semibold font-heading text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 border border-white/20 text-white">
                  <Sparkles size={12} />
                </div>
                <span>CareerSync</span>
              </div>
              <p className="text-[11px] text-zinc-400 max-w-sm font-sans">
                Autonomous AI career intelligence and evidence-backed developer portfolio platform.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <a href="#architecture" className="hover:text-white transition">
                Architecture
              </a>
              <a href="#evidence-engine" className="hover:text-white transition">
                Evidence Engine
              </a>
              <a href="#sync-modes" className="hover:text-white transition">
                Sync Modes
              </a>
              <a href="#security" className="hover:text-white transition">
                Security & Edge
              </a>
              <button onClick={onSignIn} className="hover:text-white transition text-zinc-300">
                Sign In
              </button>
            </div>

            <div className="flex flex-col md:items-end gap-1 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                ALL SYSTEMS OPERATIONAL
              </span>
              <span>© {new Date().getFullYear()} CareerSync Inc. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default LandingPage;
