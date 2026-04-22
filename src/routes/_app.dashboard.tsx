import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeCreditScore, type EmploymentType } from "@/lib/credit";
import { inr, formatDate } from "@/lib/format";
import { RiskBadge } from "@/components/RiskBadge";
import { BankAvatar } from "@/components/BankAvatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Banknote, PiggyBank, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FinBridge AI" },
      { name: "description", content: "Your AI credit score, active loans, and recommended bank products." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: loans } = useQuery({
    queryKey: ["loans", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("loans").select("*, banks(*)").eq("user_id", userId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banks").select("*").order("fd_rate", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const score = profile
    ? computeCreditScore({
        age: profile.age,
        monthly_income: profile.monthly_income ? Number(profile.monthly_income) : null,
        employment_type: profile.employment_type as EmploymentType | null,
        has_existing_loans: !!profile.has_existing_loans,
      })
    : null;

  const activeLoans = (loans ?? []).filter((l) => l.status === "active" || l.status === "approved");
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.repayment_amount), 0);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">
            {profile?.full_name ?? "there"} 👋
          </h1>
        </div>
        <Link to="/loans">
          <Button className="bg-gradient-brand text-primary-foreground font-semibold">
            Apply for instant loan <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Score + KPIs */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 lg:row-span-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-glow opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Credit Score
            </div>
            <ScoreRing score={score?.score ?? 0} />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Risk profile</div>
              {score && <RiskBadge risk={score.risk} />}
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Why this score?</div>
              <ul className="space-y-1.5">
                {score?.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {r.positive ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">{r.label}</span>
                    <span className={`text-xs font-mono ${r.delta >= 0 ? "text-success" : "text-destructive"}`}>
                      {r.delta > 0 ? "+" : ""}{r.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <KpiCard icon={Banknote} label="Active loans" value={String(activeLoans.length)} sub={inr(totalOutstanding) + " outstanding"} />
        <KpiCard icon={TrendingUp} label="Loan history" value={String(loans?.length ?? 0)} sub="Total applications" />
        <KpiCard icon={PiggyBank} label="Best FD rate" value={`${banks?.[0]?.fd_rate ?? 0}%`} sub={banks?.[0]?.name ?? ""} />
        <KpiCard icon={Sparkles} label="Bank partners" value={String(banks?.length ?? 0)} sub="Aggregated offers" />
      </div>

      {/* Active loans */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Active loans</h2>
          <Link to="/loans" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {activeLoans.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active loans. Try an instant loan to get started.</p>
            <Link to="/loans"><Button variant="outline" className="mt-4">Apply now</Button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeLoans.map((l) => (
              <div key={l.id} className="glass rounded-2xl p-5 flex items-start gap-4">
                <BankAvatar code={(l.banks as { short_code: string; brand_color: string }).short_code} color={(l.banks as { short_code: string; brand_color: string }).brand_color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-semibold text-lg">{inr(Number(l.amount))}</div>
                    <RiskBadge risk={l.risk_category} />
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{l.purpose} • {l.duration_days}d</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Repay" value={inr(Number(l.repayment_amount))} />
                    <Stat label="Due" value={formatDate(l.due_date)} />
                    <Stat label="Rate" value={`${l.interest_rate}% p.a.`} />
                    <Stat label="Status" value={<span className="text-success capitalize">{l.status}</span>} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-4">Recommended for you</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(banks ?? []).slice(0, 3).map((b) => (
            <div key={b.id} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <BankAvatar code={b.short_code} color={b.brand_color} />
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.tagline}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-elevated p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Loan from</div>
                  <div className="font-display font-bold text-lg">{b.loan_base_rate}%</div>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">FD up to</div>
                  <div className="font-display font-bold text-lg text-primary">{b.fd_rate}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-display font-bold text-2xl mt-2">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 70 ? "var(--color-success)" : score >= 50 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="relative w-44 h-44 mx-auto mt-4">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="12" fill="none" />
        <motion.circle
          cx="80" cy="80" r={r} stroke={color} strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display font-bold text-5xl">{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}
