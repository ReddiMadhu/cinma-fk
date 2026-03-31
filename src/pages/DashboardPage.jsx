import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Plus, Trash2, RotateCw, Clock, Layers, AlertCircle,
  CheckCircle2, ChevronRight, Database, Zap
} from 'lucide-react';
import { listSessions, deleteSession, getSession } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STAGE_ORDER = ['column_map', 'geocoding', 'code_mapping', 'normalization'];
const STAGE_LABELS = {
  column_map: 'Mapped',
  geocoding: 'Geocoded',
  code_mapping: 'Codes Mapped',
  normalization: 'Normalized',
};

function getProgressLabel(stages_complete = {}) {
  const done = STAGE_ORDER.filter((s) => stages_complete[s]);
  if (done.length === 0) return { label: 'Uploaded', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  if (done.length === 4) return { label: 'Complete', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  const last = done[done.length - 1];
  return { label: STAGE_LABELS[last], color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' };
}

function getResumeRoute(stages_complete = {}, uploadId) {
  if (!stages_complete.column_map) return `/session/${uploadId}/map`;
  if (!stages_complete.geocoding || !stages_complete.code_mapping || !stages_complete.normalization)
    return `/session/${uploadId}/run`;
  return `/session/${uploadId}/review`;
}

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl bg-primary/10', color === 'text-primary' ? '' : '')}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUploadId, reset } = useSessionStore();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: listSessions,
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, id) => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const sessions = data?.sessions ?? [];
  const completeSessions = sessions.filter(
    (s) => s.stages_complete && Object.values(s.stages_complete).filter(Boolean).length === 4
  ).length;

  function handleResume(session) {
    reset();
    setUploadId(session.upload_id);
    navigate(getResumeRoute(session.stages_complete, session.upload_id));
  }

  function handleNew() {
    reset();
    navigate('/upload');
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg gradient-primary glow-primary-sm flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">CAT AI Pipeline</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Command Center</span>
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Manage your CAT modeling data pipeline sessions
          </p>
        </div>
        <Button
          id="btn-new-session"
          onClick={handleNew}
          size="lg"
          className="gradient-primary glow-primary text-white font-semibold rounded-xl px-6 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Database} label="Total Sessions" value={isLoading ? '—' : sessions.length} />
        <StatCard icon={CheckCircle2} label="Completed" value={isLoading ? '—' : completeSessions} color="text-green-400" />
        <StatCard icon={Zap} label="In Progress" value={isLoading ? '—' : sessions.length - completeSessions} color="text-amber-400" />
        <StatCard icon={AlertCircle} label="Total Flags" value={isLoading ? '—' : sessions.reduce((a, s) => a + (s.flag_count || 0), 0)} color="text-rose-400" />
      </div>

      {/* Sessions Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">Recent Sessions</h2>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['sessions'] })}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No sessions yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Start a new pipeline session to get going</p>
            <Button onClick={handleNew} className="mt-6 gradient-primary text-white" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Start Pipeline
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => {
              const { label, color } = getProgressLabel(session.stages_complete);
              return (
                <div
                  key={session.upload_id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <code className="text-xs text-muted-foreground font-mono">
                        {session.upload_id?.slice(0, 8)}…
                      </code>
                      <Badge className={cn('text-[10px] border px-2 py-0.5 font-medium', color)}>
                        {label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {session.target_format ?? 'AIR'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {session.row_count ?? 0} rows
                      </span>
                      {session.flag_count > 0 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          {session.flag_count} flags
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.created_at ? new Date(session.created_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      id={`btn-resume-${session.upload_id?.slice(0, 8)}`}
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => handleResume(session)}
                    >
                      Resume <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                    <button
                      id={`btn-delete-${session.upload_id?.slice(0, 8)}`}
                      onClick={() => deleteMutation.mutate(session.upload_id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
