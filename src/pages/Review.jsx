import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getReview, submitCorrections } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, AlertTriangle, Flag, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ISSUE_COLORS = {
  low_confidence: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  geocoding_failed: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  unrecognized_state_code: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  invalid_year: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  invalid_area: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  invalid_value: "text-red-400 bg-red-500/10 border-red-500/30",
};

function IssueBadge({ issue }) {
  const style = ISSUE_COLORS[issue] ?? "text-muted-foreground bg-muted border-border";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", style)}>
      {issue.replace(/_/g, " ")}
    </span>
  );
}

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markStageComplete, setFlagCount } = usePipelineStore();

  const [corrections, setCorrections] = useState({});
  const [filter, setFilter] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["review", id],
    queryFn: () => getReview(id),
    staleTime: 0,
  });

  const flags = data?.flags ?? [];
  const filteredFlags = filter
    ? flags.filter(
        (f) =>
          f.issue.includes(filter) ||
          f.field.toLowerCase().includes(filter.toLowerCase())
      )
    : flags;

  const submitMut = useMutation({
    mutationFn: () => {
      const items = Object.entries(corrections).map(([key, new_value]) => {
        const [row_index, field] = key.split("__");
        return { row_index: Number(row_index), field, new_value };
      });
      return submitCorrections(id, items);
    },
    onSuccess: (res) => {
      toast.success(`${res.applied} corrections applied, ${res.flags_removed} flags resolved`);
      setCorrections({});
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (data?.flags) setFlagCount(data.flags.length);
  }, [data]);

  const issueTypes = [...new Set(flags.map((f) => f.issue))];
  const pendingCount = Object.keys(corrections).length;

  return (
    <AppShell showWizard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Review Flags</h1>
            <p className="text-muted-foreground text-sm">
              {flags.length} flag{flags.length !== 1 ? "s" : ""} across {new Set(flags.map((f) => f.row_index)).size} rows
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCorrections({})}
              >
                Clear {pendingCount} staged
              </Button>
            )}
            <Button
              disabled={pendingCount === 0 || submitMut.isPending}
              onClick={() => submitMut.mutate()}
              className={pendingCount > 0 ? "btn-glow" : ""}
            >
              {submitMut.isPending ? "Submitting…" : `Submit ${pendingCount || ""} Corrections`}
            </Button>
          </div>
        </div>

        {/* Issue type filters */}
        {issueTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("")}
              className={cn(
                "text-xs rounded-full border px-3 py-1 transition-colors",
                !filter ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              All ({flags.length})
            </button>
            {issueTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(filter === t ? "" : t)}
                className={cn(
                  "text-xs rounded-full border px-3 py-1 transition-colors",
                  filter === t ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t.replace(/_/g, " ")} ({flags.filter((f) => f.issue === t).length})
              </button>
            ))}
          </div>
        )}

        {/* Flags table */}
        <Card className="glass border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredFlags.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                <p className="font-medium">No flags to review</p>
                <p className="text-xs text-muted-foreground mt-1">All data passed validation</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Row", "Field", "Issue", "Current Value", "Confidence", "Correction"].map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlags.map((flag, i) => {
                      const key = `${flag.row_index}__${flag.field}`;
                      const isStaged = key in corrections;
                      return (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors",
                            isStaged ? "bg-primary/5" : "hover:bg-muted/20"
                          )}
                        >
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              #{flag.row_index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold font-mono text-primary">
                              {flag.field}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <IssueBadge issue={flag.issue} />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-muted-foreground">
                              {String(flag.current_value ?? "—")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {flag.confidence != null ? (
                              <span className={cn(
                                "text-xs font-semibold",
                                flag.confidence >= 0.7 ? "text-emerald-400" :
                                flag.confidence >= 0.4 ? "text-amber-400" : "text-rose-400"
                              )}>
                                {Math.round(flag.confidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {flag.alternatives?.length > 0 ? (
                              <select
                                value={corrections[key] ?? ""}
                                onChange={(e) =>
                                  setCorrections((prev) => {
                                    if (!e.target.value) {
                                      const { [key]: _, ...rest } = prev;
                                      return rest;
                                    }
                                    return { ...prev, [key]: e.target.value };
                                  })
                                }
                                className="text-xs rounded-lg px-2 py-1.5 border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                              >
                                <option value="">Keep current</option>
                                {flag.alternatives.map((alt, ai) => (
                                  <option key={ai} value={String(alt.code ?? alt)}>
                                    {alt.code ?? String(alt)} {alt.confidence != null ? `(${Math.round(alt.confidence * 100)}%)` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter correction…"
                                value={corrections[key] ?? ""}
                                onChange={(e) =>
                                  setCorrections((prev) => {
                                    if (!e.target.value) {
                                      const { [key]: _, ...rest } = prev;
                                      return rest;
                                    }
                                    return { ...prev, [key]: e.target.value };
                                  })
                                }
                                className="text-xs rounded-lg px-2 py-1.5 border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none w-36"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground self-center">
            {pendingCount > 0 && (
              <span className="text-primary font-medium">{pendingCount} staged corrections</span>
            )}
          </p>
          <Button
            size="lg"
            className="btn-glow"
            onClick={() => {
              markStageComplete("review");
              navigate(`/session/${id}/done`);
            }}
          >
            Finalize & Export
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
