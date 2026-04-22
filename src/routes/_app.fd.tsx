import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fdMaturity } from "@/lib/credit";
import { inr } from "@/lib/format";
import { BankAvatar } from "@/components/BankAvatar";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/fd")({
  head: () => ({
    meta: [
      { title: "Fixed Deposits — FinBridge AI" },
      { name: "description", content: "Compare FD interest rates and maturity values across partner banks." },
    ],
  }),
  component: FdPage,
});

function FdPage() {
  const [amount, setAmount] = useState(50000);
  const [days, setDays] = useState(365);

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => (await supabase.from("banks").select("*").order("fd_rate", { ascending: false })).data ?? [],
  });

  const offers = useMemo(() => (banks ?? []).map(b => {
    const { interest, maturity } = fdMaturity(amount, Number(b.fd_rate), days);
    return { bank: b, interest, maturity };
  }), [banks, amount, days]);

  const best = offers[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Fixed deposits</h1>
        <p className="text-muted-foreground mt-1">Park your savings at the best rate. Returns compared instantly.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Deposit amount</Label>
              <div className="font-display font-bold text-2xl text-gradient">{inr(amount)}</div>
            </div>
            <Slider min={5000} max={1000000} step={5000} value={[amount]} onValueChange={(v) => setAmount(v[0])} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>₹5K</span><span>₹10L</span></div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Tenure</Label>
              <div className="font-display font-bold text-xl">{days} days <span className="text-sm text-muted-foreground font-normal">(~{(days/365).toFixed(1)} yr)</span></div>
            </div>
            <Slider min={30} max={1825} step={30} value={[days]} onValueChange={(v) => setDays(v[0])} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>30d</span><span>5y</span></div>
          </div>
        </div>

        {best && (
          <div className="glass rounded-2xl p-6 bg-gradient-violet/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow opacity-60" />
            <div className="relative">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Best maturity</div>
              <div className="font-display font-bold text-4xl mt-2 text-gradient">{inr(best.maturity)}</div>
              <div className="text-sm text-muted-foreground mt-1">via {best.bank.name} @ {best.bank.fd_rate}%</div>
              <div className="text-xs text-success mt-3">+{inr(best.interest)} interest earned</div>
            </div>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-xl font-display font-semibold mb-4">All FD offers</h2>
        <div className="space-y-3">
          {offers.map((o, i) => (
            <motion.div
              key={o.bank.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl p-5 flex flex-wrap items-center gap-4 ${i === 0 ? "glow border-primary/40" : ""}`}
            >
              <BankAvatar code={o.bank.short_code} color={o.bank.brand_color} size={48} />
              <div className="flex-1 min-w-[120px]">
                <div className="flex items-center gap-2">
                  <div className="font-display font-semibold">{o.bank.name}</div>
                  {i === 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Best</span>}
                </div>
                <div className="text-xs text-muted-foreground">Min ₹{Number(o.bank.fd_min_amount).toLocaleString("en-IN")} • {o.bank.fd_min_days}–{o.bank.fd_max_days}d</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</div>
                <div className="font-display font-bold text-2xl text-primary">{o.bank.fd_rate}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Interest</div>
                <div className="font-display font-bold text-lg text-success">+{inr(o.interest)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Maturity</div>
                <div className="font-display font-bold text-lg">{inr(o.maturity)}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
