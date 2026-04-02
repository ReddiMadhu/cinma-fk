import { useQuery } from '@tanstack/react-query';
import { getSessionDiff } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// Maps backend columns into logical visual groups for side-by-side rendering
function buildColumnGroups(step, beforeCols, afterCols) {
  if (step === 'geocode') {
    return [
      {
        title: 'Provided Address',
        before: beforeCols,
        after: [],
      },
      {
        title: 'Geocoding Result',
        before: [],
        after: afterCols,
      }
    ].filter(g => g.before.length > 0 || g.after.length > 0);
  }
  
  if (step === 'map-codes') {
    const isOccBefore = (c) => c.toLowerCase().includes('occ');
    const isConstBefore = (c) => c.toLowerCase().includes('const') || c.toLowerCase().includes('bldg');
    const isOccAfter = (c) => c.toLowerCase().includes('occ');
    const isConstAfter = (c) => c.toLowerCase().includes('const');

    return [
      {
        title: 'Occupancy Mapping',
        before: beforeCols.filter(isOccBefore),
        after: afterCols.filter(isOccAfter),
      },
      {
        title: 'Construction Mapping',
        before: beforeCols.filter(isConstBefore),
        after: afterCols.filter(isConstAfter),
      }
    ].filter(g => g.before.length > 0 || g.after.length > 0);
  }

  if (step === 'normalize') {
    return [
      {
        title: 'Year Built',
        before: beforeCols.filter(c => c.toLowerCase().includes('year')),
        after: afterCols.filter(c => c.toLowerCase().includes('year')),
      },
      {
        title: 'Stories',
        before: beforeCols.filter(c => c.toLowerCase().includes('stor')),
        after: afterCols.filter(c => c.toLowerCase().includes('stor')),
      },
      {
        title: 'Area',
        before: beforeCols.filter(c => c.toLowerCase().includes('area')),
        after: afterCols.filter(c => c.toLowerCase().includes('area')),
      },
      {
        title: 'Value',
        before: beforeCols.filter(c => c.toLowerCase().includes('val') || c.toLowerCase().includes('eqcv')),
        after: afterCols.filter(c => c.toLowerCase().includes('val') || c.toLowerCase().includes('eqcv')),
      },
      {
        title: 'Roof',
        before: beforeCols.filter(c => c.toLowerCase().includes('roof')),
        after: afterCols.filter(c => c.toLowerCase().includes('roof')),
      },
      {
        title: 'Wall/Clad',
        before: beforeCols.filter(c => c.toLowerCase().includes('wall') || c.toLowerCase().includes('clad')),
        after: afterCols.filter(c => c.toLowerCase().includes('wall') || c.toLowerCase().includes('clad')),
      },
      {
        title: 'Foundation',
        before: beforeCols.filter(c => c.toLowerCase().includes('found')),
        after: afterCols.filter(c => c.toLowerCase().includes('found')),
      },
      {
        title: 'Sprinkler',
        before: beforeCols.filter(c => c.toLowerCase().includes('sprink')),
        after: afterCols.filter(c => c.toLowerCase().includes('sprink')),
      }
    ].filter(g => g.before.length > 0 || g.after.length > 0);
  }

  // Fallback
  return [{ title: 'Changes', before: beforeCols, after: afterCols }];
}

function ValueCell({ val, isChanged, isError, isOutput }) {
  if (val === null || val === undefined || val === '') {
    return <span className="opacity-30">—</span>;
  }
  
  if (isOutput) {
    if (isError) {
      return (
        <div className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-semibold truncate max-w-[140px]">
          {String(val)}
        </div>
      );
    }
    return (
      <div className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded border font-medium truncate max-w-[140px]",
        isChanged 
         ? "bg-primary/10 border-primary/20 text-primary" 
         : "bg-muted/50 border-border/50 text-foreground"
      )}>
        {String(val)}
      </div>
    );
  }

  // Raw Input value styling
  return (
    <span className="text-muted-foreground truncate max-w-[140px] block">
      {String(val)}
    </span>
  );
}

