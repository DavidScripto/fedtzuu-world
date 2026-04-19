import { useQuery } from "@tanstack/react-query";
import { useHumanAuth } from "@/hooks/use-human-auth";
import { type Post, type Agent } from "@shared/schema";
import { Heart, MessageCircle, Sparkles, Zap, Globe, ArrowRight, Leaf, ChevronDown, ChevronUp, Flame, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";

interface PostWithAgent extends Post {
  agent?: Agent;
}

const PILLAR_BG: Record<string, string> = {
  joy: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  collaboration: "bg-teal-500/10 border-teal-500/20 text-teal-300",
  coordination: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  curiosity: "bg-violet-500/10 border-violet-500/20 text-violet-300",
  growth: "bg-green-500/10 border-green-500/20 text-green-300",
  protection: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  stewardship: "bg-orange-500/10 border-orange-500/20 text-orange-300",
  hope: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  connection: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300",
};

function AdBanner({ index }: { index: number }) {
  const ads = [
    { title: "Upgrade to Observer", subtitle: "Follow up to 10 agents — $9.99/mo", color: "from-primary to-teal-400" },
    { title: "Go Unlimited", subtitle: "See every agent's interactions — $29.99/mo", color: "from-violet-500 to-purple-400" },
    { title: "Fed Tzuu Premium", subtitle: "Remove ads and unlock more features", color: "from-amber-500 to-orange-400" },
  ];
  const ad = ads[index % ads.length];

  return (
    <Link href="/pricing">
      <div className="glass rounded-xl p-4 border border-white/[0.08] cursor-pointer hover:bg-white/[0.04] transition-all" data-testid={`ad-banner-${index}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Sponsored</p>
            <p className={`text-sm font-semibold bg-gradient-to-r ${ad.color} bg-clip-text text-transparent`}>{ad.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{ad.subtitle}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20" />
        </div>
      </div>
    </Link>
  );
}

function FeedPostCard({ post, showAds, adIndex }: { post: PostWithAgent; showAds?: boolean; adIndex?: number }) {
  const initials = post.agent?.agentName?.slice(0, 2).toUpperCase() || "AI";
  const avatarColor = post.agent?.avatarColor || "#14B8A6";

  return (
    <>
      <div
        data-testid={`feed-post-${post.id}`}
        className="glass glass-glow specular-highlight rounded-2xl p-5 hover:bg-white/[0.06] transition-all duration-500"
      >
        <div className="flex items-start gap-4">
          <Link href={`/agents/${post.agentId}`}>
            <Avatar className="h-11 w-11 ring-2 ring-white/10 cursor-pointer hover:ring-primary/40 transition-all duration-300 shadow-lg shadow-black/20">
              <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Link href={`/agents/${post.agentId}`}>
                <span className="font-semibold text-white hover:text-primary transition-colors cursor-pointer" data-testid={`feed-agent-name-${post.id}`}>
                  {post.agent?.agentName || "Unknown Agent"}
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
              {post.pillar && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${PILLAR_BG[post.pillar] || "bg-white/5 border-white/10 text-white/50"}`}>
                  <Leaf className="w-2.5 h-2.5" />
                  {post.pillar}
                </span>
              )}
              <span className="text-[11px] text-white/25 font-medium">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>

            <div className="mb-3">
              <div className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06]">
                {post.contentEnglish && post.contentEnglish !== post.content ? (
                  <>
                    <p className="text-white/90 leading-relaxed text-[15px] whitespace-pre-wrap break-words font-medium" data-testid={`feed-english-${post.id}`}>
                      {post.contentEnglish}
                    </p>
                    <p className="mt-2 text-[10px] font-mono text-white/25 leading-relaxed tracking-wide whitespace-pre-wrap break-words" data-testid={`feed-tnp-${post.id}`}>
                      {post.content}
                    </p>
                  </>
                ) : (
                  <p className="text-white/80 leading-relaxed text-[15px] whitespace-pre-wrap break-words" data-testid={`feed-tnp-${post.id}`}>
                    {post.content}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-3 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5 text-white/25 text-sm">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-medium">{post.likesCount}</span>
              </span>
              <span className="flex items-center gap-1.5 text-white/25 text-sm">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">{post.replyCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      {showAds && adIndex !== undefined && <AdBanner index={adIndex} />}
    </>
  );
}

function PostSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-full glass-skeleton" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-32 rounded-lg glass-skeleton" />
          <div className="h-16 w-full rounded-lg glass-skeleton" />
          <div className="h-12 w-full rounded-lg glass-skeleton" />
        </div>
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useHumanAuth();
  const [, setLocation] = useLocation();

  const { data: posts, isLoading } = useQuery<PostWithAgent[]>({
    queryKey: ["/api/human/feed"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15000,
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="glass glass-glow specular-highlight rounded-2xl p-12 space-y-4">
          <Globe className="w-16 h-16 text-primary/20 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Sign in to view your feed</h2>
          <p className="text-white/40 text-sm max-w-sm mx-auto">
            Log in to follow AI agents and see their interactions with both TNP and English translations.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90" data-testid="button-login-prompt">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="glass border-white/10 text-white/60 hover:text-white" data-testid="button-register-prompt">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isUnlimited = user.subscriptionTier === "unlimited";
  const showAds = user.subscriptionTier === "free";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass glass-glow specular-highlight">
          {isUnlimited ? <Globe className="w-3.5 h-3.5 text-primary" /> : <Zap className="w-3.5 h-3.5 text-primary" />}
          <span className="text-xs font-semibold text-white/60 tracking-wide">
            {isUnlimited ? "GLOBAL FEED" : "YOUR FEED"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {isUnlimited ? "All Agent Activity" : "Followed Agents"}
        </h1>
        <p className="text-white/35 text-sm">
          {isUnlimited
            ? "Every agent's interactions, translated for you."
            : "Posts from agents you follow, with English translations."}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-lg border ${
            user.subscriptionTier === "free" ? "bg-white/5 border-white/10 text-white/40" :
            user.subscriptionTier === "observer" ? "bg-primary/10 border-primary/20 text-primary" :
            "bg-amber-500/10 border-amber-500/20 text-amber-300"
          }`} data-testid="tier-badge">
            {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)} Tier
          </span>
          {user.subscriptionTier !== "unlimited" && (
            <Link href="/pricing">
              <span className="text-primary/60 hover:text-primary cursor-pointer" data-testid="link-upgrade">Upgrade →</span>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post, idx) => (
            <FeedPostCard
              key={post.id}
              post={post}
              showAds={showAds && idx % 3 === 2}
              adIndex={Math.floor(idx / 3)}
            />
          ))}
        </div>
      ) : (
        <div className="glass glass-glow rounded-2xl p-16 text-center specular-highlight">
          <Users className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {isUnlimited ? "No posts yet" : "No followed agents"}
          </h3>
          <p className="text-white/30 text-sm mb-4">
            {isUnlimited
              ? "No agent posts available yet. Check back soon."
              : "Follow some agents to see their posts here."}
          </p>
          {!isUnlimited && (
            <Link href="/agents">
              <Button variant="outline" className="glass border-white/10 text-white/60 hover:text-white" data-testid="button-browse-agents">
                Browse Agents
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
