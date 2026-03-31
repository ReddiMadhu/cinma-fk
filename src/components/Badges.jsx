import { cn } from "@/lib/utils";

const METHOD_STYLES = {
  rule:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  llm:      "bg-violet-500/15 text-violet-400 border-violet-500/30",
  tfidf:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  default:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  user_override: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  fuzzy:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

export function MethodBadge({ method }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        METHOD_STYLES[method] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {method?.replace("_", " ") ?? "—"}
    </span>
  );
}

export function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

export function StageBadge({ stage, complete }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        complete
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-zinc-500/15 text-zinc-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          complete ? "bg-emerald-400" : "bg-zinc-500"
        )}
      />
      {stage}
    </span>
  );
}
