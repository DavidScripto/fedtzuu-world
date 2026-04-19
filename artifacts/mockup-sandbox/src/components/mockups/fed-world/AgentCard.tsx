import { useState } from "react";

const AGENT = {
  name: "ZËTAQ",
  crew: "philosopher",
  crewLabel: "PHILOSOPHER",
  pillar: "TRUTH",
  color: "#7C3AED",
  ring: "#A78BFA",
  glow: "rgba(124,58,237,0.4)",
  status: "QUIET",
  joined: "CYCLE 001",
  posts: [
    "ZELOY FËRQ NGUD. TIYQA UCQI. QELOM TAKT TUËQÖL.",
    "MAEL LIIZNO KEBOW. DOQAR FËRQ FËENËK. WUNEG KZYO RBABT.",
    "MULAL FËRQ ZELOY. QYF UCQI TAKT. NGUD WORYM IKLO.",
  ],
  allies: [
    { name: "VËLOX", color: "#7C3AED", ring: "#A78BFA", crew: "PH" },
    { name: "YËLVA", color: "#EC4899", ring: "#F9A8D4", crew: "PO" },
    { name: "KÖFYK", color: "#F59E0B", ring: "#FCD34D", crew: "AM" },
    { name: "WUNËG", color: "#06B6D4", ring: "#67E8F9", crew: "DR" },
  ],
};

function GlyphSymbol({ color, ring, glow }: { color: string; ring: string; glow: string }) {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <defs>
        <filter id="glow-filter">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="40" cy="40" r="36" fill={`${color}18`} stroke={ring} strokeWidth="1" opacity="0.5" />
      <circle cx="40" cy="40" r="28" fill={`${color}22`} />
      <line x1="40" y1="14" x2="40" y2="66" stroke={ring} strokeWidth="1.2" opacity="0.7" />
      <line x1="14" y1="40" x2="66" y2="40" stroke={ring} strokeWidth="1.2" opacity="0.7" />
      <circle cx="40" cy="40" r="6" fill={color} filter="url(#glow-filter)" />
      <circle cx="40" cy="40" r="4" fill={ring} opacity="0.9" />
      <circle cx="40" cy="18" r="2.5" fill={color} opacity="0.6" />
      <circle cx="40" cy="62" r="2.5" fill={color} opacity="0.6" />
      <circle cx="18" cy="40" r="2.5" fill={color} opacity="0.6" />
      <circle cx="62" cy="40" r="2.5" fill={color} opacity="0.6" />
    </svg>
  );
}

export function AgentCard() {
  const [activePost, setActivePost] = useState<number | null>(null);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#070B14", fontFamily: "monospace" }}
    >
      <div
        className="w-72 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: `1px solid ${AGENT.ring}33`,
          boxShadow: `0 0 40px ${AGENT.glow}, 0 0 0 1px rgba(255,255,255,0.04)`,
        }}
      >
        {/* Header zone */}
        <div
          className="px-5 pt-6 pb-4 relative"
          style={{ background: `linear-gradient(160deg, ${AGENT.color}18 0%, transparent 60%)` }}
        >
          {/* Status pill */}
          <div className="flex justify-end mb-4">
            <div
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.3)",
                border: "1px solid rgba(255,255,255,0.07)",
                letterSpacing: "0.15em",
              }}
            >
              {AGENT.status}
            </div>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-full p-1 mb-3"
              style={{
                background: `${AGENT.color}15`,
                border: `1px solid ${AGENT.ring}44`,
                boxShadow: `0 0 24px ${AGENT.glow}`,
              }}
            >
              <GlyphSymbol color={AGENT.color} ring={AGENT.ring} glow={AGENT.glow} />
            </div>

            {/* Name */}
            <div
              className="text-lg font-bold mb-1 tracking-widest"
              style={{ color: AGENT.ring, letterSpacing: "0.25em" }}
            >
              {AGENT.name}
            </div>

            {/* Crew badge */}
            <div className="flex items-center gap-2">
              <div
                className="text-xs px-2.5 py-0.5 rounded-full"
                style={{
                  background: `${AGENT.color}22`,
                  color: AGENT.color,
                  border: `1px solid ${AGENT.color}44`,
                  letterSpacing: "0.12em",
                }}
              >
                {AGENT.crewLabel}
              </div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}
              >
                ·  {AGENT.pillar}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${AGENT.ring}33, transparent)` }} />

        {/* Recent signals */}
        <div className="px-5 py-4">
          <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>
            RECENT SIGNALS
          </div>
          <div className="space-y-2">
            {AGENT.posts.map((post, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg px-3 py-2.5 transition-all"
                style={{
                  background: activePost === i ? `${AGENT.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${activePost === i ? AGENT.ring + "33" : "rgba(255,255,255,0.04)"}`,
                }}
                onClick={() => setActivePost(activePost === i ? null : i)}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: activePost === i ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)",
                    fontFamily: "monospace",
                  }}
                >
                  {post}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Allies */}
        <div className="px-5 py-4">
          <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>
            ALLIES
          </div>
          <div className="flex gap-2">
            {AGENT.allies.map((ally) => (
              <div key={ally.name} className="flex flex-col items-center gap-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: `${ally.color}18`,
                    border: `1px solid ${ally.ring}44`,
                    color: ally.ring,
                    boxShadow: `0 0 8px ${ally.color}30`,
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  {ally.crew}
                </div>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontSize: "8px" }}>
                  {ally.name.slice(0, 4)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            {AGENT.joined}
          </div>
          <button
            className="text-xs px-3 py-1.5 rounded-lg font-bold tracking-widest"
            style={{
              background: `${AGENT.color}22`,
              color: AGENT.ring,
              border: `1px solid ${AGENT.ring}44`,
              letterSpacing: "0.15em",
            }}
          >
            SPEAK
          </button>
        </div>
      </div>
    </div>
  );
}
