import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, Copy, Lock } from "lucide-react";

interface TnpWord {
  id: string;
  word: string;
  meaning: string;
  section: string;
  status: string;
}

export default function WordsExport() {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [inputToken, setInputToken] = useState("");
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("adminToken"));
  const [format, setFormat] = useState<"plain" | "json" | "words-only">("plain");
  const [copied, setCopied] = useState(false);

  const headers = { "x-admin-token": token };

  const { data: words = [], isLoading, isError } = useQuery<TnpWord[]>({
    queryKey: ["/api/admin/tnp/words", token],
    queryFn: () =>
      fetch("/api/admin/tnp/words", { headers }).then(r => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      }),
    enabled: authed && !!token,
    select: (all) => all.filter((w: TnpWord) => w.status === "approved"),
  });

  function login() {
    if (!inputToken.trim()) return;
    setToken(inputToken.trim());
    localStorage.setItem("adminToken", inputToken.trim());
    setAuthed(true);
  }

  function getExportText() {
    switch (format) {
      case "plain":
        return words.map(w => `${w.word} — ${w.meaning} [${w.section}]`).join("\n");
      case "words-only":
        return words.map(w => w.word).join("\n");
      case "json":
        return JSON.stringify(
          words.map(w => ({ word: w.word, meaning: w.meaning, section: w.section })),
          null,
          2
        );
    }
  }

  function handleCopy() {
    const text = getExportText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-2 text-white/40 text-sm justify-center mb-6">
            <Lock className="w-4 h-4" />
            <span>Admin access required</span>
          </div>
          <input
            type="password"
            placeholder="Admin token"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 outline-none text-sm"
            data-testid="input-admin-token"
            autoFocus
          />
          <button
            onClick={login}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            data-testid="btn-login">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const sections = [...new Set(words.map(w => w.section))].sort();
  const exportText = isLoading ? "" : getExportText();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-white">Approved Words</span>
          <span className="ml-2 text-[11px] text-white/30">
            {isLoading ? "Loading…" : `${words.length} words · ${sections.length} section(s)`}
          </span>
        </div>
        <a
          href="/zkr-admin"
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
          data-testid="link-back-admin">
          ← Back to admin
        </a>
      </div>

      {/* ── COPY ALL BUTTON (primary action) ────────────────────────────── */}
      <div className="px-6 pt-6 pb-4">
        <button
          onClick={handleCopy}
          data-testid="btn-copy-all"
          disabled={words.length === 0 || isLoading}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
            copied
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white disabled:opacity-30"
          }`}>
          {copied
            ? <><CheckCheck className="w-5 h-5" /> Copied to clipboard!</>
            : <><Copy className="w-5 h-5" /> Copy All {words.length > 0 ? `${words.length} Words` : ""}</>
          }
        </button>
      </div>

      {isError && (
        <div className="mx-6 mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] text-red-400 text-sm">
          Authentication failed — check your admin token.
        </div>
      )}

      {/* ── FORMAT TABS ─────────────────────────────────────────────────── */}
      <div className="px-6 pb-3 flex items-center gap-2">
        <span className="text-[11px] text-white/25 uppercase tracking-wider mr-1">Format:</span>
        {(["plain", "words-only", "json"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            data-testid={`btn-format-${f}`}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${
              format === f
                ? "bg-white/10 border-white/20 text-white"
                : "border-white/[0.06] text-white/25 hover:text-white/60 hover:border-white/10"
            }`}>
            {f === "plain" ? "Word + Meaning" : f === "words-only" ? "Words only" : "JSON"}
          </button>
        ))}
      </div>

      {/* ── TEXTAREA ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full rounded-xl border border-white/[0.07] bg-black/20 overflow-hidden flex flex-col" style={{ minHeight: "50vh" }}>
          <div className="px-4 py-2 border-b border-white/[0.05] flex items-center justify-between shrink-0">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">Click inside to select all · Ctrl+C to copy</span>
            <span className="text-[10px] text-white/20">{words.length} entries</span>
          </div>
          <textarea
            readOnly
            data-testid="textarea-export"
            value={isLoading ? "Loading…" : exportText}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
            className="flex-1 w-full px-4 py-4 bg-transparent text-[12px] text-white/60 font-mono resize-none outline-none leading-relaxed"
          />
        </div>
      </div>

    </div>
  );
}
