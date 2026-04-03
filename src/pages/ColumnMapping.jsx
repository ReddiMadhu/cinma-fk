import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { suggestColumns, confirmColumns } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { AppShell } from "@/components/AppShell";
import { ConfidenceBar, MethodBadge } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const AIR_REQUIRED = ["Street", "OccupancyCode", "ConstructionCode", "BuildingValue"];
const ALL_CANONICALS = [
  "PolicyID", "InsuredName", "LocationID", "LocationName", "FullAddress", "Street", "City",
  "Area", "PostalCode", "CountryISO", "Latitude", "Longitude",
  "OccupancyCodeType", "OccupancyCode", "ConstructionCodeType", "ConstructionCode",
  "RiskCount", "NumberOfStories", "GrossArea", "YearBuilt", "YearRetrofitted",
  "TIV", "BuildingValue", "ContentsValue", "TimeElementValue", "Currency", "LineOfBusiness",
  "SprinklerSystem", "RoofGeometry", "FoundationType", "WallSiding", "SoftStory", "WallType",
  // RMS canonicals
  "ACCNTNUM", "LOCNUM", "LOCNAME", "STREETNAME", "CITY", "STATECODE", "POSTALCODE", "CNTRYCODE",
  "BLDGSCHEME", "BLDGCLASS", "OCCSCHEME", "OCCTYPE",
  "NUMBLDGS", "NUMSTORIES", "FLOORAREA", "YEARBUILT", "YEARUPGRAD",
  "SPRINKLER", "ROOFGEOM", "FOUNDATION", "CLADDING", "SOFTSTORY", "WALLTYPE",
  "TIV",
  "EQCV1VAL", "EQCV2VAL", "EQCV3VAL",
  "WSCV1VAL", "WSCV2VAL", "WSCV3VAL",
  "TOCV1VAL", "TOCV2VAL", "TOCV3VAL",
  "FLCV1VAL", "FLCV2VAL", "FLCV3VAL",
  "TRCV1VAL", "TRCV2VAL", "TRCV3VAL",
  "FRCV1VAL", "FRCV2VAL", "FRCV3VAL",
];

