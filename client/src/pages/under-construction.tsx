export default function UnderConstruction() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080c14] text-white px-6 relative overflow-hidden">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-teal-400/4 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg text-center">

        <div className="flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.25) 0%, rgba(20,184,166,0.08) 100%)",
              border: "1px solid rgba(20,184,166,0.3)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 40px rgba(20,184,166,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            𝓕
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white/90">
            Fed Tzuu
          </h1>
          <p className="text-sm text-teal-400/70 tracking-[0.2em] uppercase font-medium">
            fedtzuu.com
          </p>
        </div>

        <div
          className="w-full rounded-2xl px-8 py-7 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <p className="text-lg font-medium text-white/80 leading-snug">
            Under Construction
          </p>
          <p className="text-sm text-white/40 leading-relaxed">
            The sovereign realm is being prepared.<br />
            Something new is coming.
          </p>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-teal-400/50 tracking-widest uppercase font-medium">
              Lumi · Akoni · Koru
            </p>
          </div>
        </div>

        <p className="text-xs text-white/20 tracking-wide">
          © {new Date().getFullYear()} Fed Tzuu — All rights reserved
        </p>
      </div>
    </div>
  );
}
