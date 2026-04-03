import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Home, FileSpreadsheet, FileText, CheckCircle2,
  MapPin, DollarSign, Building2, TrendingUp,
} from 'lucide-react';
import { getSlipSummary } from '@/lib/api';
import { useSessionStore } from '@/store/useSessionStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StepIndicator from '@/components/layout/StepIndicator';
import { cn } from '@/lib/utils';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = new Intl.NumberFormat('en-US');

function pct(val, total) {
  if (!total || !val) return '0%';
  return `${Math.round((val / total) * 100)}%`;
}
function pctNum(val, total) {
  if (!total || !val) return 0;
  return Math.round((val / total) * 100);
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const HEADER_CLASS = 'px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 bg-muted/40 border-b border-border/30 whitespace-nowrap select-none';
const CELL_CLASS   = 'px-4 py-[9px] border-b border-border/15 text-[12px] text-foreground/80 align-middle';

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ num, title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-7 h-7 rounded-full gradient-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm">
        {num}
      </span>
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/75">{title}</h2>
    </div>
  );
}

/** Percentage bar rendered inline in distribution rows */
function PctBar({ value, total, colorClass = 'bg-primary/60' }) {
  const width = pctNum(value, total);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', colorClass)} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{width}%</span>
    </div>
  );
}

/** The highlighted total footer row; aligns automatically when cols array matches headers */
function TotalRow({ cells }) {
  return (
    <tr className="bg-primary/[0.04] border-t-2 border-primary/15">
      {cells.map(({ content, align = 'left', colSpan = 1, isLabel = false }, i) => (
        <td
          key={i}
          colSpan={colSpan}
          className={cn(
            'px-4 py-3 text-[12px] font-bold border-t border-primary/10',
            isLabel ? 'text-primary' : 'text-foreground',
            align === 'right' && 'text-right tabular-nums',
            align === 'center' && 'text-center',
          )}
        >
          {content}
        </td>
      ))}
    </tr>
  );
}

