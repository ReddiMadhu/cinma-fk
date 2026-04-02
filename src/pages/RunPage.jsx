import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, Tag, BarChart3, ChevronRight, CheckCircle2,
  Loader2, Play, Clock, Inbox
} from 'lucide-react';
import { runGeocode, runMapCodes, runNormalize } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import StepIndicator from '@/components/layout/StepIndicator';
import StepDiffTable from '@/components/StepDiffTable';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    key: 'geocode',
    label: 'Geocode Addresses',
    runningLabel: 'GeoCoding addresses',
    description: 'Resolve lat/lon using Geoapify',
    icon: MapPin,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    key: 'map-codes',
    label: 'Map Occupancy & Const',
    runningLabel: 'Mapping construction and occupancy codes',
    description: '4-stage LLM mapping',
    icon: Tag,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  {
    key: 'normalize',
    label: 'Normalize Values',
    runningLabel: 'Normalizing the locations',
    description: 'Standardize year, area, value',
    icon: BarChart3,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
];

function MetricBadge({ label, value, color = '' }) {
  return (
    <div className={cn('flex flex-col items-center px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 shadow-sm', color)}>
      <span className="text-[11px] font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[60px] truncate text-center leading-tight">{label}</span>
    </div>
  );
}

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="inline-block w-4 text-left">{dots}</span>;
}

