import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download, Home, FileSpreadsheet, FileText, CheckCircle2,
  BarChart3, AlertCircle, Zap, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip as RTooltip, Legend
} from 'recharts';
import { getReview, getSession } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StepIndicator from '@/components/layout/StepIndicator';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];

function DownloadCard({ format, label, description, icon: Icon, uploadId }) {
  // Direct link — backend sends Content-Disposition: attachment so the
  // browser saves the file natively. No blob URL race conditions.
  const href = `/api/download/${uploadId}?format=${format}`;
  const filename = `cat_output_${uploadId?.slice(0, 8)}.${format}`;

  return (
    <a
      id={`btn-download-${format}`}
      href={href}
      download={filename}
      className="glass rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group no-underline"
      onClick={() => toast.success(`${label} download started`)}
    >
      <div className="w-14 h-14 rounded-xl gradient-primary glow-primary-sm flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-center">
        <p className="font-bold text-base">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-1 text-primary text-xs font-semibold">
        <Download className="w-3.5 h-3.5" /> Download
      </div>
    </a>
  );
}

export default function DonePage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { geocodeResult, mapCodesResult, normalizeResult, setUploadId } = useSessionStore();

  useEffect(() => { if (uploadId) setUploadId(uploadId); }, [uploadId, setUploadId]);

  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['review', uploadId],
    queryFn: () => getReview(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const { data: sessionData } = useQuery({
    queryKey: ['session', uploadId],
    queryFn: () => getSession(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const flags = reviewData?.flags ?? [];

  // Issue distribution for pie chart
  const issueCounts = flags.reduce((acc, f) => {
    acc[f.issue] = (acc[f.issue] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(issueCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  // Geocode bar chart
  const geocodeBar = geocodeResult
    ? [
        { name: 'Geocoded', value: geocodeResult.geocoded },
        { name: 'Provided', value: geocodeResult.provided },
        { name: 'Failed', value: geocodeResult.failed },
      ]
    : [];

  // Mapping methods (occ)
  const mapBar = mapCodesResult
    ? Object.entries(mapCodesResult.occ_by_method ?? {}).map(([name, value]) => ({ name, value }))
    : [];

  const totalRows = sessionData?.row_count ?? normalizeResult?.total_rows ?? '—';
  const totalFlags = flags.length;
  const cleanRows = typeof totalRows === 'number' && totalFlags >= 0 ? Math.max(0, totalRows - totalFlags) : '—';
  const cleanPct = typeof totalRows === 'number' && totalRows > 0 ? ((cleanRows / totalRows) * 100).toFixed(1) : '—';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-primary glow-primary flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">Pipeline Complete!</span>
        </h1>
        <p className="text-muted-foreground">
          Your exposure data has been processed and is ready for CAT modeling.
        </p>
        <code className="text-xs font-mono text-muted-foreground/50 mt-2 block">
          Session: {uploadId?.slice(0, 16)}…
        </code>
      </div>

      <div className="mb-10 flex justify-center">
        <StepIndicator currentStep="done" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BarChart3, label: 'Total Rows', value: totalRows, color: 'text-primary' },
          { icon: CheckCircle2, label: 'Clean Rows', value: cleanRows, color: 'text-green-400' },
          { icon: AlertCircle, label: 'Flags', value: totalFlags, color: 'text-amber-400' },
          { icon: TrendingUp, label: 'Data Quality', value: cleanPct !== '—' ? `${cleanPct}%` : '—', color: 'text-cyan-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{value ?? '—'}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Geocode breakdown */}
        {geocodeBar.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Geocoding Results
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={geocodeBar} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.60 0.01 265)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RTooltip contentStyle={{ backgroundColor: 'oklch(0.14 0.015 265)', border: '1px solid oklch(0.25 0.02 265 / 60%)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {geocodeBar.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Flag distribution */}
        {pieData.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Flag Distribution
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ backgroundColor: 'oklch(0.14 0.015 265)', border: '1px solid oklch(0.25 0.02 265 / 60%)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'oklch(0.60 0.01 265)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Occ mapping methods */}
        {mapBar.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" /> Occupancy Mapping Methods
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={mapBar} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'oklch(0.60 0.01 265)' }} axisLine={false} tickLine={false} width={90} />
                <RTooltip contentStyle={{ backgroundColor: 'oklch(0.14 0.015 265)', border: '1px solid oklch(0.25 0.02 265 / 60%)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" fill="oklch(0.65 0.22 270)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quality summary */}
        <div className="glass rounded-2xl p-5 flex flex-col justify-center items-center gap-3">
          <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center" style={{
            background: `conic-gradient(oklch(0.65 0.22 270) ${cleanPct !== '—' ? cleanPct : 0}%, transparent 0%)`
          }}>
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center">
              <span className="text-lg font-bold gradient-text">{cleanPct !== '—' ? `${cleanPct}%` : '—'}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">Data Quality Score</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rows without any flags</p>
          </div>
        </div>
      </div>

      {/* Download cards */}
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
        Download Output
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <DownloadCard
          format="xlsx"
          label="Excel (XLSX)"
          description="Includes flags sheet and audit data"
          icon={FileSpreadsheet}
          uploadId={uploadId}
        />
        <DownloadCard
          format="csv"
          label="CSV"
          description="Lightweight, compatible with all systems"
          icon={FileText}
          uploadId={uploadId}
        />
      </div>

      {/* Return home */}
      <Button
        id="btn-return-home"
        variant="outline"
        size="lg"
        onClick={() => navigate('/')}
        className="w-full h-12 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      >
        <Home className="w-4 h-4 mr-2" /> Return to Dashboard
      </Button>
    </div>
  );
}
