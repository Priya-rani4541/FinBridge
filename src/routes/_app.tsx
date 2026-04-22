import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
    // Check onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (profile && !profile.onboarded && !location.pathname.startsWith("/onboarding")) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
