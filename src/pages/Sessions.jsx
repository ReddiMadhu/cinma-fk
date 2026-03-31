import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSessions, getSessionInfo, deleteSession } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/Badges";
import { toast } from "sonner";
import { ArrowRight, Trash2, RefreshCw } from "lucide-react";

function SessionDetailRow({ id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionInfo(id),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries(["sessions"]);
      toast.success("Session deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const stages = data?.stages_complete ?? {};
  const stageKeys = ["upload", "columns", "geocode", "map_codes", "normalize"];
  const doneCount = stageKeys.filter((k) => stages[k]).length;

  const resume = () => {
    if (!data) return;
    if (!stages.normalize) navigate(`/session/${id}/run`);
    else if (!stages.review) navigate(`/session/${id}/review`);
    else navigate(`/session/${id}/done`);
  };

  if (isLoading) {
    return (
      <tr className="border-b border-border">
        <td colSpan={7} className="py-3 px-4">
          <Skeleton className="h-5 w-full" />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{id.slice(0, 12)}…</td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {data?.target_format}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-center">{data?.row_count ?? "—"}</td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {stageKeys.map((s) => <StageBadge key={s} stage={s} complete={stages[s]} />)}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-center">
        <span className={stages.normalize ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
          {doneCount}/{stageKeys.length}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-center text-amber-400">
        {data?.flag_count ?? 0}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" onClick={resume}>
            Resume <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function Sessions() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    staleTime: 10_000,
  });

  const sessions = data?.sessions ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">All Sessions</h1>
            <p className="text-muted-foreground text-sm">{sessions.length} total sessions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>

        <Card className="glass border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-muted-foreground text-sm">No sessions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Session ID", "Format", "Rows", "Stages", "Progress", "Flags", "Actions"].map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((id) => (
                      <SessionDetailRow key={id} id={id} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
