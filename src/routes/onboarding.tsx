import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: Onboarding,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  age: z.number().int().min(18, "Must be 18+").max(80),
  monthly_income: z.number().min(0).max(10_000_000),
  employment_type: z.enum(["student", "salaried", "self_employed"]),
  has_existing_loans: z.boolean(),
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [emp, setEmp] = useState<"student" | "salaried" | "self_employed">("salaried");
  const [hasLoans, setHasLoans] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (p) {
        if (p.onboarded) navigate({ to: "/dashboard" });
        setName(p.full_name ?? "");
        if (p.age) setAge(String(p.age));
        if (p.monthly_income) setIncome(String(p.monthly_income));
        if (p.employment_type) setEmp(p.employment_type as "student" | "salaried" | "self_employed");
        setHasLoans(Boolean(p.has_existing_loans));
      }
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      full_name: name,
      age: Number(age),
      monthly_income: Number(income),
      employment_type: emp,
      has_existing_loans: hasLoans,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, onboarded: true, updated_at: new Date().toISOString() })
      .eq("id", u.user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved. Generating your credit score…");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl glass rounded-2xl p-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">FinBridge AI</span>
        </div>
        <h1 className="text-3xl font-display font-bold mt-4">Tell us about you</h1>
        <p className="text-muted-foreground mt-1">Our AI uses these signals to score your creditworthiness.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={18} max={80} value={age} onChange={(e) => setAge(e.target.value)} placeholder="28" />
            </div>
            <div>
              <Label htmlFor="income">Monthly income (₹)</Label>
              <Input id="income" type="number" min={0} value={income} onChange={(e) => setIncome(e.target.value)} placeholder="45000" />
            </div>
          </div>

          <div>
            <Label>Employment type</Label>
            <RadioGroup value={emp} onValueChange={(v) => setEmp(v as typeof emp)} className="grid grid-cols-3 gap-2 mt-2">
              {[
                { v: "salaried", l: "Salaried" },
                { v: "self_employed", l: "Self-employed" },
                { v: "student", l: "Student" },
              ].map((o) => (
                <Label
                  key={o.v}
                  htmlFor={o.v}
                  className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition ${emp === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-elevated"}`}
                >
                  <RadioGroupItem id={o.v} value={o.v} className="sr-only" />
                  {o.l}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-4">
            <div>
              <div className="font-medium">Existing loans?</div>
              <div className="text-xs text-muted-foreground">Active EMIs from any lender.</div>
            </div>
            <Switch checked={hasLoans} onCheckedChange={setHasLoans} />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-brand text-primary-foreground font-semibold">
            {busy ? "Saving…" : "Continue to dashboard"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
