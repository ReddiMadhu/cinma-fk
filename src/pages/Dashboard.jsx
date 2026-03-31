import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSessions, getSessionInfo, deleteSession } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge } from "@/components/Badges";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineStore } from "@/store/pipeline";
import { Activity, ArrowRight, BarChart2, Plus, Zap, Database } from "lucide-react";
import { toast } from "sonner";

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <Card className="glass border-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({ id, onResume }) {
  const { data, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionInfo(id),
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: () => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries(["sessions"]);
      toast.success("Session deleted");
    },
  });

  const stages = data?.stages_complete ?? {};
  const stageNames = ["upload", "columns", "geocode", "map_codes", "normalize"];

  if (isLoading) {
    return (
      <tr className="border-b border-border">
        <td colSpan={6} className="py-3 px-4">
          <Skeleton className="h-5 w-full" />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
      <td className="py-3 px-4">
        <span className="font-mono text-xs text-muted-foreground">
          {id.slice(0, 8)}…
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {data?.target_format ?? "—"}
        </span>
      </td>
      <td className="py-3 px-4 text-sm">{data?.row_count ?? "—"}</td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {stageNames.map((s) => (
            <StageBadge key={s} stage={s} complete={stages[s]} />
          ))}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {data?.flag_count ?? 0} flags
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" onClick={() => onResume(id, data)}>
            Resume <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { setUploadResponse } = usePipelineStore();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    staleTime: 10_000,
  });

  const sessions = sessionsData?.sessions ?? [];

  const handleResume = (id, info) => {
    if (!info) return;
    const stages = info.stages_complete ?? {};
    if (!stages.normalize) navigate(`/session/${id}/run`);
    else if (!stages.review) navigate(`/session/${id}/review`);
    else navigate(`/session/${id}/done`);
  };

  return (
    <AppShell>
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
          <Zap className="h-3.5 w-3.5" />
          CAT Modeling Data Pipeline
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Transform your{" "}
          <span className="gradient-text">exposure data</span>
          <br />into CAT-ready output
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto mb-8">
          Upload any SOV file. Automatically geocode, classify occupancy and
          construction codes, review flags, and export AIR or RMS-ready CSVs.
        </p>
        <Button
          size="lg"
          className="btn-glow text-base h-12 px-8"
          onClick={() => navigate("/upload")}
        >
          <Plus className="h-5 w-5 mr-2" />
          Start New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Database} label="Total Sessions" value={sessions.length} />
        <StatCard icon={Activity} label="Active Today" value={sessions.slice(0, 3).length} color="text-emerald-400" />
        <StatCard icon={BarChart2} label="Formats Supported" value={2} color="text-violet-400" />
        <StatCard icon={Zap} label="Pipeline Stages" value={5} color="text-amber-400" />
      </div>

      {/* Recent Sessions */}
      <Card className="glass border-border">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")}>
            View all →
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No sessions yet</p>
              <p className="text-muted-foreground text-xs mt-1">
                Start a new session to process your first SOV file
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Session ID", "Format", "Rows", "Stages", "Flags", "Actions"].map((h) => (
                      <th key={h} className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 8).map((id) => (
                    <SessionRow key={id} id={id} onResume={handleResume} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
