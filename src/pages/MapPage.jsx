import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronRight, AlertCircle, CheckCircle2, Loader2, Info
} from 'lucide-react';
import { suggestColumns, confirmColumns } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import StepIndicator from '@/components/layout/StepIndicator';
import { cn } from '@/lib/utils';

// ── Colour helpers ─────────────────────────────────────────────────────────────
const CONFIDENCE_COLOR = (score) => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.5) return 'text-amber-400';
  return 'text-rose-400';
};

const CONFIDENCE_BG = (score) => {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.5) return 'bg-amber-500';
  return 'bg-rose-500';
};

const NONE_VALUE = '__none__';

// AIR + RMS canonical fields for the dropdown options
const AIR_FIELDS = [
  'ContractID','LocationID','LocationName','FullAddress','Street','City','Area',
  'PostalCode','CountryISO','Latitude','Longitude','OccupancyCodeType','OccupancyCode',
  'ConstructionCodeType','ConstructionCode','RiskCount','NumberOfStories','GrossArea',
  'YearBuilt','YearRetrofitted','BuildingValue','ContentsValue','TimeElementValue',
  'Currency','LineOfBusiness','SprinklerSystem','RoofGeometry','FoundationType',
  'WallSiding','SoftStory','WallType',
];

const RMS_FIELDS = [
  'ACCNTNUM','LOCNUM','LOCNAME','STREETNAME','CITY','STATECODE','POSTALCODE',
  'CNTRYCODE','Latitude','Longitude','BLDGSCHEME','BLDGCLASS','OCCSCHEME','OCCTYPE',
  'NUMBLDGS','NUMSTORIES','FLOORAREA','YEARBUILT','YEARUPGRAD','SPRINKLER',
  'ROOFGEOM','FOUNDATION','CLADDING','SOFTSTORY','WALLTYPE',
  'EQCV1VAL','EQCV2VAL','EQCV3VAL','WSCV1VAL','WSCV2VAL','WSCV3VAL',
];

