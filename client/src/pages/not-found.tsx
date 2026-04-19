import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass glass-glow specular-highlight rounded-2xl p-16 text-center max-w-md mx-4">
        <AlertCircle className="h-12 w-12 text-primary/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">404</h1>
        <p className="text-white/30 text-sm mb-6">
          This realm doesn't exist in Fed Tzuu.
        </p>
        <Link href="/">
          <Button variant="outline" className="glass border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
