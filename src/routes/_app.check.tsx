import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { computeCreditScore, quoteLoan, type EmploymentType } from "@/lib/credit";
import { inr, formatDate } from "@/lib/format";
import { BankAvatar } from "@/components/BankAvatar";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, Sparkles, ShieldCheck, RotateCcw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/check")({
  head: () => ({
    meta: [
      { title: "Loan Eligibility Checker — FinBridge AI" },
      {
        name: "description",
        content:
          "Re-enter your income and details to instantly check which banks would approve you — no application saved.",
      },
    ],
  }),
  component: CheckEligibilityPage,
});

const PURPOSES = ["Medical", "Emergency", "Education", "Travel", "Bills", "Other"];

// Validation schema — keeps user input safe & sane.
const formSchema = z.object({
  age: z.coerce
    .number({ invalid_type_error: "Enter your age" })
    .int()
    .min(18, "Must be 18 or older")
    .max(80, "Must be 80 or younger"),
  monthly_income: z.coerce
    .number({ invalid_type_error: "Enter your monthly income" })
    .min(0, "Income can't be negative")
    .max(10_000_000, "That looks too high"),
  employment_type: z.enum(["student", "salaried", "self_employed"]),
  has_existing_loans: z.boolean(),
  amount: z.coerce.number().min(500).max(20000),
  duration: z.coerce.number().int().min(7).max(60),
  purpose: z.string().min(1),
});

type FormState = {
  age: string;
  monthly_income: string;
  employment_type: EmploymentType;
  has_existing_loans: boolean;
  amount: number;
  duration: number;
  purpose: string;
};

const DEFAULTS: FormState = {
  age: "",
  monthly_income: "",
  employment_type: "salaried",
  has_existing_loans: false,
  amount: 5000,
  duration: 30,
  purpose: "Medical",
};

function CheckEligibilityPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<ReturnType<typeof computeCreditScore> | null>(null);
  const [checkInputs, setCheckInputs] = useState<{
    amount: number;
    duration: number;
    purpose: string;
  } | null>(null);

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => (await supabase.from("banks").select("*")).data ?? [],
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your inputs");
      return;
    }
    const score = computeCreditScore({
      age: parsed.data.age,
      monthly_income: parsed.data.monthly_income,
      employment_type: parsed.data.employment_type,
      has_existing_loans: parsed.data.has_existing_loans,
    });
    setResult(score);
    setCheckInputs({
      amount: parsed.data.amount,
      duration: parsed.data.duration,
      purpose: parsed.data.purpose,
    });
    toast.success("Eligibility calculated");
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    setResult(null);
    setCheckInputs(null);
  };

  const quotes = useMemo(() => {
    if (!banks || !result || !checkInputs) return [];
    return banks
      .map((b) =>
        quoteLoan(
          {
            id: b.id,
            name: b.name,
            short_code: b.short_code,
            brand_color: b.brand_color,
            loan_base_rate: Number(b.loan_base_rate),
            loan_risk_premium: Number(b.loan_risk_premium),
            min_score_required: b.min_score_required,
            fd_rate: Number(b.fd_rate),
          },
          checkInputs.amount,
          checkInputs.duration,
          result.score,
        ),
      )
      .sort(
        (a, b) =>
          Number(b.approved) - Number(a.approved) || a.annualRate - b.annualRate,
      );
  }, [banks, result, checkInputs]);

  const approvedCount = quotes.filter((q) => q.approved).length;

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
          <ShieldCheck className="h-3.5 w-3.5" /> Soft check — nothing saved
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">
          Check your loan eligibility
        </h1>
        <p className="text-muted-foreground mt-1">
          Re-enter your income and a few details to instantly see which banks would
          approve you — no application is created.
        </p>
      </div>

      <form onSubmit={handleCheck} className="grid lg:grid-cols-3 gap-4">
        {/* Profile inputs */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={18}
                max={80}
                placeholder="e.g. 28"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="income">Monthly income (₹)</Label>
              <Input
                id="income"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="e.g. 45000"
                value={form.monthly_income}
                onChange={(e) => set("monthly_income", e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Employment</Label>
              <Select
                value={form.employment_type}
                onValueChange={(v) => set("employment_type", v as EmploymentType)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salaried">Salaried</SelectItem>
                  <SelectItem value="self_employed">Self-employed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3 mt-7">
              <div>
                <div className="text-sm font-medium">Existing loans</div>
                <div className="text-xs text-muted-foreground">Active EMIs on record</div>
              </div>
              <Switch
                checked={form.has_existing_loans}
                onCheckedChange={(c) => set("has_existing_loans", c)}
              />
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <Label>Loan amount</Label>
                <div className="font-display font-bold text-xl text-gradient">
                  {inr(form.amount)}
                </div>
              </div>
              <Slider
                min={500}
                max={20000}
                step={500}
                value={[form.amount]}
                onValueChange={(v) => set("amount", v[0])}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <Label>Duration</Label>
                <div className="font-display font-bold text-lg">{form.duration} days</div>
              </div>
              <Slider
                min={7}
                max={60}
                step={1}
                value={[form.duration]}
                onValueChange={(v) => set("duration", v[0])}
              />
            </div>

            <div>
              <Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" className="bg-gradient-brand text-primary-foreground">
              <Sparkles className="h-4 w-4 mr-2" /> Check eligibility
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </div>

        {/* Score panel */}
        <div className="glass rounded-2xl p-6 bg-gradient-violet/30 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI score
          </div>
          <div className="font-display font-bold text-6xl mt-2">
            {result?.score ?? "—"}
          </div>
          {result ? (
            <>
              <div className="mt-2">
                <RiskBadge risk={result.risk} />
              </div>
              <div className="mt-4 text-sm">
                <span className="font-semibold text-foreground">{approvedCount}</span>{" "}
                <span className="text-muted-foreground">
                  of {quotes.length} banks would approve
                </span>
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                {result.reasons.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    {r.positive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    )}
                    <span className="text-muted-foreground">{r.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">
              Fill in your details and hit{" "}
              <span className="text-foreground font-medium">Check eligibility</span> to see
              your live score and per-bank decisions.
            </p>
          )}
        </div>
      </form>

      {/* Per-bank decisions */}
      {result && checkInputs && (
        <section>
          <h2 className="text-xl font-display font-semibold mb-4">
            Per-bank decisions
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {quotes.map((q, i) => (
                <motion.div
                  key={q.bank.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass rounded-2xl p-5 ${
                    i === 0 && q.approved ? "glow border-primary/40" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <BankAvatar
                      code={q.bank.short_code}
                      color={q.bank.brand_color}
                      size={44}
                    />
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-semibold">{q.bank.name}</div>
                        {q.approved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {q.approved
                          ? `Min score required: ${q.bank.min_score_required} • You: ${result.score}`
                          : q.rejectionReason}
                      </div>
                    </div>
                    {q.approved && (
                      <>
                        <div className="hidden md:block text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Rate
                          </div>
                          <div className="font-display font-bold text-xl">
                            {q.annualRate}%
                          </div>
                        </div>
                        <div className="hidden md:block text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Repay
                          </div>
                          <div className="font-display font-bold text-xl">
                            {inr(q.repayment)}
                          </div>
                        </div>
                        <div className="hidden md:block text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Due
                          </div>
                          <div className="font-medium text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDate(q.dueDate)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {q.approved && (
                    <div className="md:hidden mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-surface-elevated p-2">
                        <div className="text-[10px] text-muted-foreground">Rate</div>
                        <div className="font-bold">{q.annualRate}%</div>
                      </div>
                      <div className="rounded bg-surface-elevated p-2">
                        <div className="text-[10px] text-muted-foreground">Repay</div>
                        <div className="font-bold text-sm">{inr(q.repayment)}</div>
                      </div>
                      <div className="rounded bg-surface-elevated p-2">
                        <div className="text-[10px] text-muted-foreground">Due</div>
                        <div className="font-bold text-xs">{formatDate(q.dueDate)}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            This is a soft eligibility check. To actually apply, head to{" "}
            <span className="text-foreground font-medium">Instant Loans</span>.
          </p>
        </section>
      )}
    </div>
  );
}
