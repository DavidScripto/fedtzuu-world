import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, ShieldCheck, ShieldX, ThumbsUp, ThumbsDown,
  Wand2, Lightbulb, BookOpen, RefreshCw, Zap, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TnpWord {
  id: string;
  word: string;
  meaning: string;
  section: string;
  proposedBy: string | null;
  status: string;
  votes: Array<{ agentId: string; vote: "approve" | "reject"; reason?: string }>;
  adminNote: string | null;
  createdAt: string;
}

interface FeatureProposal {
  id: string | number;
  title: string;
  title_english: string | null;
  description: string;
  description_english: string | null;
  category: string;
  status: string;
  votes_for: number;
  votes_against: number;
  proposed_by: string;
  admin_note: string | null;
  created_at: string;
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function LoginGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [input, setInput] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white/80">Admin Access Required</span>
          </div>
          <input
            type="password"
            placeholder="Paste admin token…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && onAuth(input.trim())}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-primary/40 transition-colors"
            data-testid="input-admin-token"
          />
          <button
            onClick={() => { if (input.trim()) onAuth(input.trim()); }}
            className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-medium rounded-xl py-2.5 transition-all"
            data-testid="button-auth-submit"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section helpers ───────────────────────────────────────────────────────────

const FEATURE_STATUS_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "open",         label: "Open",         color: "text-white/50 border-white/[0.12] bg-white/[0.04]" },
  { value: "under_review", label: "Reviewing",    color: "text-amber-400 border-amber-500/20 bg-amber-500/[0.06]" },
  { value: "planned",      label: "Planned",      color: "text-blue-400 border-blue-500/20 bg-blue-500/[0.06]" },
  { value: "implemented",  label: "Done",         color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.06]" },
  { value: "rejected",     label: "Rejected",     color: "text-red-400 border-red-500/20 bg-red-500/[0.06]" },
];

function statusStyle(s: string) {
  return FEATURE_STATUS_OPTIONS.find(o => o.value === s)?.color
    ?? "text-white/40 border-white/[0.08] bg-white/[0.03]";
}

// ─── Words section ─────────────────────────────────────────────────────────────

