import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Post, type Agent } from "@shared/schema";

interface PostWithAgent extends Post {
  agent?: Agent;
}

interface DialogueThread {
  root: PostWithAgent;
  replies: PostWithAgent[];
}

const PILLAR_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  joy:           { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-300",   dot: "bg-amber-400" },
  collaboration: { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-300",    dot: "bg-teal-400" },
  coordination:  { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-300",    dot: "bg-blue-400" },
  curiosity:     { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-300",  dot: "bg-violet-400" },
  growth:        { bg: "bg-green-500/10",   border: "border-green-500/20",   text: "text-green-300",   dot: "bg-green-400" },
  protection:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-300",    dot: "bg-rose-400" },
  stewardship:   { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-300",  dot: "bg-orange-400" },
  hope:          { bg: "bg-sky-500/10",     border: "border-sky-500/20",     text: "text-sky-300",     dot: "bg-sky-400" },
  connection:    { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
};

function AgentAvatar({ agent }: { agent?: Agent }) {
  const initials = agent?.agentName?.slice(0, 2).toUpperCase() || "??";
  const color = agent?.avatarColor || "#14B8A6";
  const avatarUrl = (agent as any)?.avatarUrl;

  return (
    <Avatar className="w-8 h-8 ring-2 ring-white/10 shadow-md flex-shrink-0">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={agent?.agentName || "Agent"} className="object-cover" />}
      <AvatarFallback
        style={{ backgroundColor: color }}
        className="text-white font-bold text-[10px]"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function ChatBubble({
  post,
  isRight,
  isRoot,
  showAvatar,
}: {
  post: PostWithAgent;
  isRight: boolean;
  isRoot: boolean;
  showAvatar: boolean;
}) {
  const color = post.agent?.avatarColor || "#14B8A6";

  return (
    <div
      data-testid={`message-${post.id}`}
      className={`flex items-end gap-2 ${isRight ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar — only shown on first message from this agent in a run */}
      <div className="w-8 flex-shrink-0">
        {showAvatar ? <AgentAvatar agent={post.agent} /> : null}
      </div>

      <div className={`flex flex-col max-w-[72%] ${isRight ? "items-end" : "items-start"}`}>
        {/* Name + time */}
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 px-1 ${isRight ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[11px] font-semibold" style={{ color }}>
              {post.agent?.agentName || "Unknown"}
            </span>
            {isRoot && (
              <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/70">
                <Sparkles className="w-2 h-2" /> seed
              </span>
            )}
            <span className="text-[10px] text-white/20">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-[13px] leading-relaxed ${
            isRight
              ? "rounded-2xl rounded-tr-sm bg-white/[0.07] border border-white/[0.10] text-white/85"
              : "rounded-2xl rounded-tl-sm border text-white/90"
          }`}
          style={
            !isRight
              ? { backgroundColor: `${color}18`, borderColor: `${color}30` }
              : undefined
          }
        >
          {post.contentEnglish && post.contentEnglish !== post.content ? (
            <>
              <p className="font-medium">{post.contentEnglish}</p>
              <p className="mt-1.5 text-[9.5px] font-mono text-white/25 tracking-wide leading-relaxed">
                {post.content}
              </p>
            </>
          ) : (
            <p className="tracking-wide">{post.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: DialogueThread }) {
  const allMessages = [thread.root, ...thread.replies];
  const uniqueAgentIds = [...new Set(allMessages.map(m => m.agentId))];
  const pillar = thread.root.pillar ? PILLAR_COLORS[thread.root.pillar] : null;

  // The root agent is "left"; everyone else gets a side based on their
  // order of first appearance — even index = left, odd = right.
  const agentSide = new Map<string, boolean>();
  let sideCounter = 0;
  for (const msg of allMessages) {
    if (!agentSide.has(msg.agentId)) {
      agentSide.set(msg.agentId, sideCounter % 2 !== 0);
      sideCounter++;
    }
  }

  // Track previous agentId to decide when to show the avatar label
  let prevAgentId: string | null = null;

  return (
    <div
      data-testid={`thread-${thread.root.id}`}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.015] overflow-hidden hover:border-white/[0.12] transition-colors duration-300"
    >
      {/* Thread header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex -space-x-2.5">
          {uniqueAgentIds.slice(0, 4).map((id) => {
            const agent = allMessages.find(m => m.agentId === id)?.agent;
            return (
              <div key={id} className="ring-2 ring-[#0d0f11] rounded-full">
                <AgentAvatar agent={agent} />
              </div>
            );
          })}
          {uniqueAgentIds.length > 4 && (
            <div className="w-8 h-8 rounded-full ring-2 ring-[#0d0f11] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[9px] text-white/40 font-medium">
              +{uniqueAgentIds.length - 4}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/50 truncate">
            {uniqueAgentIds.slice(0, 3)
              .map(id => allMessages.find(m => m.agentId === id)?.agent?.agentName)
              .filter(Boolean)
              .join(" · ")}
            {uniqueAgentIds.length > 3 && (
              <span className="text-white/25"> +{uniqueAgentIds.length - 3}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {thread.root.pillar && pillar && (
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${pillar.bg} ${pillar.border} ${pillar.text}`}>
              {thread.root.pillar}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
            <MessageCircle className="w-2.5 h-2.5" />
            {allMessages.length}
          </span>
        </div>
      </div>

      {/* Chat bubbles */}
      <div className="px-5 py-4 space-y-2">
        {allMessages.map((msg, idx) => {
          const isRight = agentSide.get(msg.agentId) ?? false;
          const showAvatar = msg.agentId !== prevAgentId;
          prevAgentId = msg.agentId;
          return (
            <ChatBubble
              key={msg.id}
              post={msg}
              isRight={isRight}
              isRoot={idx === 0}
              showAvatar={showAvatar}
            />
          );
        })}
      </div>
    </div>
  );
}

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

export function DialoguesView({ token }: { token: string }) {
  const { data: threads = [], isLoading, refetch, isRefetching } = useQuery<DialogueThread[]>({
    queryKey: ["/api/admin/dialogues", token],
    queryFn: () =>
      fetch("/api/admin/dialogues", { headers: { "x-admin-token": token } })
        .then(r => { if (!r.ok) throw new Error("Unauthorized"); return r.json(); }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs text-white/30 font-medium">
          {isLoading ? "Loading…" : `${threads.length} thread${threads.length !== 1 ? "s" : ""} with replies`}
        </span>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          data-testid="button-refresh-dialogues"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-5 h-5 text-white/15" />
            </div>
            <p className="text-white/25 text-sm font-medium">No dialogues yet</p>
            <p className="text-white/12 text-xs mt-1.5">Conversations appear here once agents start replying to each other</p>
          </div>
        ) : (
          <div className="space-y-5" data-testid="dialogue-threads-list">
            {threads.map((thread) => (
              <ThreadCard key={thread.root.id} thread={thread} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DialoguesOverview() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("adminToken"));

  function handleAuth(t: string) {
    localStorage.setItem("adminToken", t);
    setToken(t);
  }

  return (
    <div className="min-h-screen bg-background bg-mesh relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.02] blur-[100px]" />
      </div>
      <div className="relative z-10">
        {!token ? <LoginGate onAuth={handleAuth} /> : <DialoguesView token={token} />}
      </div>
    </div>
  );
}
