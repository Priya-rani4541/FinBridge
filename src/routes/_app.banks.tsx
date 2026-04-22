import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BankAvatar } from "@/components/BankAvatar";
import { motion } from "framer-motion";
import { Banknote, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/_app/banks")({
  head: () => ({
    meta: [
      { title: "Bank Offers — FinBridge AI" },
      { name: "description", content: "Compare loan and FD offers across all partner banks in one place." },
    ],
  }),
  component: BanksPage,
});

function BanksPage() {
  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => (await supabase.from("banks").select("*").order("loan_base_rate", { ascending: true })).data ?? [],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Bank aggregator</h1>
        <p className="text-muted-foreground mt-1">Loan & deposit offers from {banks?.length ?? 0} partner banks, side by side.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {(banks ?? []).map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="p-6 relative" style={{ background: `linear-gradient(135deg, ${b.brand_color}33, transparent)` }}>
              <div className="flex items-center gap-3">
                <BankAvatar code={b.short_code} color={b.brand_color} size={56} />
                <div>
                  <div className="font-display font-bold text-xl">{b.name}</div>
                  <div className="text-sm text-muted-foreground">{b.tagline}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Loans from</div>
                <div className="font-display font-bold text-3xl mt-1">{b.loan_base_rate}%</div>
                <div className="text-xs text-muted-foreground mt-1">+ {b.loan_risk_premium}% per risk tier</div>
                <div className="text-xs text-muted-foreground mt-3">Min score: <span className="text-foreground font-medium">{b.min_score_required}/100</span></div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><PiggyBank className="h-3.5 w-3.5" /> FD up to</div>
                <div className="font-display font-bold text-3xl mt-1 text-primary">{b.fd_rate}%</div>
                <div className="text-xs text-muted-foreground mt-1">Min ₹{Number(b.fd_min_amount).toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground mt-3">Tenure: {b.fd_min_days}–{b.fd_max_days} days</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