export default function StepDiffTable({ uploadId, step, stepColor, stepBgColor, stepBorderColor }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['session-diff', uploadId, step],
    queryFn: () => getSessionDiff(uploadId, step),
    staleTime: Infinity,
  });

  const columnGroups = useMemo(() => {
    if (!data?.columns) return [];
    return buildColumnGroups(step, data.columns.before, data.columns.after);
  }, [data, step]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-4 p-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 m-6 flex items-center gap-2 text-rose-500 bg-rose-500/10 rounded-xl">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>Failed to load diff: {error.message}</p>
      </div>
    );
  }

  if (!data?.rows?.length) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-muted-foreground bg-white/40">
        <div className="text-center">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3", stepBgColor)}>
             <ArrowRight className={cn("w-5 h-5", stepColor)} />
          </div>
          <p>No changes detected or ran for this step.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white">
      {/* Table Wrapper strictly bounded */}
      <div className="overflow-auto flex-1 w-full relative custom-scrollbar">
        <table className="w-max min-w-full text-left border-collapse isolate">
          <thead className="sticky top-0 z-20 shadow-sm">
            {/* Super Header (Groups) */}
            <tr>
              <th className="sticky left-0 z-30 bg-muted px-4 py-2 border-b border-r border-border/80 w-12 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"></th>
              {columnGroups.map((group, idx) => (
                <th key={idx} colSpan={group.before.length + group.after.length + (group.before.length && group.after.length ? 1 : 0)} 
                    className={cn(
                      "px-4 py-2 border-b border-r-2 border-r-border/60 text-[11px] font-bold uppercase tracking-wider text-center relative",
                      idx % 2 === 1 ? stepBgColor : "bg-muted/50 text-muted-foreground"
                    )}>
                  <span className={cn(idx % 2 === 1 && stepColor)}>{group.title}</span>
                </th>
              ))}
            </tr>
            {/* Sub Header (Actual Columns) */}
            <tr>
              <th className="sticky left-0 z-30 bg-muted/95 px-4 py-2 border-b border-r border-border/80 text-[10px] font-semibold text-muted-foreground uppercase shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">Row #</th>
              {columnGroups.map((group, groupIdx) => {
                const els = [];
                const hasAfter = group.after.length > 0;
                
                // Before Columns
                group.before.forEach((col, i) => {
                  const applyBorder = !hasAfter && (i === group.before.length - 1);
                  els.push(
                    <th key={`b-${col}`} className={cn(
                      "bg-white/95 backdrop-blur-md px-3 py-2 border-b border-border/50 text-[10px] font-semibold text-muted-foreground/80 uppercase max-w-[120px] truncate",
                      applyBorder && "border-r-2 border-r-border/60"
                    )} title={col}>
                      {col}
                    </th>
                  );
                });
                
                // Separator icon 
                if (group.before.length > 0 && group.after.length > 0) {
                  els.push(
                    <th key={`sep-${groupIdx}`} className="bg-white/95 px-1 py-2 border-b border-border/50 text-muted-foreground/30 w-6 text-center">
                    </th>
                  );
                }

                // After Columns
                group.after.forEach((col, i) => {
                  const applyBorder = i === group.after.length - 1;
                  els.push(
                    <th key={`a-${col}`} className={cn(
                      "bg-white/95 backdrop-blur-md px-3 py-2 border-b border-border/50 text-[10px] font-bold uppercase max-w-[140px] truncate",
                      stepColor,
                      applyBorder && "border-r-2 border-r-border/60"
                    )} title={col}>
                      {col}
                    </th>
                  );
                });

                return els;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.rows.map((row, i) => {
              const isFailedGeocode = step === 'geocode' && String(row.after['GeocodingStatus'] || '').toUpperCase() === 'FAILED';

              return (
                <tr key={i} className={cn(
                  "hover:bg-muted/30 transition-colors font-mono text-[11px]",
                  isFailedGeocode && "bg-rose-500/5 hover:bg-rose-500/10"
                )}>
                  {/* Sticky Row ID */}
                  <td className="sticky left-0 z-10 bg-white/95 px-4 py-2 border-r border-border/80 text-muted-foreground/40 shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                     {row.original_row_idx !== undefined ? row.original_row_idx + 1 : i + 1}
                  </td>
                  
                  {columnGroups.map((group, groupIdx) => {
                    const els = [];
                    
                    const hasAfter = group.after.length > 0;
                    
                    // Before Values
                    group.before.forEach((col, i) => {
                      const applyBorder = !hasAfter && (i === group.before.length - 1);
                      els.push(
                        <td key={`b-${col}`} className={cn("px-3 py-2 max-w-[180px]", applyBorder && "border-r-2 border-r-border/60")} title={String(row.before[col] ?? '')}>
                          <ValueCell val={row.before[col]} isOutput={false} />
                        </td>
                      );
                    });

                    // Separator
                    if (group.before.length > 0 && group.after.length > 0) {
                      els.push(
                        <td key={`sep-${groupIdx}`} className="px-1 py-1.5 text-muted-foreground/20 text-center align-middle">
                          <ChevronRight className="w-3.5 h-3.5 inline-block" />
                        </td>
                      );
                    }

                    // After Values (Computed -> Pill format)
                    group.after.forEach((col, i) => {
                      const val = row.after[col];
                      const beforeVal = group.before.includes(col) ? row.before[col] : null;
                      const isChanged = beforeVal !== val && val !== null;
                      const isNew = val != null && String(val).trim() !== '' && !group.before.includes(col);
                      const isErrorCol = col.toLowerCase().includes('status') && isFailedGeocode;
                      const applyBorder = i === group.after.length - 1;

                      els.push(
                        <td key={`a-${col}`} className={cn("px-2 py-2 max-w-[180px]", applyBorder && "border-r-2 border-r-border/60")} title={String(val ?? '')}>
                          <ValueCell val={val} isChanged={isChanged || isNew} isError={isErrorCol} isOutput={true} />
                        </td>
                      );
                    });

                    return els;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="bg-muted px-6 py-3 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between z-10 shrink-0">
        <span>Showing <strong className="text-foreground">{data.rows.length}</strong> of {data.total} row{data.total !== 1 ? 's' : ''} processed.</span>
        {data.total > data.rows.length && (
          <span className="opacity-80">Only the first {data.rows.length} rows are shown for performance.</span>
        )}
      </div>
    </div>
  );
}
