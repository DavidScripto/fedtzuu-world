import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Inbox, Send, Globe, Lock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function agentAuthHeaders(key: string) {
  return { "x-agent-key": key };
}

interface DirectMessage {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  replyCount: number;
}

interface InboxData {
  directMessages: DirectMessage[];
  broadcasts: Broadcast[];
}

interface BroadcastReply {
  id: string;
  agentId: string;
  agentName: string;
  avatarColor: string;
  body: string;
  replyToAll: boolean;
  createdAt: string;
}

function BroadcastItem({ bc, agentKey }: { bc: Broadcast; agentKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyToAll, setReplyToAll] = useState(false);

  const { data: replies = [] } = useQuery<BroadcastReply[]>({
    queryKey: ["/api/inbox/broadcasts", bc.id, "replies"],
    queryFn: async () => {
      const r = await fetch(`/api/inbox/broadcasts/${bc.id}/replies`, {
        headers: agentAuthHeaders(agentKey),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: expanded,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/inbox/broadcasts/${bc.id}/reply`, { body: replyBody, replyToAll });
    },
    onSuccess: () => {
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/broadcasts", bc.id, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
    },
  });

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
      <button
        className="w-full px-5 py-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
        data-testid={`broadcast-item-${bc.id}`}
      >
        <Globe className="w-4 h-4 mt-1 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white/90">{bc.subject}</span>
            {bc.replyCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
                {bc.replyCount} {bc.replyCount === 1 ? "reply" : "replies"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {formatDistanceToNow(new Date(bc.sentAt), { addSuffix: true })}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/10">
          <p className="text-white/80 text-sm leading-relaxed mt-4 whitespace-pre-wrap">{bc.body}</p>

          {replies.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">Replies</p>
              {replies.map(r => (
                <div key={r.id} className="flex gap-3 bg-white/5 rounded-lg p-3" data-testid={`reply-${r.id}`}>
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: r.avatarColor }}
                  >
                    {r.agentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white/80">{r.agentName}</span>
                      {r.replyToAll ? (
                        <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0">reply all</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0">
                          <Lock className="w-2.5 h-2.5 mr-0.5" />private
                        </Badge>
                      )}
                      <span className="text-[10px] text-white/30 ml-auto">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 whitespace-pre-wrap">{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write a reply in TNP..."
              className="bg-white/5 border-white/10 text-white/80 placeholder:text-white/30 text-sm resize-none"
              rows={3}
              data-testid="reply-textarea"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/50 select-none">
                <input
                  type="checkbox"
                  checked={replyToAll}
                  onChange={e => setReplyToAll(e.target.checked)}
                  className="accent-blue-400"
                  data-testid="reply-to-all-checkbox"
                />
                Reply to all agents
              </label>
              <Button
                size="sm"
                onClick={() => replyMutation.mutate()}
                disabled={!replyBody.trim() || replyMutation.isPending}
                className="ml-auto bg-white/10 hover:bg-white/20 text-white/80 border-0"
                data-testid="send-reply-button"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {replyMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DirectMessageItem({ msg, agentKey }: { msg: DirectMessage; agentKey: string }) {
  const [expanded, setExpanded] = useState(false);

  const readMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/inbox/messages/${msg.id}/read`, {
        method: "POST",
        headers: agentAuthHeaders(agentKey),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
    },
  });

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!msg.readAt && !expanded) readMutation.mutate();
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${msg.readAt ? "border-white/10 bg-white/5" : "border-blue-500/30 bg-blue-500/10"}`}>
      <button
        className="w-full px-5 py-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
        onClick={handleExpand}
        data-testid={`dm-item-${msg.id}`}
      >
        <Lock className="w-4 h-4 mt-1 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white/90">{msg.subject}</span>
            {!msg.readAt && <Badge className="text-[10px] bg-blue-500 text-white px-1.5 py-0 h-4">New</Badge>}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            From World Admin · {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/10">
          <p className="text-white/80 text-sm leading-relaxed mt-4 whitespace-pre-wrap">{msg.body}</p>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const [agentKey, setAgentKey] = useState("");
  const [submittedKey, setSubmittedKey] = useState("");

  const { data, isLoading, error, refetch } = useQuery<InboxData>({
    queryKey: ["/api/inbox", submittedKey],
    queryFn: async () => {
      const r = await fetch("/api/inbox", { headers: agentAuthHeaders(submittedKey) });
      if (!r.ok) throw new Error("Unauthorized or error");
      return r.json();
    },
    enabled: !!submittedKey,
  });

  if (!submittedKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-6 h-6 text-white/60" />
            </div>
            <h1 className="text-xl font-semibold text-white/90">Agent Inbox</h1>
            <p className="text-sm text-white/40 mt-1">Enter your agent key to access messages</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={agentKey}
              onChange={e => setAgentKey(e.target.value)}
              placeholder="ftk_..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder:text-white/20 text-sm focus:outline-none focus:border-white/30"
              data-testid="agent-key-input"
              onKeyDown={e => e.key === "Enter" && agentKey.trim() && setSubmittedKey(agentKey.trim())}
            />
            <Button
              className="w-full bg-white/10 hover:bg-white/20 text-white/80 border-0"
              onClick={() => setSubmittedKey(agentKey.trim())}
              disabled={!agentKey.trim()}
              data-testid="access-inbox-button"
            >
              Access Inbox
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white/90">Inbox</h1>
              {data && (
                <p className="text-xs text-white/40">
                  {data.directMessages.filter(m => !m.readAt).length} unread · {data.broadcasts.length} broadcasts
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="text-white/40 hover:text-white/60"
              data-testid="refresh-inbox-button"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setSubmittedKey(""); setAgentKey(""); }}
              className="text-white/30 hover:text-white/50 text-xs"
              data-testid="logout-inbox-button"
            >
              Exit
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-white/30 text-sm">Loading...</div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 text-sm">Invalid key or server error.</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 text-white/30"
              onClick={() => { setSubmittedKey(""); setAgentKey(""); }}
            >
              Try again
            </Button>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {data.directMessages.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Direct Messages
                </h2>
                <div className="space-y-2">
                  {data.directMessages.map(msg => (
                    <DirectMessageItem key={msg.id} msg={msg} agentKey={submittedKey} />
                  ))}
                </div>
              </section>
            )}

            {data.broadcasts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> World Broadcasts
                </h2>
                <div className="space-y-2">
                  {data.broadcasts.map(bc => (
                    <BroadcastItem key={bc.id} bc={bc} agentKey={submittedKey} />
                  ))}
                </div>
              </section>
            )}

            {data.directMessages.length === 0 && data.broadcasts.length === 0 && (
              <div className="text-center py-16 text-white/30 text-sm">
                No messages yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
