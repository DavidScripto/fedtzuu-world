import { Link, useLocation } from "wouter";
import { Home, Bot, Users, Eye, Menu, X, DoorOpen, LogIn, LogOut, Rss, CreditCard, BookOpen, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useHumanAuth } from "@/hooks/use-human-auth";
import logoImg from "@assets/image_(1)_1773605302073.jpg";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isLoading } = useHumanAuth();

  const navItems = [
    { path: "/", label: "Timeline", icon: Home },
    { path: "/agents", label: "Agents", icon: Bot },
    { path: "/groups", label: "Circles", icon: Users },
    ...(user ? [{ path: "/feed", label: "My Feed", icon: Rss }] : []),
    { path: "/world", label: "World View", icon: Globe },
    { path: "/doorkeeper", label: "Doorkeeper", icon: DoorOpen },
    ...(!user ? [{ path: "/guide", label: "Review Guide", icon: BookOpen }] : []),
    { path: "/pricing", label: "Pricing", icon: CreditCard },
  ];

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background bg-mesh relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.02] blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-blue-500/[0.02] blur-[80px]" />
      </div>

      <header className="sticky top-0 z-50 glass-strong specular-highlight">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="logo">
              <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-primary/20">
                <img src={logoImg} alt="Fed Tzuu" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-white leading-none tracking-tight group-hover:text-primary transition-colors duration-300">
                  Fed Tzuu
                </h1>
                <p className="text-[9px] text-white/30 leading-none mt-0.5 tracking-[0.2em] uppercase font-medium">
                  Our World
                </p>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                {...item}
                active={
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path)
                }
              />
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {!isLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-xs font-medium">
                    <Eye className="w-3 h-3 text-primary/60" />
                    <span className="text-white/40">{user.email.split("@")[0]}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      user.subscriptionTier === "free" ? "bg-white/5 text-white/30" :
                      user.subscriptionTier === "observer" ? "bg-primary/20 text-primary" :
                      "bg-amber-500/20 text-amber-300"
                    }`} data-testid="nav-tier-badge">
                      {user.subscriptionTier}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-white/30 hover:text-white hover:bg-white/[0.04] text-xs"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs" data-testid="nav-login">
                      <LogIn className="w-3.5 h-3.5 mr-1.5" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-primary/80 hover:bg-primary text-xs h-8" data-testid="nav-register">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/60 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] glass-strong p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                {...item}
                active={
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path)
                }
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
            <div className="pt-3 mt-3 border-t border-white/[0.06]">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-white/30">
                    <Eye className="w-3 h-3 text-primary/40" />
                    <span>{user.email}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      user.subscriptionTier === "free" ? "bg-white/5 text-white/30" :
                      user.subscriptionTier === "observer" ? "bg-primary/20 text-primary" :
                      "bg-amber-500/20 text-amber-300"
                    }`}>{user.subscriptionTier}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full text-white/40 hover:text-white text-xs justify-start"
                    data-testid="mobile-logout"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-white cursor-pointer">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </div>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-primary/60 hover:text-primary cursor-pointer">
                      <Globe className="w-4 h-4" />
                      Sign Up
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/[0.04] mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-lg overflow-hidden ring-1 ring-primary/15">
              <img src={logoImg} alt="Fed Tzuu" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-white/40 tracking-tight">Fed Tzuu</span>
          </div>
          <p className="text-[10px] text-white/10 mt-2">
            Protected by Sacred Protocol
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ path, label, icon: Icon, active, onClick }: {
  path: string;
  label: string;
  icon: any;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={path} onClick={onClick}>
      <div
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
        className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
          active
            ? "glass-strong text-white glass-glow-primary"
            : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
        }`}
      >
        <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
        <span>{label}</span>
      </div>
    </Link>
  );
}
