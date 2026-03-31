import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, Tag, BarChart3, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, Play, Clock
} from 'lucide-react';
import { runGeocode, runMapCodes, runNormalize } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StepIndicator from '@/components/layout/StepIndicator';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    key: 'geocode',
    label: 'Geocode Addresses',
    description: 'Resolve lat/lon from address fields using the Geoapify geocoder',
    icon: MapPin,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    key: 'map-codes',
    label: 'Map Occupancy & Construction',
    description: '4-stage mapping: deterministic → Gemini LLM → TF-IDF → default fallback',
    icon: Tag,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  {
    key: 'normalize',
    label: 'Normalize Values',
    description: 'Standardize year built, stories, area, insurance values, and currency',
    icon: BarChart3,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
];

function MetricBadge({ label, value, color = '' }) {
  return (
    <div className={cn('flex flex-col items-center px-3 py-2 rounded-lg bg-muted/50', color)}>
      <span className="text-xs font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

function StepCard({ step, status, result, onRun, disabled }) {
  const { icon: Icon } = step;
  const isDone = status === 'done';
  const isRunning = status === 'running';
  const isIdle = status === 'idle';

  return (
    <div
      className={cn(
        'glass rounded-2xl p-5 transition-all duration-300',
        isDone && 'border-primary/30 bg-primary/5',
        isRunning && 'animate-pulse-glow border-primary/40',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('p-3 rounded-xl border shrink-0', step.bgColor, step.borderColor)}>
          <Icon className={cn('w-5 h-5', step.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">{step.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>

            {/* Status */}
            <div className="shrink-0">
              {isDone && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {isRunning && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              {isIdle && (
                <Button
                  id={`btn-run-${step.key}`}
                  size="sm"
                  onClick={onRun}
                  disabled={disabled}
                  className={cn(
                    'h-8 text-xs rounded-lg',
                    disabled
                      ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground'
                      : 'gradient-primary text-white glow-primary-sm hover:opacity-90'
                  )}
                >
                  <Play className="w-3 h-3 mr-1" /> Run
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          {isDone && result && (
            <div className="mt-3 flex flex-wrap gap-2">
              {step.key === 'geocode' && (
                <>
                  <MetricBadge label="Geocoded" value={result.geocoded} />
                  <MetricBadge label="Provided" value={result.provided} />
                  <MetricBadge label="Failed" value={result.failed} color="text-rose-400" />
                  <MetricBadge label="Flags Added" value={result.flags_added} color="text-amber-400" />
                </>
              )}
              {step.key === 'map-codes' && (
                <>
                  <MetricBadge label="Occ Pairs" value={result.unique_occ_pairs} />
                  <MetricBadge label="Const Pairs" value={result.unique_const_pairs} />
                  <MetricBadge label="Flags Added" value={result.flags_added} color="text-amber-400" />
                </>
              )}
              {step.key === 'normalize' && (
                <>
                  <MetricBadge label="Total Rows" value={result.total_rows} />
                  <MetricBadge label="Flags Added" value={result.flags_added} color="text-amber-400" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RunPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { setGeocodeResult, setMapCodesResult, setNormalizeResult, setUploadId } = useSessionStore();

  useEffect(() => { if (uploadId) setUploadId(uploadId); }, [uploadId, setUploadId]);

  const [statuses, setStatuses] = useState({ geocode: 'idle', 'map-codes': 'idle', normalize: 'idle' });
  const [results, setResults] = useState({});

  function markRunning(key) { setStatuses((s) => ({ ...s, [key]: 'running' })); }
  function markDone(key, result) {
    setStatuses((s) => ({ ...s, [key]: 'done' }));
    setResults((r) => ({ ...r, [key]: result }));
  }

  const geocodeMutation = useMutation({
    mutationFn: () => runGeocode(uploadId),
    onMutate: () => markRunning('geocode'),
    onSuccess: (data) => {
      markDone('geocode', data);
      setGeocodeResult(data);
      toast.success(`Geocoding complete — ${data.geocoded} geocoded, ${data.failed} failed`);
    },
    onError: (err) => {
      setStatuses((s) => ({ ...s, geocode: 'idle' }));
      toast.error(`Geocoding failed: ${err.message}`);
    },
  });

  const mapCodesMutation = useMutation({
    mutationFn: () => runMapCodes(uploadId),
    onMutate: () => markRunning('map-codes'),
    onSuccess: (data) => {
      markDone('map-codes', data);
      setMapCodesResult(data);
      toast.success(`Code mapping complete — ${data.unique_occ_pairs} occ, ${data.unique_const_pairs} const pairs`);
    },
    onError: (err) => {
      setStatuses((s) => ({ ...s, 'map-codes': 'idle' }));
      toast.error(`Code mapping failed: ${err.message}`);
    },
  });

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalize(uploadId),
    onMutate: () => markRunning('normalize'),
    onSuccess: (data) => {
      markDone('normalize', data);
      setNormalizeResult(data);
      toast.success(`Normalization complete — ${data.flags_added} flags added`);
    },
    onError: (err) => {
      setStatuses((s) => ({ ...s, normalize: 'idle' }));
      toast.error(`Normalization failed: ${err.message}`);
    },
  });

  const allDone = ['geocode', 'map-codes', 'normalize'].every((k) => statuses[k] === 'done');

  const runners = {
    geocode: geocodeMutation,
    'map-codes': mapCodesMutation,
    normalize: normalizeMutation,
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1.5">
          <span className="gradient-text">Pipeline Processing</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Run each stage sequentially. Each step unlocks the next.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <StepIndicator currentStep="run" />
      </div>

      <div className="space-y-4 mb-8">
        {STEPS.map((step, idx) => {
          const prevKey = idx > 0 ? STEPS[idx - 1].key : null;
          const prevDone = prevKey ? statuses[prevKey] === 'done' : true;
          const disabled = !prevDone || statuses[step.key] === 'running' || statuses[step.key] === 'done';

          return (
            <StepCard
              key={step.key}
              step={step}
              status={statuses[step.key]}
              result={results[step.key]}
              disabled={!prevDone}
              onRun={() => runners[step.key].mutate()}
            />
          );
        })}
      </div>

      <Button
        id="btn-review-flags"
        size="lg"
        onClick={() => navigate(`/session/${uploadId}/review`)}
        disabled={!allDone}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-12 text-base hover:opacity-90 transition-opacity disabled:opacity-30"
      >
        {allDone ? (
          <>Review Flags <ChevronRight className="w-4 h-4 ml-2" /></>
        ) : (
          <><Clock className="w-4 h-4 mr-2" /> Complete all steps to continue</>
        )}
      </Button>
    </div>
  );
}
