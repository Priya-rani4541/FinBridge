import { cn } from "@/lib/utils";

export function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    "Low Risk": "bg-success/15 text-success border-success/30",
    "Medium Risk": "bg-warning/15 text-warning border-warning/30",
    "High Risk": "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", map[risk] ?? "bg-muted text-muted-foreground")}>
      {risk}
    </span>
  );
}
