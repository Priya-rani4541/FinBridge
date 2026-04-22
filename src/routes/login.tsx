import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Shield, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — FinBridge AI" },
      { name: "description", content: "Sign in to FinBridge AI for instant micro-credit and bank product offers." },
    ],
  }),
  component: LoginPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passSchema = z.string().min(6, "Min 6 characters").max(72);

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRes = emailSchema.safeParse(email);
    const passRes = passSchema.safeParse(password);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    if (!passRes.success) return toast.error(passRes.error.issues[0].message);

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailRes.data,
          password: passRes.data,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name.trim() || emailRes.data.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to FinBridge.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailRes.data,
          password: passRes.data,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero side */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-violet relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <Link to="/login" className="flex items-center gap-2 z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">FinBridge AI</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="z-10 space-y-6"
        >
          <h1 className="text-5xl xl:text-6xl font-display font-bold leading-[1.05]">
            One credit decision.
            <br />
            <span className="text-gradient">Every bank.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            FinBridge unifies micro-loans and fixed deposits from SBI, HDFC and ICICI behind a single AI engine. Apply once. Compare instantly.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-lg pt-6">
            {[
              { icon: Zap, label: "Instant decisions" },
              { icon: Shield, label: "Explainable AI" },
              { icon: TrendingUp, label: "Best-rate aggregator" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass rounded-xl p-4">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="z-10 text-xs text-muted-foreground">
          Demo platform. No real money is moved.
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">FinBridge AI</span>
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin" ? "Sign in to access your credit dashboard." : "Start with an instant credit assessment."}
          </p>

          <Button
            onClick={handleGoogle}
            disabled={busy}
            variant="outline"
            className="w-full h-11 mb-6 bg-surface-elevated border-border hover:bg-surface"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 mt-0">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" maxLength={100} />
                </div>
              </TabsContent>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-brand text-primary-foreground font-semibold hover:opacity-90">
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