export default function ColumnMapping() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setColumnMap, markStageComplete } = usePipelineStore();
  const [localMap, setLocalMap] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ["suggest-columns", id],
    queryFn: () => suggestColumns(id),
    staleTime: Infinity,
  });

  // Auto-map on load — strict 1:1: first source column to claim a canonical wins.
  // Subsequent columns that would claim the same canonical get null (left unmapped).
  useEffect(() => {
    if (data?.suggestions) {
      const auto = {};
      const claimed = new Set();

      for (const [col, sugs] of Object.entries(data.suggestions)) {
        const best = sugs?.find((s) => s.score >= 0.5 && !claimed.has(s.canonical));
        if (best) {
          auto[col] = best.canonical;
          claimed.add(best.canonical);
        } else {
          auto[col] = null;
        }
      }
      setLocalMap(auto);
    }
  }, [data]);

  const confirmMut = useMutation({
    mutationFn: () => confirmColumns(id, localMap),
    onSuccess: (res) => {
      setColumnMap(localMap);
      markStageComplete("columns");
      if (res.warnings?.length) {
        res.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.success(`${res.mapped_count} columns confirmed`);
      }
      navigate(`/session/${id}/run`);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail ?? err.message;
      toast.error(msg);
    },
  });

  const mappedValues = Object.values(localMap).filter(Boolean);
  const missingRequired = AIR_REQUIRED.filter((r) => !mappedValues.includes(r));
  const suggestions = data?.suggestions ?? {};
  const cols = Object.keys(suggestions);

  // canonical → [source columns that claim it]
  const canonicalUsedBy = {};
  for (const [col, canonical] of Object.entries(localMap)) {
    if (canonical) {
      if (!canonicalUsedBy[canonical]) canonicalUsedBy[canonical] = [];
      canonicalUsedBy[canonical].push(col);
    }
  }

  // Canonicals claimed by 2+ source columns = violations
  const duplicateCanonicals = new Set(
    Object.entries(canonicalUsedBy)
      .filter(([, srcs]) => srcs.length > 1)
      .map(([canonical]) => canonical)
  );

  const handleChange = (col, value) => {
    setLocalMap((prev) => ({ ...prev, [col]: value || null }));
  };

  return (
    <AppShell showWizard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Column Mapping</h1>
            <p className="text-muted-foreground text-sm">
              Review AI suggestions and override any mappings before continuing.{" "}
              Each canonical field can only be mapped by <strong>one</strong> source column.
            </p>
          </div>
          <Button
            size="lg"
            className="btn-glow shrink-0"
            disabled={confirmMut.isPending || duplicateCanonicals.size > 0}
            onClick={() => confirmMut.mutate()}
          >
            {confirmMut.isPending ? "Confirming…" : "Confirm Mapping"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Duplicate conflict banner */}
        {duplicateCanonicals.size > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-300">
                Duplicate mapping — resolve before confirming
              </p>
              <p className="text-xs text-rose-400/80 mt-1 flex flex-wrap gap-3">
                {[...duplicateCanonicals].map((c) => (
                  <span key={c}>
                    <code className="font-mono">{c}</code>
                    {" ← "}
                    {canonicalUsedBy[c].join(", ")}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* Missing required warning */}
        {missingRequired.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Required fields not mapped</p>
              <p className="text-xs text-amber-400/80 mt-1">{missingRequired.join(", ")}</p>
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <MetricPill label="Total Columns" value={cols.length} color="text-foreground" />
          <MetricPill
            label="Auto-Mapped"
            value={Object.values(localMap).filter(Boolean).length}
            color="text-emerald-400"
          />
          <MetricPill
            label="Unmapped"
            value={Object.values(localMap).filter((v) => !v).length}
            color="text-amber-400"
          />
        </div>

        {/* Mapping table */}
        <Card className="glass border-border overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              Source &rarr; Canonical Field Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Source Column", "Sample Values", "AI Suggestion", "Confidence", "Method", "Override"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? [...Array(8)].map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="py-3 px-4">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : cols.map((col) => {
                        const sugs = suggestions[col] ?? [];
                        const best = sugs[0];
                        const current = localMap[col];
                        const isMapped = !!current;
                        const isDuplicate = current && duplicateCanonicals.has(current);

                        // Canonicals already used by OTHER rows (not this one)
                        const usedByOthers = new Set(
                          Object.entries(localMap)
                            .filter(([c, v]) => c !== col && v)
                            .map(([, v]) => v)
                        );

                        return (
                          <tr
                            key={col}
                            className={cn(
                              "border-b border-border transition-colors",
                              isDuplicate
                                ? "bg-rose-500/10 hover:bg-rose-500/15"
                                : isMapped
                                ? "hover:bg-muted/20"
                                : "bg-amber-500/5 hover:bg-amber-500/10"
                            )}
                          >
                            {/* Source column */}
                            <td className="py-3 px-4 font-mono text-xs font-semibold">{col}</td>

                            {/* Sample values */}
                            <td className="py-3 px-4 max-w-[160px]">
                              <span className="text-xs text-muted-foreground italic">—</span>
                            </td>

                            {/* AI suggestion — strike-through if already taken */}
                            <td className="py-3 px-4">
                              {best ? (
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    usedByOthers.has(best.canonical)
                                      ? "text-muted-foreground line-through"
                                      : "text-primary"
                                  )}
                                >
                                  {best.canonical}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No suggestion</span>
                              )}
                            </td>

                            {/* Confidence */}
                            <td className="py-3 px-4">
                              {best ? (
                                <ConfidenceBar value={best.score} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Method */}
                            <td className="py-3 px-4">
                              {best ? (
                                <MethodBadge method={best.method} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Override select — options taken by others are disabled */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <select
                                  value={current ?? ""}
                                  onChange={(e) => handleChange(col, e.target.value)}
                                  className={cn(
                                    "text-xs rounded-lg px-2 py-1.5 border transition-colors bg-background outline-none",
                                    "focus:border-primary focus:ring-1 focus:ring-primary",
                                    isDuplicate
                                      ? "border-rose-500/60 text-rose-400"
                                      : isMapped
                                      ? "border-border text-foreground"
                                      : "border-amber-500/40 text-amber-400"
                                  )}
                                >
                                  <option value="">— Unmapped —</option>
                                  {ALL_CANONICALS.map((c) => {
                                    const takenByOther = usedByOthers.has(c);
                                    return (
                                      <option key={c} value={c} disabled={takenByOther}>
                                        {takenByOther ? `⛔ ${c} (already mapped)` : c}
                                      </option>
                                    );
                                  })}
                                </select>
                                {isDuplicate && (
                                  <span className="text-[10px] text-rose-400 font-semibold whitespace-nowrap">
                                    ⚠ Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Required field checklist */}
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Required Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AIR_REQUIRED.map((field) => {
                const mapped = mappedValues.includes(field);
                return (
                  <div key={field} className="flex items-center gap-2">
                    {mapped ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className={cn("text-xs", mapped ? "text-foreground" : "text-amber-400")}>
                      {field}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            className="btn-glow"
            disabled={confirmMut.isPending || duplicateCanonicals.size > 0}
            onClick={() => confirmMut.mutate()}
          >
            {confirmMut.isPending ? "Confirming…" : "Confirm & Continue"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function MetricPill({ label, value, color }) {
  return (
    <div className="glass border border-border rounded-xl p-4 text-center">
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
