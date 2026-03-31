import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { runGeocode, runMapCodes, runNormalize } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MapPin, Brain, Sliders, CheckCircle2, Circle, Loader2,
  ArrowRight, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis
} from "recharts";

const STAGE_META = [
  {
    key: "geocode",
    label: "Geocode Locations",
    desc: "Resolve physical addresses to lat/lon via Geoapify. Pre-provided coordinates are preserved.",
    icon: MapPin,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    key: "map_codes",
    label: "Map Occupancy & Construction Codes",
    desc: "6-stage pipeline: ISO → RMS direct → conflict rules → deterministic → LLM → TF-IDF → default.",
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    key: "normalize",
    label: "Normalize & Validate",
    desc: "Standardize year, stories, area, values, currency, and secondary modifiers (roof, wall, foundation).",
    icon: Sliders,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
];

const METHOD_COLORS = {
  rule: "#10b981",
  llm: "#8b5cf6",
  tfidf: "#3b82f6",
  default: "#6b7280",
};

function StageCard({ meta, status, result, onRun, disabled }) {
  const Icon = meta.icon;
  const isDone = status === "done";
  const isRunning = status === "running";
  const isError = status === "error";

  return (
    <Card className={cn(
      "glass border transition-all",
      isDone && "border-emerald-500/30",
      isRunning && "border-primary/50",
      isError && "border-destructive/50",
      !isDone && !isRunning && !isError && "border-border"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border shrink-0", meta.bg, meta.border)}>
              <Icon className={cn("h-5 w-5", meta.color)} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {meta.label}
                {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {isError && <AlertCircle className="h-4 w-4 text-destructive" />}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{meta.desc}</CardDescription>
            </div>
          </div>

          {!isDone && (
            <Button
              size="sm"
              variant={isRunning ? "outline" : "default"}
              disabled={disabled || isRunning}
              onClick={onRun}
              className={!disabled && !isRunning ? "btn-glow shrink-0" : "shrink-0"}
            >
              {isRunning ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running…</>
              ) : (
                "Run"
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isDone && result && (
        <CardContent>
          <ResultView stageKey={meta.key} result={result} />
        </CardContent>
      )}
    </Card>
  );
}

function ResultView({ stageKey, result }) {
  if (stageKey === "geocode") {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Geocoded", value: result.geocoded, color: "text-emerald-400" },
          { label: "Pre-provided", value: result.provided, color: "text-blue-400" },
          { label: "Failed", value: result.failed, color: "text-rose-400" },
          { label: "Flags Added", value: result.flags_added, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="text-center glass rounded-xl p-3 border border-border">
            <p className={cn("text-xl font-bold", s.color)}>{s.value ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (stageKey === "map_codes") {
    const occData = Object.entries(result.occ_by_method ?? {}).map(([name, val]) => ({ name, val }));
    const constData = Object.entries(result.const_by_method ?? {}).map(([name, val]) => ({ name, val }));

    return (
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium">Occupancy ({result.unique_occ_pairs} unique)</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={occData} dataKey="val" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                {occData.map((entry) => (
                  <Cell key={entry.name} fill={METHOD_COLORS[entry.name] ?? "#888"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "oklch(0.14 0.015 265)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium">Construction ({result.unique_const_pairs} unique)</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={constData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                {constData.map((entry) => (
                  <Cell key={entry.name} fill={METHOD_COLORS[entry.name] ?? "#888"} />
                ))}
              </Bar>
              <Tooltip
                contentStyle={{ background: "oklch(0.14 0.015 265)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (stageKey === "normalize") {
    const summary = result.normalization_summary ?? {};
    const bars = Object.entries(summary).map(([k, v]) => ({ name: k.replace("_flags", ""), val: v }));
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3 border border-border text-center">
            <p className="text-xl font-bold text-primary">{result.total_rows}</p>
            <p className="text-xs text-muted-foreground">Rows processed</p>
          </div>
          <div className="glass rounded-xl p-3 border border-border text-center">
            <p className="text-xl font-bold text-amber-400">{result.flags_added}</p>
            <p className="text-xs text-muted-foreground">Flags added</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={bars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Bar dataKey="val" fill="oklch(0.70 0.18 275)" radius={[4, 4, 0, 0]} />
            <Tooltip
              contentStyle={{ background: "oklch(0.14 0.015 265)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

export default function Processing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stagesComplete, markStageComplete, setFlagCount } = usePipelineStore();

  const [results, setResults] = useState({});
  const [statuses, setStatuses] = useState({ geocode: "idle", map_codes: "idle", normalize: "idle" });

  const runStage = (key, fn) =>
    useMutation({
      mutationFn: fn,
      onMutate: () => setStatuses((s) => ({ ...s, [key]: "running" })),
      onSuccess: (data) => {
        setStatuses((s) => ({ ...s, [key]: "done" }));
        setResults((r) => ({ ...r, [key]: data }));
        markStageComplete(key);
        if (key === "normalize") setFlagCount(data.flags_added ?? 0);
        toast.success(`${STAGE_META.find((m) => m.key === key)?.label} complete`);
      },
      onError: (err) => {
        setStatuses((s) => ({ ...s, [key]: "error" }));
        toast.error(err.message);
      },
    });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const geocodeMut = runStage("geocode", () => runGeocode(id));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mapCodesMut = runStage("map_codes", () => runMapCodes(id));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const normalizeMut = runStage("normalize", () => runNormalize(id));

  const mutations = { geocode: geocodeMut, map_codes: mapCodesMut, normalize: normalizeMut };

  const allDone = ["geocode", "map_codes", "normalize"].every(
    (k) => statuses[k] === "done" || stagesComplete[k]
  );

  return (
    <AppShell showWizard running={Object.values(statuses).some((s) => s === "running")}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Pipeline Processing</h1>
          <p className="text-muted-foreground text-sm">
            Run each stage in sequence. Each step can take a moment depending on data size.
          </p>
        </div>

        <div className="space-y-4">
          {STAGE_META.map((meta, i) => {
            const prevDone = i === 0 || statuses[STAGE_META[i - 1].key] === "done" || stagesComplete[STAGE_META[i - 1].key];
            const status = stagesComplete[meta.key] ? "done" : statuses[meta.key];
            return (
              <StageCard
                key={meta.key}
                meta={meta}
                status={status}
                result={results[meta.key]}
                disabled={!prevDone}
                onRun={() => mutations[meta.key].mutate()}
              />
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            className="btn-glow"
            disabled={!allDone}
            onClick={() => navigate(`/session/${id}/review`)}
          >
            Review Flags
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