function StepCard({ step, status, result, onRun, disabled, onClick, isActive }) {
  const { icon: Icon } = step;
  const isDone = status === 'done';
  const isRunning = status === 'running';
  const isIdle = status === 'idle';

  return (
    <div
      onClick={isDone || isRunning ? onClick : undefined}
      className={cn(
        'glass rounded-2xl p-4 transition-all duration-300 relative',
        (isDone || isRunning) ? 'cursor-pointer hover:border-primary/40' : 'opacity-80',
        isActive && 'ring-2 ring-primary/50 shadow-md transform scale-[1.02] bg-white pointer-events-none',
        !isActive && isDone && 'border-primary/20 bg-primary/5',
        isRunning && 'animate-pulse-glow border-primary/40',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('p-2.5 rounded-xl border shrink-0', step.bgColor, step.borderColor)}>
          <Icon className={cn('w-4 h-4', step.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm leading-tight text-foreground truncate">
                {isRunning ? (
                  <span className="flex items-center">
                    {step.runningLabel}
                    <AnimatedDots />
                  </span>
                ) : (
                  step.label
                )}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{step.description}</p>
            </div>

            {/* Status */}
            <div className="shrink-0 pt-0.5">
              {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {isRunning && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {isIdle && (
                <Button
                  id={`btn-run-${step.key}`}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onRun(); }}
                  disabled={disabled}
                  className={cn(
                    'h-7 px-2.5 text-[10px] rounded-md font-medium shadow-sm transition-all',
                    disabled
                      ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground'
                      : 'gradient-primary text-white glow-primary-sm hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md'
                  )}
                >
                  <Play className="w-3 h-3 mr-1" /> Run
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          {isDone && result && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {step.key === 'geocode' && (
                <>
                  <MetricBadge label="Geocoded" value={result.geocoded} />
                  <MetricBadge label="Provided" value={result.provided} />
                  <MetricBadge label="Failed" value={result.failed} color="text-rose-500 bg-rose-50 border-rose-100" />
                  <MetricBadge label="Flags" value={result.flags_added} color="text-amber-600 bg-amber-50 border-amber-100" />
                </>
              )}
              {step.key === 'map-codes' && (
                <>
                  <MetricBadge label="Occ" value={result.unique_occ_pairs} />
                  <MetricBadge label="Const" value={result.unique_const_pairs} />
                  <MetricBadge label="Flags" value={result.flags_added} color="text-amber-600 bg-amber-50 border-amber-100" />
                </>
              )}
              {step.key === 'normalize' && (
                <>
                  <MetricBadge label="Rows" value={result.total_rows} />
                  <MetricBadge label="Flags" value={result.flags_added} color="text-amber-600 bg-amber-50 border-amber-100" />
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
  const [activeStep, setActiveStep] = useState(null);

  function markRunning(key) { 
    setStatuses((s) => ({ ...s, [key]: 'running' })); 
    setActiveStep(key); 
  }
  
  function markDone(key, result) {
    setStatuses((s) => ({ ...s, [key]: 'done' }));
    setResults((r) => ({ ...r, [key]: result }));
    setActiveStep(key);
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

  const activeStepConfig = STEPS.find(s => s.key === activeStep);

  return (
    <div className="min-h-[calc(100vh-6rem)] p-6 w-full max-w-[95%] mx-auto flex flex-col min-w-0 overflow-x-hidden">
      {/* Header Row */}
      <div className="mb-4 shrink-0 relative flex flex-col items-center justify-center min-h-[3rem]">
        <div className="md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 static self-start mb-4 md:mb-0">
          <h1 className="text-2xl font-bold w-full md:w-auto">
            <span className="gradient-text tracking-tight whitespace-nowrap">Pipeline Processing</span>
          </h1>
        </div>
        <div className="shrink-0 w-full flex justify-center md:w-auto pb-2 md:pb-0">
          <StepIndicator currentStep="run" />
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-6 min-w-0 pb-4">
        
        {/* Left Column: Steps */}
        <div className="flex flex-col gap-4">
          <div className="space-y-3.5">
            {STEPS.map((step, idx) => {
              const prevKey = idx > 0 ? STEPS[idx - 1].key : null;
              const prevDone = prevKey ? statuses[prevKey] === 'done' : true;
              const disabled = !prevDone || statuses[step.key] === 'running' || statuses[step.key] === 'done';

              return (
                <StepCard
                  key={step.key}
                  step={step}
                  uploadId={uploadId}
                  status={statuses[step.key]}
                  result={results[step.key]}
                  disabled={!prevDone}
                  isActive={activeStep === step.key}
                  onClick={() => setActiveStep(step.key)}
                  onRun={() => runners[step.key].mutate()}
                />
              );
            })}
          </div>

          <div className="mt-auto pt-4">
            <Button
              id="btn-review-flags"
              size="lg"
              onClick={() => navigate(`/session/${uploadId}/done`)}
              disabled={!allDone}
              className="w-full h-12 gradient-primary glow-primary text-white font-semibold rounded-xl text-[13px] hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {allDone ? (
                <>Proceed to Export <ChevronRight className="w-4 h-4 ml-1.5" /></>
              ) : (
                <><Clock className="w-4 h-4 mr-2 opacity-70" /> Complete all steps to export</>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Active Diff Viewer */}
        <div className="min-w-0 glass rounded-xl border border-white/20 shadow-sm flex flex-col overflow-hidden bg-white/40">
          {activeStep && activeStepConfig ? (
            <div className="flex flex-col h-full bg-white/60">
              <div className="flex-1 p-0 flex flex-col min-w-0 overflow-x-hidden relative">
                 {statuses[activeStep] === 'done' ? (
                   <StepDiffTable 
                      uploadId={uploadId} 
                      step={activeStep} 
                      stepColor={activeStepConfig.color}
                      stepBgColor={activeStepConfig.bgColor}
                      stepBorderColor={activeStepConfig.borderColor}
                   />
                 ) : statuses[activeStep] === 'running' ? (
                   <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-80">
                     <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                     <h3 className="text-lg font-medium text-foreground tracking-tight">Processing {activeStepConfig.label}...</h3>
                     <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                       This step is currently executing. Results will appear here shortly.
                     </p>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-60">
                     <Play className="w-8 h-8 text-muted-foreground/50 mb-4" />
                     <h3 className="text-lg font-medium text-foreground tracking-tight">Step Pending</h3>
                     <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                       Click the "Run" button on the left panel to begin this step.
                     </p>
                   </div>
                 )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-60">
              <div className="w-16 h-16 rounded-full bg-muted/50 border flex items-center justify-center mb-4">
                 <Inbox className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground tracking-tight">No Step Selected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Run a pipeline step on the left, or click a completed step card to view its data transformation details side-by-side.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