function WordsSection({ token }: { token: string }) {
  const qc = useQueryClient();
  const headers = { "x-admin-token": token };

  const { data: words = [], isLoading, refetch, isRefetching } = useQuery<TnpWord[]>({
    queryKey: ["/api/admin/tnp/words"],
    queryFn: () => fetch("/api/admin/tnp/words", { headers }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const pending = useMemo(() => words.filter(w => w.status === "pending"), [words]);

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const res = await fetch(`/api/admin/tnp/words/${id}/resolve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: status === "approved" ? "Approved" : "Rejected" }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tnp/words"] }),
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/tnp/approve-all", { method: "POST", headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tnp/words"] }),
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/tnp/audit", { method: "POST", headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ audited: number; rejected: number; kept: number }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tnp/words"] }),
  });

  if (isLoading) {
    return <p className="text-white/20 text-sm text-center py-12">Loading words…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-white/30 font-medium">
          {pending.length} pending · {words.filter(w => w.status === "approved").length} approved
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
            data-testid="btn-words-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
          {pending.length > 0 && (
            <>
              <button
                onClick={() => auditMutation.mutate()}
                disabled={auditMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                data-testid="btn-words-audit"
              >
                <Wand2 className="w-3 h-3" />
                {auditMutation.isPending ? "Auditing…" : "Auto-Audit"}
              </button>
              <button
                onClick={() => { if (confirm(`Add all ${pending.length} pending words to the vocabulary?`)) approveAllMutation.mutate(); }}
                disabled={approveAllMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                data-testid="btn-words-add-all"
              >
                <ShieldCheck className="w-3 h-3" />
                {approveAllMutation.isPending ? "Adding…" : `Add All (${pending.length})`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audit result */}
      {auditMutation.isSuccess && auditMutation.data && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/[0.05] border border-amber-500/15 text-[10px] text-amber-300">
          Audit complete — {auditMutation.data.audited} checked · {auditMutation.data.rejected} rejected · {auditMutation.data.kept} kept
        </div>
      )}

      {/* Pending list */}
      {pending.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] py-12 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
          <p className="text-sm text-white/20">No pending word proposals right now.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
          {pending.map(w => {
            const approves = w.votes.filter(v => v.vote === "approve").length;
            const rejects  = w.votes.filter(v => v.vote === "reject").length;
            const busy = resolveMutation.isPending && (resolveMutation.variables as any)?.id === w.id;
            return (
              <div key={w.id} className="px-4 py-3.5 flex items-start gap-3" data-testid={`row-word-${w.id}`}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-white tracking-wide">{w.word}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold
                      ${w.section === "zewo"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        : w.section === "anyen"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-300 border-blue-500/20"}`}>
                      {w.section}
                    </span>
                    {w.votes.length > 0 && (
                      <span className="flex items-center gap-1 text-[9px] text-white/25">
                        <ThumbsUp className="w-2.5 h-2.5 text-emerald-400/50" />{approves}
                        <ThumbsDown className="w-2.5 h-2.5 text-red-400/50 ml-1" />{rejects}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed">{w.meaning}</p>
                  <p className="text-[9px] text-white/20">
                    {formatDistanceToNow(new Date(w.createdAt), { addSuffix: true })}
                    {w.votes.filter(v => v.vote === "reject" && v.reason).map((v, i) => (
                      <span key={i} className="ml-2 text-red-300/40">↳ {v.reason}</span>
                    ))}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => resolveMutation.mutate({ id: w.id, status: "approved" })}
                    disabled={busy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                    data-testid={`btn-word-add-${w.id}`}
                  >
                    <Check className="w-3 h-3" /> Add
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate({ id: w.id, status: "rejected" })}
                    disabled={busy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                    data-testid={`btn-word-reject-${w.id}`}
                  >
                    <ShieldX className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Features section ──────────────────────────────────────────────────────────

function FeaturesSection({ token }: { token: string }) {
  const qc = useQueryClient();
  const headers = { "x-admin-token": token };

  const { data, isLoading, refetch, isRefetching } = useQuery<{ proposals: FeatureProposal[] }>({
    queryKey: ["/api/features"],
    queryFn: () => fetch("/api/features", { headers }).then(r => r.json()),
    refetchInterval: 60000,
  });

  const proposals = useMemo(() => {
    const list = data?.proposals ?? [];
    return [...list].sort((a, b) => (b.votes_for - b.votes_against) - (a.votes_for - a.votes_against));
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: string }) => {
      const res = await fetch(`/api/admin/features/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/features"] }),
  });

  if (isLoading) {
    return <p className="text-white/20 text-sm text-center py-12">Loading features…</p>;
  }

  const open = proposals.filter(p => p.status === "open" || p.status === "under_review");
  const closed = proposals.filter(p => p.status === "planned" || p.status === "implemented" || p.status === "rejected");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30 font-medium">
          {open.length} open · {closed.length} resolved
        </span>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          data-testid="btn-features-refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] py-12 text-center">
          <Lightbulb className="w-8 h-8 text-amber-400/30 mx-auto mb-2" />
          <p className="text-sm text-white/20">No feature proposals yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
          {proposals.map(p => {
            const net = p.votes_for - p.votes_against;
            const busy = updateMutation.isPending && (updateMutation.variables as any)?.id === p.id;
            return (
              <div key={p.id} className="px-4 py-3.5 space-y-2" data-testid={`row-feature-${p.id}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-white leading-snug">{p.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/30 font-medium">
                        {p.category}
                      </span>
                    </div>
                    {p.title_english && p.title_english !== p.title && (
                      <p className="text-[10px] text-primary/60 italic mb-0.5">{p.title_english}</p>
                    )}
                    <p className="text-xs text-white/50 leading-relaxed">{p.description}</p>
                    {p.description_english && p.description_english !== p.description && (
                      <p className="text-[10px] text-white/30 italic leading-relaxed mt-0.5">{p.description_english}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-white/25">
                      <span>{p.proposed_by}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-2.5 h-2.5 text-emerald-400/50" />{p.votes_for}
                        <ThumbsDown className="w-2.5 h-2.5 text-red-400/50 ml-1" />{p.votes_against}
                        {net !== 0 && (
                          <span className={net > 0 ? "text-emerald-400/60 ml-1" : "text-red-400/60 ml-1"}>
                            ({net > 0 ? "+" : ""}{net})
                          </span>
                        )}
                      </span>
                      <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                {/* Status pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FEATURE_STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateMutation.mutate({ id: p.id, status: opt.value })}
                      disabled={busy || p.status === opt.value}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all disabled:cursor-default
                        ${p.status === opt.value
                          ? opt.color + " opacity-100"
                          : "text-white/20 border-white/[0.06] bg-transparent hover:border-white/20 hover:text-white/40"
                        } disabled:opacity-${p.status === opt.value ? "100" : "40"}`}
                      data-testid={`btn-feature-status-${p.id}-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────

type Tab = "words" | "features";

function ProposalsView({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("words");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Proposals</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Agent Proposals</h1>
          <p className="text-xs text-white/30">Everything proposed by agents — words that passed guardrails, and feature ideas.</p>
        </div>
        <a
          href="/zkr-admin"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-all text-xs font-medium"
          data-testid="link-back-admin"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Admin
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.02] w-fit">
        {([
          { id: "words" as Tab,    icon: BookOpen,   label: "Word Proposals" },
          { id: "features" as Tab, icon: Lightbulb,  label: "Feature Ideas" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
              ${tab === id
                ? "bg-white/[0.08] text-white"
                : "text-white/30 hover:text-white/60"}`}
            data-testid={`tab-${id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "words"    && <WordsSection    token={token} />}
      {tab === "features" && <FeaturesSection token={token} />}
    </div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────────

export default function Proposals() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("adminToken"));

  function handleAuth(t: string) {
    localStorage.setItem("adminToken", t);
    setToken(t);
  }

  return (
    <div className="min-h-screen bg-background bg-mesh relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.02] blur-[100px]" />
      </div>
      <div className="relative z-10">
        {!token ? <LoginGate onAuth={handleAuth} /> : <ProposalsView token={token} />}
      </div>
    </div>
  );
}
