import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, X,
  Settings2, ChevronDown, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Upload() {
  const navigate = useNavigate();
  const { setUploadResponse, targetFormat, setTargetFormat } = usePipelineStore();
  const [file, setFile] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preview, setPreview] = useState(null);

  const uploadMut = useMutation({
    mutationFn: () => uploadFile(file, targetFormat),
    onSuccess: (data) => {
      setUploadResponse(data);
      setPreview(data);
      toast.success(`Uploaded ${data.row_count} rows — ${data.headers.length} columns detected`);
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  return (
    <AppShell showWizard>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Upload Exposure File</h1>
          <p className="text-muted-foreground text-sm">
            Drag in your SOV (Statement of Values) CSV or Excel file to begin.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all",
            isDragActive
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-primary/5",
            file && "border-emerald-500/50 bg-emerald-500/5"
          )}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                <FileSpreadsheet className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" /> Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors",
                isDragActive
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}>
                <UploadCloud className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {isDragActive ? "Drop your file here" : "Drag & drop your SOV file"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or <span className="text-primary underline">browse files</span> — CSV or XLSX
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Config */}
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
                <CardDescription className="text-xs">Target output format</CardDescription>
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Advanced
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format toggle */}
            <div className="flex gap-3">
              {["AIR", "RMS"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setTargetFormat(fmt)}
                  className={cn(
                    "flex-1 rounded-xl border p-3 text-left transition-all",
                    targetFormat === fmt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className="font-semibold text-sm">{fmt}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmt === "AIR"
                      ? "AIR CATRADER — standard property exposure"
                      : "RMS RiskLink — alternative format"}
                  </p>
                </button>
              ))}
            </div>

            {/* Advanced settings */}
            {showAdvanced && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Advanced rules apply default values for confidence thresholds and year/value validations.
                  Leave as defaults unless you have specific requirements.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Occupancy confidence</p>
                    <p>Default: 70%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Construction confidence</p>
                    <p>Default: 70%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Year range</p>
                    <p>1800 – present</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Invalid actions</p>
                    <p>Flag for review</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {preview && (
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-emerald-400">
                  {preview.row_count} rows • {preview.headers.length} columns detected
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {preview.headers.map((h) => (
                  <span key={h} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {h}
                  </span>
                ))}
              </div>
              {preview.sample?.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {preview.headers.slice(0, 6).map((h) => (
                          <th key={h} className="py-2 px-3 text-left font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                        {preview.headers.length > 6 && (
                          <th className="py-2 px-3 text-muted-foreground">+{preview.headers.length - 6}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {preview.headers.slice(0, 6).map((h) => (
                            <td key={h} className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">
                              {String(row[h] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Session ID will be generated on upload
          </p>
          <div className="flex gap-3">
            {!preview ? (
              <Button
                size="lg"
                disabled={!file || uploadMut.isPending}
                onClick={() => uploadMut.mutate()}
                className="btn-glow"
              >
                {uploadMut.isPending ? "Uploading…" : "Upload File"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="btn-glow"
                onClick={() => navigate(`/session/${preview.upload_id}/map`)}
              >
                Continue to Mapping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
