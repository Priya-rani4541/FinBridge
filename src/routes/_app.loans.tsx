import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeCreditScore, quoteLoan, type EmploymentType } from "@/lib/credit";
import { inr, formatDate } from "@/lib/format";
import { BankAvatar } from "@/components/BankAvatar";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Sparkles, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/loans")({
  head: () => ({
    meta: [
      { title: "Instant Loans — FinBridge AI" },
      { name: "description", content: "Apply for instant micro-credit and compare offers across partner banks." },
    ],
  }),
  component: LoansPage,
});

const PURPOSES = ["Medical", "Emergency", "Education", "Travel", "Bills", "Other"];

function LoansPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const [amount, setAmount] = useState(5000);
  const [duration, setDuration] = useState(30);
  const [purpose, setPurpose] = useState("Medical");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId!).single()).data,
  });
  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => (await supabase.from("banks").select("*")).data ?? [],
  });
  const { data: loans } = useQuery({
    queryKey: ["loans", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("loans").select("*, banks(*)").eq("user_id", userId!).order("created_at", { ascending: false })).data ?? [],
  });

  const score = useMemo(() => profile
    ? computeCreditScore({
        age: profile.age,
        monthly_income: profile.monthly_income ? Number(profile.monthly_income) : null,
        employment_type: profile.employment_type as EmploymentType | null,
        has_existing_loans: !!profile.has_existing_loans,
      })
    : null, [profile]);

  const quotes = useMemo(() => {
    if (!banks || !score) return [];
    return banks.map((b) => quoteLoan({
      id: b.id, name: b.name, short_code: b.short_code, brand_color: b.brand_color,
      loan_base_rate: Number(b.loan_base_rate), loan_risk_premium: Number(b.loan_risk_premium),
      min_score_required: b.min_score_required, fd_rate: Number(b.fd_rate),
    }, amount, duration, score.score)).sort((a, b) => Number(b.approved) - Number(a.approved) || a.annualRate - b.annualRate);
  }, [banks, score, amount, duration]);

  const apply = async (q: typeof quotes[number]) => {
    if (!userId || !score) return;
    setSubmitting(q.bank.id);
    const { error } = await supabase.from("loans").insert({
      user_id: userId,
      bank_id: q.bank.id,
      amount: q.amount,
      duration_days: q.durationDays,
      purpose,
      interest_rate: q.annualRate,
      repayment_amount: q.repayment,
      due_date: q.dueDate.toISOString().slice(0, 10),
      status: q.approved ? "active" : "rejected",
      credit_score: score.score,
      risk_category: score.risk,
      decision_reasons: q.approved
        ? score.reasons.filter(r => r.positive).map(r => r.label)
        : [q.rejectionReason ?? "Score below bank threshold", ...score.reasons.filter(r => !r.positive).map(r => r.label)],
    });
    setSubmitting(null);
    if (error) return toast.error(error.message);
    toast.success(q.approved ? `Approved by ${q.bank.name}!` : `Rejected by ${q.bank.name}`);
    qc.invalidateQueries({ queryKey: ["loans"] });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Instant micro-credit</h1>
        <p className="text-muted-foreground mt-1">₹500 – ₹20,000 from our partner banks. Decision in seconds.</p>
      </div>

      {/* Configurator */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Loan amount</Label>
              <div className="font-display font-bold text-2xl text-gradient">{inr(amount)}</div>
            </div>
            <Slider min={500} max={20000} step={500} value={[amount]} onValueChange={(v) => setAmount(v[0])} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>₹500</span><span>₹20,000</span></div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Duration</Label>
              <div className="font-display font-bold text-xl">{duration} days</div>
            </div>
            <Slider min={7} max={60} step={1} value={[duration]} onValueChange={(v) => setDuration(v[0])} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>7d</span><span>60d</span></div>
          </div>

          <div>
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 bg-gradient-violet/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Your AI score
          </div>
          <div className="font-display font-bold text-6xl mt-2">{score?.score ?? "—"}</div>
          {score && <div className="mt-2"><RiskBadge risk={score.risk} /></div>}
          <p className="text-xs text-muted-foreground mt-4">Rates below are personalised to your risk profile.</p>
        </div>
      </div>

      {/* Quotes */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-4">Offers from {quotes.length} banks</h2>
        <div className="space-y-3">
          <AnimatePresence>
            {quotes.map((q, i) => (
              <motion.div
                key={q.bank.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl p-5 ${i === 0 && q.approved ? "glow border-primary/40" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <BankAvatar code={q.bank.short_code} color={q.bank.brand_color} size={48} />
                  <div className="flex-1 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="font-display font-semibold">{q.bank.name}</div>
                      {i === 0 && q.approved && <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Best offer</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{q.approved ? "Pre-approved instantly" : q.rejectionReason}</div>
                  </div>
                  <div className="hidden md:block text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</div>
                    <div className="font-display font-bold text-xl">{q.annualRate}%</div>
                  </div>
                  <div className="hidden md:block text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Repay</div>
                    <div className="font-display font-bold text-xl">{inr(q.repayment)}</div>
                  </div>
                  <div className="hidden md:block text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</div>
                    <div className="font-medium text-sm flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(q.dueDate)}</div>
                  </div>
                  <Button
                    onClick={() => apply(q)}
                    disabled={submitting === q.bank.id}
                    className={q.approved ? "bg-gradient-brand text-primary-foreground" : ""}
                    variant={q.approved ? "default" : "outline"}
                  >
                    {submitting === q.bank.id ? "…" : q.approved ? "Apply" : "Try anyway"}
                  </Button>
                </div>

                {/* Mobile breakdown */}
                <div className="md:hidden mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-surface-elevated p-2"><div className="text-[10px] text-muted-foreground">Rate</div><div className="font-bold">{q.annualRate}%</div></div>
                  <div className="rounded bg-surface-elevated p-2"><div className="text-[10px] text-muted-foreground">Repay</div><div className="font-bold text-sm">{inr(q.repayment)}</div></div>
                  <div className="rounded bg-surface-elevated p-2"><div className="text-[10px] text-muted-foreground">Due</div><div className="font-bold text-xs">{formatDate(q.dueDate)}</div></div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="text-xl font-display font-semibold mb-4">Loan history</h2>
        {(loans ?? []).length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No applications yet.</div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Bank</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3 hidden sm:table-cell">Rate</th>
                  <th className="text-left p-3 hidden sm:table-cell">Due</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(loans ?? []).map((l) => {
                  const b = l.banks as { short_code: string; brand_color: string; name: string };
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="p-3"><div className="flex items-center gap-2"><BankAvatar code={b.short_code} color={b.brand_color} size={28} /><span className="hidden sm:inline">{b.name}</span></div></td>
                      <td className="p-3 font-medium">{inr(Number(l.amount))}</td>
                      <td className="p-3 hidden sm:table-cell">{l.interest_rate}%</td>
                      <td className="p-3 hidden sm:table-cell">{formatDate(l.due_date)}</td>
                      <td className="p-3">
                        {l.status === "rejected"
                          ? <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="h-3.5 w-3.5" /> Rejected</span>
                          : <span className="inline-flex items-center gap-1 text-success text-xs capitalize"><CheckCircle2 className="h-3.5 w-3.5" /> {l.status}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