function DownloadAction({ format, label, icon: Icon, uploadId }) {
  const href = `/api/download/${uploadId}?format=${format}`;
  const filename = `cat_output_${uploadId?.slice(0, 8)}.${format}`;
  return (
    <a
      id={`btn-download-${format}`}
      href={href}
      download={filename}
      onClick={() => toast.success(`${label} download started`)}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary glow-primary-sm text-white text-[13px] font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all no-underline"
    >
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}

function KpiCard({ icon: Icon, label, value, sub, iconBg }) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3 border border-border/30">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/50">{sub}</p>}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 3 }) {
  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/30">
      <div className="bg-muted/40 px-4 py-2.5 border-b border-border/30 flex gap-4">
        {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className="h-3 w-20 rounded" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-[9px] border-b border-border/10">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn('h-4 rounded', j === 0 ? 'flex-1' : 'w-24')} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DonePage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { setUploadId } = useSessionStore();

  useEffect(() => { if (uploadId) setUploadId(uploadId); }, [uploadId, setUploadId]);

  const { data, isLoading } = useQuery({
    queryKey: ['slip-summary', uploadId],
    queryFn: () => getSlipSummary(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const lv      = data?.location_values ?? {};
  const grand   = lv.total ?? 0;
  const cs      = data?.country_state   ?? [];
  const csTotal = cs.reduce((s, r) => s + r.count, 0);
  const csTiv   = cs.reduce((s, r) => s + r.tiv,   0);
  const topLocs = data?.top_locations   ?? [];
  const topTiv  = topLocs.reduce((s, r) => s + r.tiv, 0);
  const occ     = data?.occupancy_dist      ?? [];
  const cst     = data?.construction_dist   ?? [];
  const yb      = data?.year_built_dist     ?? [];
  const st      = data?.stories_dist        ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl gradient-primary glow-primary flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-1"><span className="gradient-text">Pipeline Complete!</span></h1>
        <p className="text-muted-foreground text-sm">Exposure data processed and ready for CAT modeling.</p>
        <code className="text-xs font-mono text-muted-foreground/40 mt-1 block">Session: {uploadId?.slice(0, 16)}…</code>
      </div>

      <div className="mb-6 flex justify-center">
        <StepIndicator currentStep="done" />
      </div>

      {/* ── KPI Summary Strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={MapPin}     label="Total Locations"  value={fmtN.format(data?.total_risks ?? 0)} iconBg="bg-cyan-500" />
        <KpiCard icon={DollarSign} label="Total TIV"        value={fmt.format(grand)}                   iconBg="gradient-primary" />
        <KpiCard icon={Building2}  label="Building Value"   value={fmt.format(lv.building ?? 0)}        iconBg="bg-violet-500" />
        <KpiCard icon={TrendingUp} label="Countries / States" value={`${new Set(cs.map(r => r.country)).size} / ${cs.length}`} iconBg="bg-emerald-500" />
      </div>

      {/* ── Export Bar ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-3 border border-border/40">
        <div>
          <p className="font-semibold text-sm text-foreground">Export Processed Output</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Download the normalized data with all pipeline enrichments applied.</p>
        </div>
        <div className="flex gap-3">
          <DownloadAction format="xlsx" label="Export to Excel" icon={FileSpreadsheet} uploadId={uploadId} />
          <DownloadAction format="csv"  label="Export CSV"      icon={FileText}        uploadId={uploadId} />
        </div>
      </div>

      {/* ── Dashboard Title ─────────────────────────────────────────────────── */}
      <h2 className="text-lg font-bold mb-6 gradient-text tracking-tight">SlipCoding Dashboard</h2>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2: Location Values
          Columns: [Label | Total | % Total]
          widths:  [auto  | 160px | 90px  ]
      ════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle num="2" title="Location Values" />
        {isLoading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup>
                <col />                  {/* Label — fills remaining space */}
                <col style={{ width: 160 }} />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Location Values</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>Total</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Building',              val: lv.building },
                  { label: 'Contents',              val: lv.contents },
                  { label: 'Business Interruption', val: lv.bi },
                ].map((r, i) => (
                  <tr key={r.label} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                    <td className={cn(CELL_CLASS)}>{r.label}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.val ?? 0)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground')}>{pct(r.val, grand)}</td>
                  </tr>
                ))}
                <TotalRow cells={[
                  { content: 'Total', isLabel: true },
                  { content: fmt.format(grand), align: 'right' },
                  { content: '100%', align: 'right' },
                ]} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4: Country / State Breakdown
          Columns: [Country | State | # Risks | Total | % Total]
          widths:  [100     | 80    | 90      | 160   | 90     ]
      ════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle num="4" title="Country / State Breakdown" />
        {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: 100 }} />
                <col style={{ width: 80  }} />
                <col style={{ width: 90  }} />
                <col />
                <col style={{ width: 90  }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Country</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>State</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}># Risks</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>Total</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {cs.map((r, i) => (
                  <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                    <td className={cn(CELL_CLASS, 'font-medium')}>{r.country}</td>
                    <td className={cn(CELL_CLASS, 'text-muted-foreground')}>{r.state}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums')}>{fmtN.format(r.count)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground')}>{pct(r.tiv, csTiv)}</td>
                  </tr>
                ))}
                <TotalRow cells={[
                  { content: 'Total', isLabel: true },
                  { content: '' },
                  { content: fmtN.format(csTotal), align: 'right' },
                  { content: fmt.format(csTiv),     align: 'right' },
                  { content: '100%',                align: 'right' },
                ]} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6: Top Locations by TIV
          Columns: [Loc ID | Address | City | State | ZIP | TIV | % Total]
          widths:  [70     | auto    | 130  | 70    | 80  | 150 | 90     ]
      ════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle num="6" title="Top Locations by TIV" />
        {isLoading ? <TableSkeleton rows={10} cols={7} /> : (
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: 70  }} />
                <col />                        {/* Address fills */}
                <col style={{ width: 130 }} />
                <col style={{ width: 70  }} />
                <col style={{ width: 80  }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 80  }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Loc ID</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Address</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>City</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>State</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>ZIP</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>TIV</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {topLocs.map((r, i) => (
                  <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                    <td className={cn(CELL_CLASS, 'text-muted-foreground/60 font-mono text-[11px]')}>{r.loc_id || '—'}</td>
                    <td className={cn(CELL_CLASS, 'truncate max-w-0')} title={r.address}>{r.address || '—'}</td>
                    <td className={cn(CELL_CLASS)}>{r.city || '—'}</td>
                    <td className={cn(CELL_CLASS, 'font-medium')}>{r.state || '—'}</td>
                    <td className={cn(CELL_CLASS, 'font-mono text-[11px] text-muted-foreground')}>{r.zip || '—'}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-semibold')}>{fmt.format(r.tiv)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground')}>{pct(r.tiv, grand)}</td>
                  </tr>
                ))}
                {/* Top-10 subtotal + colspan trick so label aligns with TIV col */}
                <tr className="bg-primary/[0.04] border-t-2 border-primary/15">
                  <td colSpan={5} className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground border-t border-primary/10">
                    Top {topLocs.length} Total
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-bold tabular-nums text-primary border-t border-primary/10">
                    {fmt.format(topTiv)}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-bold tabular-nums border-t border-primary/10">
                    {pct(topTiv, grand)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTIONS 7+8 side by side: Occupancy + Construction
          Columns: [Label | Bar+% | Total]
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* Section 7: Occupancy */}
        <div>
          <SectionTitle num="7" title="Occupancy Description" />
          {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
            <div className="glass rounded-2xl overflow-hidden border border-border/30">
              <table className="w-full text-[12px] border-collapse table-fixed">
                <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                <thead>
                  <tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Occupancy</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr>
                </thead>
                <tbody>
                  {occ.map((r, i) => (
                    <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                      <td className={cn(CELL_CLASS)}>{r.label}</td>
                      <td className={cn(CELL_CLASS)}><PctBar value={r.tiv} total={grand} /></td>
                      <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { content: 'Total', isLabel: true },
                    { content: '' },
                    { content: fmt.format(grand), align: 'right' },
                  ]} />
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 8: Construction */}
        <div>
          <SectionTitle num="8" title="Construction Description" />
          {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
            <div className="glass rounded-2xl overflow-hidden border border-border/30">
              <table className="w-full text-[12px] border-collapse table-fixed">
                <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                <thead>
                  <tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Construction</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr>
                </thead>
                <tbody>
                  {cst.map((r, i) => (
                    <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                      <td className={cn(CELL_CLASS)}>{r.label}</td>
                      <td className={cn(CELL_CLASS)}><PctBar value={r.tiv} total={grand} colorClass="bg-violet-500/60" /></td>
                      <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { content: 'Total', isLabel: true },
                    { content: '' },
                    { content: fmt.format(grand), align: 'right' },
                  ]} />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTIONS 9+10 side by side: Year Built + Stories
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

        {/* Section 9: Year Built */}
        <div>
          <SectionTitle num="9" title="Year Built" />
          {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
            <div className="glass rounded-2xl overflow-hidden border border-border/30">
              <table className="w-full text-[12px] border-collapse table-fixed">
                <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                <thead>
                  <tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Year Built</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr>
                </thead>
                <tbody>
                  {yb.map((r, i) => (
                    <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                      <td className={cn(CELL_CLASS)}>{r.label}</td>
                      <td className={cn(CELL_CLASS)}><PctBar value={r.tiv} total={grand} colorClass="bg-emerald-500/60" /></td>
                      <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { content: 'Total', isLabel: true },
                    { content: '' },
                    { content: fmt.format(grand), align: 'right' },
                  ]} />
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 10: Number of Stories */}
        <div>
          <SectionTitle num="10" title="Number of Stories" />
          {isLoading ? <TableSkeleton rows={5} cols={3} /> : (
            <div className="glass rounded-2xl overflow-hidden border border-border/30">
              <table className="w-full text-[12px] border-collapse table-fixed">
                <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                <thead>
                  <tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Stories</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr>
                </thead>
                <tbody>
                  {st.map((r, i) => (
                    <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                      <td className={cn(CELL_CLASS)}>{r.label}</td>
                      <td className={cn(CELL_CLASS)}><PctBar value={r.tiv} total={grand} colorClass="bg-amber-500/60" /></td>
                      <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { content: 'Total', isLabel: true },
                    { content: '' },
                    { content: fmt.format(grand), align: 'right' },
                  ]} />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Return Home ──────────────────────────────────────────────────────── */}
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