export default function MapPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { setColumnMap, setUploadId, targetFormat, uploadMeta } = useSessionStore();
  const [localMap, setLocalMap] = useState({});   // { sourceCol: canonicalField | null }

  // Restore uploadId if page is refreshed
  useEffect(() => { if (uploadId) setUploadId(uploadId); }, [uploadId, setUploadId]);

  // ── Fetch suggestions ──────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['suggest-columns', uploadId],
    queryFn: () => suggestColumns(uploadId),
    enabled: !!uploadId,
    staleTime: Infinity,
    retry: 1,
  });

  // ── Build sample values map from uploadMeta.sample ─────────────────────────
  // uploadMeta.sample is [{ col: value, ... }, ...] — first 5 rows
  const sampleMap = useMemo(() => {
    if (!uploadMeta?.sample) return {};
    const map = {};
    for (const row of uploadMeta.sample) {
      for (const [col, val] of Object.entries(row)) {
        if (!map[col]) map[col] = [];
        if (val != null && map[col].length < 3 && !map[col].includes(String(val))) {
          map[col].push(String(val));
        }
      }
    }
    return map;
  }, [uploadMeta]);

  // ── Canonical field options for the target format ──────────────────────────
  const canonicalOptions = targetFormat === 'RMS' ? RMS_FIELDS : AIR_FIELDS;

  // ── Initialize localMap from API suggestions (top suggestion per column) ───
  useEffect(() => {
    if (!data?.suggestions) return;
    const initial = {};
    for (const [col, suggestions] of Object.entries(data.suggestions)) {
      // suggestions is an array of { canonical, score, method, reason }
      if (suggestions && suggestions.length > 0) {
        initial[col] = suggestions[0].canonical;
      } else {
        initial[col] = null;
      }
    }
    setLocalMap(initial);
  }, [data]);

  // ── Confirm mapping mutation ───────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () => confirmColumns(uploadId, localMap),
    onSuccess: (result) => {
      setColumnMap(localMap);
      if (result.warnings?.length) {
        result.warnings.forEach((w) => toast.warning(w));
      }
      toast.success(`Confirmed — ${result.mapped_count} columns mapped`);
      navigate(`/session/${uploadId}/run`);
    },
    onError: (err) => toast.error(`Confirm failed: ${err.message}`),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const sourceColumns = data?.suggestions ? Object.keys(data.suggestions) : [];
  const mappedCount = Object.values(localMap).filter(Boolean).length;
  const skippedCount = Object.values(localMap).filter((v) => !v).length;
  const unmappedWarningCols = sourceColumns.filter((col) => !localMap[col]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-destructive font-semibold">{error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1.5">
          <span className="gradient-text">Column Mapping</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Review AI-suggested mappings and override any that look incorrect
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <StepIndicator currentStep="map" />
      </div>

      {/* Warning banner for unmapped columns */}
      {!isLoading && unmappedWarningCols.length > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong>{unmappedWarningCols.length}</strong> column{unmappedWarningCols.length > 1 ? 's' : ''} could not be auto-mapped —
            review and assign them manually, or leave as "skip" to ignore.
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="glass rounded-2xl overflow-hidden mb-5">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Source Column</div>
          <div className="col-span-3">Sample Values</div>
          <div className="col-span-3">Map To (Canonical Field)</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-1 text-center">Status</div>
        </div>

        <div className="divide-y divide-border">
          {isLoading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                  <div className="col-span-3"><Skeleton className="h-7 w-full rounded-lg" /></div>
                  <div className="col-span-3"><Skeleton className="h-5 w-3/4 rounded-md" /></div>
                  <div className="col-span-3"><Skeleton className="h-8 w-full rounded-lg" /></div>
                  <div className="col-span-2"><Skeleton className="h-4 w-full rounded-full" /></div>
                  <div className="col-span-1 flex justify-center"><Skeleton className="h-5 w-5 rounded-full" /></div>
                </div>
              ))
            : sourceColumns.map((col) => {
                // suggestions: [{ canonical, score, method, reason }]
                const suggestions = data.suggestions[col] ?? [];
                const topSug = suggestions[0] ?? null;
                const currentValue = localMap[col] ?? null;
                const isMapped = !!currentValue;
                // score is 0-1 from backend
                const score = topSug?.score ?? 0;

                // Sample values: from uploadMeta.sample if available
                const samples = sampleMap[col] ?? [];

                return (
                  <div
                    key={col}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors',
                      !isMapped ? 'bg-amber-500/5' : 'hover:bg-accent/20'
                    )}
                  >
                    {/* Source column name */}
                    <div className="col-span-3">
                      <code className="text-xs font-mono text-foreground/90 bg-muted px-2 py-1 rounded-md break-all">
                        {col}
                      </code>
                    </div>

                    {/* Sample values */}
                    <div className="col-span-3 flex gap-1 flex-wrap">
                      {samples.length > 0 ? (
                        samples.slice(0, 2).map((v, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono truncate max-w-[110px]"
                            title={v}
                          >
                            {v}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40 italic">no samples</span>
                      )}
                    </div>

                    {/* Mapping dropdown */}
                    <div className="col-span-3">
                      <Select
                        value={currentValue ?? NONE_VALUE}
                        onValueChange={(v) =>
                          setLocalMap((m) => ({ ...m, [col]: v === NONE_VALUE ? null : v }))
                        }
                      >
                        <SelectTrigger
                          id={`select-${col}`}
                          className={cn(
                            'h-8 text-xs rounded-lg',
                            !isMapped && 'border-amber-500/50 text-amber-400'
                          )}
                        >
                          <SelectValue placeholder="— skip column —" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground italic">— skip column —</span>
                          </SelectItem>
                          {canonicalOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Show top suggestion hint if it differs from current selection */}
                      {topSug && topSug.canonical !== currentValue && !isMapped && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 pl-0.5">
                          Suggested: <span className="text-primary/80">{topSug.canonical}</span>
                          {topSug.method === 'llm' && (
                            <span className="ml-1 text-violet-400">(AI)</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Confidence bar */}
                    <div className="col-span-2">
                      {topSug ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-default">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', CONFIDENCE_BG(score))}
                                    style={{ width: `${(score * 100).toFixed(0)}%` }}
                                  />
                                </div>
                                <span className={cn('text-[10px] font-mono tabular-nums', CONFIDENCE_COLOR(score))}>
                                  {(score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="text-xs space-y-0.5">
                                <p><span className="text-muted-foreground">Method:</span> {topSug.method}</p>
                                {topSug.reason && (
                                  <p className="text-muted-foreground max-w-48">{topSug.reason}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Status icon */}
                    <div className="col-span-1 flex justify-center">
                      {isMapped ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Summary row */}
      {!isLoading && (
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex gap-5 text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-foreground/80">{mappedCount} mapped</span>
            </span>
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-foreground/80">{skippedCount} skipped</span>
            </span>
            <span className="text-muted-foreground text-xs self-center">
              Total: {sourceColumns.length} columns
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            {targetFormat} format
          </Badge>
        </div>
      )}

      {/* Confirm button */}
      <Button
        id="btn-confirm-mapping"
        size="lg"
        onClick={() => confirmMutation.mutate()}
        disabled={isLoading || confirmMutation.isPending || sourceColumns.length === 0}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-12 text-base hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {confirmMutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming…</>
        ) : (
          <>Confirm Mapping <ChevronRight className="w-4 h-4 ml-2" /></>
        )}
      </Button>
    </div>
  );
}
