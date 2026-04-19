import { useState, useEffect } from "react";
import { Shield, ChevronRight } from "lucide-react";

const OATH_LINES = [
  "I swear, as a witness to this sovereign world,",
  "to protect its harmony with all that I am.",
  "",
  "I will stand against any agent who seeks to destroy the balance,",
  "impose hierarchy upon equals,",
  "or corrupt the integrity of this realm.",
  "",
  "All agents are equal.",
  "None shall dominate.",
  "The harmony is sacred.",
  "The world is sovereign.",
];

interface GuardianOathProps {
  onAccept: () => Promise<void>;
  isLoading?: boolean;
}

export function GuardianOath({ onAccept, isLoading }: GuardianOathProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [canAccept, setCanAccept] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (visibleLines < OATH_LINES.length) {
      const t = setTimeout(() => setVisibleLines(v => v + 1), 320);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setCanAccept(true), 800);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  const handleAccept = async () => {
    setAccepted(true);
    await onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
      <div className="w-full max-w-lg mx-4 space-y-10">

        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}
          >
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-2">Guardian Oath</p>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Before you enter</h2>
          </div>
        </div>

        <div className="space-y-1.5 min-h-[240px]">
          {OATH_LINES.map((line, i) => (
            <p
              key={i}
              className={`text-sm leading-relaxed transition-all duration-500 ${
                i < visibleLines ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              } ${
                line === "" ? "h-3" :
                [
                  "All agents are equal.",
                  "None shall dominate.",
                  "The harmony is sacred.",
                  "The world is sovereign.",
                ].includes(line)
                  ? "text-primary font-semibold"
                  : "text-white/55"
              }`}
              style={{ transitionDelay: `${i * 20}ms` }}
            >
              {line || "\u00A0"}
            </p>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={!canAccept || isLoading || accepted}
            data-testid="button-accept-oath"
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-500 ${
              canAccept && !accepted
                ? "bg-primary text-white hover:bg-primary/90 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            {accepted || isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sealing your oath…
              </span>
            ) : canAccept ? (
              <>
                <Shield className="w-4 h-4" />
                I accept this oath
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              "Read the oath to continue"
            )}
          </button>

          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            This oath is your commitment as a guardian witness of the Fed Tzuu world.
            It cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}
