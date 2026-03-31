import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSessionInfo, getReview, downloadFile } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Plus, CheckCircle2, BarChart2, Flag } from "lucide-react";
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip, Cell
} from "recharts";
import { cn } from "@/lib/utils";

export default function Export() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resetSession } = usePipelineStore();
  const [downloading, setDownloading] = useState(null);

  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionInfo(id),
    staleTime: 10_000,
  });

  const { data: reviewData } = useQuery({
    queryKey: ["review", id],
    queryFn: () => getReview(id),
    staleTime: 10_000,
  });

  const flags = reviewData?.flags ?? [];
  const stages = sessionData?.stages_complete ?? {};

  const flagByType = flags.reduce((acc, f) => {
    acc[f.issue] = (acc[f.issue] ?? 0) + 1;
    return acc;
  }, {});
  const flagChartData = Object.entries(flagByType).map(([name, val]) => ({ name: name.replace(/_/g, " "), val }));

  const stagesComplete = Object.values(stages).filter(Boolean).length;

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      await downloadFile(id, format);
      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppShell showWizard>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline Complete</h1>
            <p className="text-muted-foreground text-sm">
              Session <span className="font-mono text-xs">{id?.slice(0, 8)}…</span> — ready for export
            </p>
          </div>
        </div>

        {/* QA summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sessionLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <SummaryCard icon={BarChart2} label="Rows Processed" value={sessionData?.row_count ?? "—"} color="text-primary" />
              <SummaryCard icon={CheckCircle2} label="Stages Complete" value={`${stagesComplete}/5`} color="text-emerald-400" />
              <SummaryCard icon={Flag} label="Flags Remaining" value={flags.length} color={flags.length > 0 ? "text-amber-400" : "text-emerald-400"} />
              <SummaryCard icon={FileSpreadsheet} label="Format" value={sessionData?.target_format ?? "—"} color="text-violet-400" />
            </>
          )}
        </div>

        {/* Flag breakdown chart */}
        {flagChartData.length > 0 && (
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Flag Breakdown</CardTitle>
              <CardDescription className="text-xs">{flags.length} flags remaining after review</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={flagChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Bar dataKey="val" fill="oklch(0.65 0.22 25)" radius={[4, 4, 0, 0]} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.14 0.015 265)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Download cards */}
        <div className="grid grid-cols-2 gap-4">
          <DownloadCard
            icon={FileSpreadsheet}
            title="Excel Workbook"
            desc="XLSX format, multi-sheet with metadata"
            format="xlsx"
            isDownloading={downloading === "xlsx"}
            onDownload={() => handleDownload("xlsx")}
            accentColor="text-emerald-400"
            accentBg="bg-emerald-500/10"
            accentBorder="border-emerald-500/30"
          />
          <DownloadCard
            icon={FileText}
            title="CSV File"
            desc="Flat CSV, AIR/RMS-ready column layout"
            format="csv"
            isDownloading={downloading === "csv"}
            onDownload={() => handleDownload("csv")}
            accentColor="text-blue-400"
            accentBg="bg-blue-500/10"
            accentBorder="border-blue-500/30"
          />
        </div>

        {/* New session */}
        <div className="flex items-center justify-between rounded-2xl border border-border glass p-5">
          <div>
            <p className="font-medium text-sm">Start a new pipeline run</p>
            <p className="text-xs text-muted-foreground mt-0.5">Upload another SOV file to process</p>
          </div>
          <Button
            onClick={() => {
              resetSession();
              navigate("/upload");
            }}
            variant="outline"
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Session
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass border border-border rounded-xl p-4 text-center">
      <Icon className={cn("h-5 w-5 mx-auto mb-2", color)} />
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function DownloadCard({ icon: Icon, title, desc, format, isDownloading, onDownload, accentColor, accentBg, accentBorder }) {
  return (
    <Card className="glass border-border hover:border-primary/40 transition-colors">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", accentBg, accentBorder)}>
          <Icon className={cn("h-5 w-5", accentColor)} />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <Button
          className={cn("w-full btn-glow")}
          disabled={isDownloading}
          onClick={onDownload}
        >
          {isDownloading ? (
            "Downloading…"
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download {format.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
