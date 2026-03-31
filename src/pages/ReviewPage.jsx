import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle, ChevronRight, CheckCircle2, Loader2, Filter,
  StickyNote, X, Save
} from 'lucide-react';
import { getReview, submitCorrections } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import StepIndicator from '@/components/layout/StepIndicator';
import { cn } from '@/lib/utils';

const ISSUE_COLORS = {
  low_confidence: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  geocoding_failed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  unrecognized_state_code: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  missing_area: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const DEFAULT_ISSUE_COLOR = 'bg-muted text-muted-foreground border-border';

export default function ReviewPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { setReviewData, setUploadId } = useSessionStore();

  useEffect(() => { if (uploadId) setUploadId(uploadId); }, [uploadId, setUploadId]);

  const [filter, setFilter] = useState('all');
  const [edits, setEdits] = useState({});   // { `${rowIndex}|${field}`: newValue }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['review', uploadId],
    queryFn: () => getReview(uploadId),
    enabled: !!uploadId,
  });

  useEffect(() => { if (data) setReviewData(data); }, [data, setReviewData]);

  const correctMutation = useMutation({
    mutationFn: () => {
      const corrections = Object.entries(edits).map(([k, new_value]) => {
        const [row_index, ...fieldParts] = k.split('|');
        return { row_index: parseInt(row_index, 10), field: fieldParts.join('|'), new_value: String(new_value) };
      });
      return submitCorrections(uploadId, corrections);
    },
    onSuccess: (result) => {
      toast.success(`Applied ${result.applied} corrections`);
      setEdits({});
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const flags = data?.flags ?? [];
  const issueTypes = Array.from(new Set(flags.map((f) => f.issue)));

  const filteredFlags = filter === 'all'
    ? flags
    : flags.filter((f) => f.issue === filter);

  const editCount = Object.keys(edits).length;

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-destructive font-semibold">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1.5">
          <span className="gradient-text">Review & Corrections</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Inspect flagged rows and apply corrections before finalizing
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <StepIndicator currentStep="review" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        <button
          id="filter-all"
          onClick={() => setFilter('all')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg border transition-all font-medium',
            filter === 'all'
              ? 'gradient-primary text-white border-transparent'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          All ({flags.length})
        </button>
        {issueTypes.map((issue) => (
          <button
            key={issue}
            id={`filter-${issue}`}
            onClick={() => setFilter(issue)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-all font-medium',
              filter === issue
                ? 'gradient-primary text-white border-transparent'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {issue.replace(/_/g, ' ')} ({flags.filter((f) => f.issue === issue).length})
          </button>
        ))}
      </div>

      {/* Flags table */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-1">Row</div>
          <div className="col-span-2">Field</div>
          <div className="col-span-2">Issue</div>
          <div className="col-span-2">Current Value</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-3">Correction</div>
        </div>

        <div className="divide-y divide-border max-h-[55vh] overflow-y-auto">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 px-5 py-4">
                {[1, 2, 2, 2, 2, 3].map((span, j) => (
                  <div key={j} className={`col-span-${span}`}>
                    <Skeleton className="h-6 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ))
          ) : filteredFlags.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-medium text-foreground/80">
                {flags.length === 0 ? 'No flags found — pipeline ran clean!' : 'No flags match the current filter'}
              </p>
            </div>
          ) : (
            filteredFlags.map((flag, i) => {
              const editKey = `${flag.row_index}|${flag.field}`;
              const hasEdit = editKey in edits;

              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors',
                    hasEdit ? 'bg-primary/5' : 'hover:bg-accent/20'
                  )}
                >
                  {/* Row index */}
                  <div className="col-span-1">
                    <code className="text-xs font-mono text-muted-foreground">#{flag.row_index}</code>
                  </div>

                  {/* Field */}
                  <div className="col-span-2">
                    <code className="text-xs font-mono text-foreground/80 truncate block" title={flag.field}>
                      {flag.field}
                    </code>
                  </div>

                  {/* Issue badge */}
                  <div className="col-span-2">
                    <Badge
                      className={cn(
                        'text-[10px] border px-2 py-0.5 font-medium whitespace-nowrap',
                        ISSUE_COLORS[flag.issue] ?? DEFAULT_ISSUE_COLOR
                      )}
                    >
                      {flag.issue?.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Current value */}
                  <div className="col-span-2">
                    <span className="text-xs font-mono text-foreground/70 truncate block" title={flag.current_value}>
                      {flag.current_value ?? <span className="italic text-muted-foreground/50">null</span>}
                    </span>
                  </div>

                  {/* Confidence or Rule Applied */}
                  <div className="col-span-2 pr-2">
                    {flag.confidence != null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              flag.confidence >= 0.8 ? 'bg-green-500' : flag.confidence >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                            )}
                            style={{ width: `${(flag.confidence * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                          {(flag.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/80 leading-tight line-clamp-2" title={flag.message}>
                        {flag.message || "Rule auto-applied"}
                      </span>
                    )}
                  </div>

                  {/* Correction input */}
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id={`correction-${flag.row_index}-${flag.field}`}
                      className={cn(
                        'h-7 text-xs rounded-lg font-mono',
                        hasEdit && 'border-primary/50 bg-primary/5'
                      )}
                      placeholder={flag.alternatives?.[0] ?? 'Enter correction…'}
                      value={edits[editKey] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          const { [editKey]: _, ...rest } = edits;
                          setEdits(rest);
                        } else {
                          setEdits((ed) => ({ ...ed, [editKey]: val }));
                        }
                      }}
                    />
                    {hasEdit && (
                      <button
                        onClick={() => {
                          const { [editKey]: _, ...rest } = edits;
                          setEdits(rest);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="flex gap-3">
        {editCount > 0 && (
          <Button
            id="btn-submit-corrections"
            onClick={() => correctMutation.mutate()}
            disabled={correctMutation.isPending}
            variant="outline"
            className="flex-1 h-12 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold"
          >
            {correctMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Submit {editCount} Correction{editCount > 1 ? 's' : ''}</>
            )}
          </Button>
        )}
        <Button
          id="btn-finalize-download"
          size="lg"
          onClick={() => navigate(`/session/${uploadId}/done`)}
          className="flex-1 gradient-primary glow-primary text-white font-semibold rounded-xl h-12 text-base hover:opacity-90 transition-opacity"
        >
          Finalize & Download <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
