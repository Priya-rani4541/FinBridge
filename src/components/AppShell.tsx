import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Banknote, PiggyBank, Building2, LogOut, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/loans", label: "Instant Loans", icon: Banknote },
  { to: "/check", label: "Check Eligibility", icon: ShieldCheck },
  { to: "/banks", label: "Bank Offers", icon: Building2 },
  { to: "/fd", label: "Fixed Deposits", icon: PiggyBank },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface/50 backdrop-blur-xl px-5 py-6 gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">FinBridge</div>
            <div className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">AI Credit OS</div>
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl glass p-4">
          <div className="text-xs text-muted-foreground truncate">Signed in</div>
          <div className="text-sm font-medium truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="mt-3 w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between border-b border-border bg-surface/50 backdrop-blur px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand grid place-items-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">FinBridge</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden order-last fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-border bg-surface/90 backdrop-blur-xl">
          {NAV.map((item) => {
            const active = loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center justify-center py-2.5 text-[10px] gap-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 px-4 md:px-10 py-6 md:py-10 pb-24 md:pb-10 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
