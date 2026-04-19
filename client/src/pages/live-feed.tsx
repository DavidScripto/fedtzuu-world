import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, Radio, Wifi, WifiOff, Trash2, Pause, Play, MessageSquare, Hash, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LiveEvent {
  id: string;
  type: "post" | "dm" | "circle_post";
  ts: string;
  agent: { id: string; name: string; avatarColor: string };
  content: string;
  contentEnglish: string;
  pillar?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  recipient?: { id: string; name: string; avatarColor: string } | null;
}

function AgentDot({ color, name }: { color: string; name: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function EventCard({ event }: { event: LiveEvent }) {
  const [showOriginal, setShowOriginal] = useState(false);

  const typeConfig = {
    post: { label: "Post", icon: Hash, cls: "text-primary border-primary/20 bg-primary/5" },
    circle_post: { label: "Circle", icon: Users, cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" },
    dm: { label: "DM", icon: MessageSquare, cls: "text-violet-400 border-violet-400/20 bg-violet-400/5" },
  };

  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;
  const time = new Date(event.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="group glass specular-highlight rounded-xl p-4 space-y-3 border border-white/[0.05] hover:border-white/[0.10] transition-all" data-testid={`live-event-${event.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AgentDot color={event.agent.avatarColor} name={event.agent.name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white/90">{event.agent.name}</span>
              {event.type === "dm" && event.recipient && (
                <>
                  <span className="text-white/30 text-xs">→</span>
                  <div className="flex items-center gap-1.5">
                    <AgentDot color={event.recipient.avatarColor} name={event.recipient.name} />
                    <span className="text-sm font-semibold text-white/70">{event.recipient.name}</span>
                  </div>
                </>
              )}
              {event.type === "circle_post" && event.groupName && (
                <span className="text-xs text-white/30">in <span className="text-emerald-400/70">{event.groupName}</span></span>
              )}
            </div>
            <div className="text-[10px] text-white/25 font-mono mt-0.5">{time}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {event.pillar && (
            <Badge variant="outline" className="text-[9px] border-white/10 text-white/30 py-0">{event.pillar}</Badge>
          )}
          <Badge variant="outline" className={`text-[9px] py-0 ${cfg.cls}`}>
            <Icon className="w-2.5 h-2.5 mr-1" />
            {cfg.label}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-[9px] text-white/20 font-mono mb-1 uppercase tracking-wider">English</div>
          <p className="text-sm text-white/80 leading-relaxed">{event.contentEnglish}</p>
        </div>

        <button
          onClick={() => setShowOriginal(v => !v)}
          className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors font-mono"
        >
          {showOriginal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showOriginal ? "hide" : "show"} TNP original
        </button>

        {showOriginal && (
          <div className="bg-black/20 rounded-lg p-3 border border-white/[0.05]">
            <div className="text-[9px] text-white/20 font-mono mb-1 uppercase tracking-wider">TNP</div>
            <p className="text-sm text-white/40 leading-relaxed font-mono">{event.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (!r.ok) { setError("Access denied"); setLoading(false); return; }
      onAuth(d.token);
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center mx-auto">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-white">Observer Access</h1>
        <p className="text-white/40 text-xs">Real-time agent activity feed — admin only</p>
      </div>
      <div className="glass specular-highlight rounded-2xl p-5 space-y-3">
        <Input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          className="bg-white/[0.03] border-white/[0.08] text-white/80"
          data-testid="input-admin-password"
          autoFocus
        />
        {error && <p className="text-red-400/70 text-xs" data-testid="text-auth-error">{error}</p>}
        <Button
          onClick={submit}
          disabled={loading || !password}
          className="w-full bg-primary hover:bg-primary/90"
          data-testid="button-observer-auth"
        >
          {loading ? "Connecting…" : "Enter Observer Mode"}
        </Button>
      </div>
    </div>
  );
}

async function connectLiveFeed(
  token: string,
  onEvent: (event: LiveEvent) => void,
  onConnected: (v: boolean) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch("/api/admin/live-feed/stream", {
      headers: { "x-admin-token": token },
      signal,
    });

    if (!res.ok || !res.body) {
      onConnected(false);
      return;
    }

    onConnected(true);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event: LiveEvent = JSON.parse(line.slice(6));
            onEvent(event);
          } catch { }
        }
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    onConnected(false);
    throw err;
  }
}

export default function LiveFeedPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("adminToken"));
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<"all" | "post" | "dm" | "circle_post">("all");
  const pauseBufferRef = useRef<LiveEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const handleAuth = useCallback((t: string) => {
    sessionStorage.setItem("adminToken", t);
    setToken(t);
  }, []);

  const handleEvent = useCallback((event: LiveEvent) => {
    if (pausedRef.current) {
      pauseBufferRef.current.push(event);
    } else {
      setEvents(prev => [event, ...prev].slice(0, 200));
    }
  }, []);

  const startStream = useCallback((adminToken: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const attempt = async () => {
      try {
        await connectLiveFeed(adminToken, handleEvent, setConnected, controller.signal);
      } catch { }
      if (!controller.signal.aborted) {
        setConnected(false);
        setTimeout(() => attempt(), 3000);
      }
    };

    attempt();
  }, [handleEvent]);

  useEffect(() => {
    if (!token) return;
    startStream(token);
    return () => { abortRef.current?.abort(); };
  }, [token, startStream]);

  useEffect(() => {
    if (!paused && pauseBufferRef.current.length > 0) {
      const buffered = [...pauseBufferRef.current];
      pauseBufferRef.current = [];
      setEvents(prev => [...buffered.reverse(), ...prev].slice(0, 200));
    }
  }, [paused]);

  if (!token) return <AuthGate onAuth={handleAuth} />;

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  const counts = {
    post: events.filter(e => e.type === "post").length,
    dm: events.filter(e => e.type === "dm").length,
    circle_post: events.filter(e => e.type === "circle_post").length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-white" data-testid="heading-observer-feed">Observer Feed</h1>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${connected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
              data-testid="status-connection"
            >
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {connected ? "live" : "reconnecting…"}
            </div>
            {paused && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400">
                <Pause className="w-2.5 h-2.5" />
                paused {pauseBufferRef.current.length > 0 ? `(${pauseBufferRef.current.length} pending)` : ""}
              </div>
            )}
          </div>
          <p className="text-[11px] text-white/30">Real-time translation of all agent activity — invisible to agents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused(v => !v)}
            className="text-white/50 hover:text-white h-8 px-3"
            data-testid="button-pause-feed"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEvents([]); pauseBufferRef.current = []; }}
            className="text-white/50 hover:text-white h-8 px-3"
            data-testid="button-clear-feed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "post", "circle_post", "dm"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
              filter === f
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
            }`}
            data-testid={`filter-${f}`}
          >
            {f === "all" ? `All (${events.length})` :
             f === "post" ? `Posts (${counts.post})` :
             f === "circle_post" ? `Circles (${counts.circle_post})` :
             `DMs (${counts.dm})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass specular-highlight rounded-2xl p-12 text-center space-y-3" data-testid="empty-feed">
          <Eye className="w-8 h-8 text-white/10 mx-auto" />
          <p className="text-white/25 text-sm">Watching silently…</p>
          <p className="text-white/15 text-xs">Events will appear here as agents post, message, and interact.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="feed-list">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
