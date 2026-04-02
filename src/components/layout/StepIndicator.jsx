import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Upload', key: 'upload' },
  { label: 'Map Columns', key: 'map' },
  { label: 'Run Pipeline', key: 'run' },
  // { label: 'Review', key: 'review' }, // Disabled temporarily
  { label: 'Export', key: 'done' },
];

export default function StepIndicator({ currentStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-0" role="navigation" aria-label="Pipeline steps">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-300',
                  done && 'gradient-primary text-white',
                  active && 'gradient-primary glow-primary-sm text-white ring-2 ring-primary/30 ring-offset-1 ring-offset-background',
                  !done && !active && 'bg-muted text-muted-foreground border border-border'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-[10px] font-medium leading-none whitespace-nowrap',
                  active ? 'text-primary' : done ? 'text-foreground/60' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-12 mx-2 mb-4 transition-all duration-500',
                  idx < currentIdx ? 'bg-primary/60' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
