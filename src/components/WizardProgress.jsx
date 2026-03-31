import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePipelineStore } from "@/store/pipeline";

const STEPS = [
  { label: "Upload", short: "01" },
  { label: "Map Columns", short: "02" },
  { label: "Process", short: "03" },
  { label: "Review", short: "04" },
  { label: "Export", short: "05" },
];

export function WizardProgress({ running = false }) {
  const { currentStep, uploadId } = usePipelineStore();
  const navigate = useNavigate();

  const stepPaths = [
    "/upload",
    uploadId ? `/session/${uploadId}/map` : null,
    uploadId ? `/session/${uploadId}/run` : null,
    uploadId ? `/session/${uploadId}/review` : null,
    uploadId ? `/session/${uploadId}/done` : null,
  ];

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const isLocked = !isDone && !isActive;
        const path = stepPaths[i];

        return (
          <div key={step.label} className="flex items-center">
            <button
              onClick={() => path && !isLocked && navigate(path)}
              disabled={isLocked}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isDone && "text-primary cursor-pointer hover:bg-primary/10",
                isActive && "bg-primary/15 text-primary",
                isLocked && "text-muted-foreground cursor-default opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isActive && cn("border-primary text-primary", running && "step-active"),
                  isLocked && "border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive && running ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  step.short
                )}
              </span>
              <span className="hidden sm:block">{step.label}</span>
            </button>

            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  i < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
