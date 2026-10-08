import type { BreakdownRow, DailyRow } from "@/lib/reports/metrics";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Lightweight inline-SVG charts for the reports page (server-rendered, no chart dependency).
 * One series per chart in the copper accent; text uses ink tokens; gridlines are solid hairlines.
 * Every day has a full-height hit area with a native <title> so hovering reveals the exact values.
 */

const W = 720;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
const COPPER = "#b5673b";
const INK = "#1f1b18";
const STONE = "#8a8077";
const GRID = "rgba(31,27,24,0.08)";

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function tickEvery(count: number): number {
  return count <= 14 ? 1 : count <= 31 ? 3 : count <= 62 ? 7 : count <= 120 ? 14 : 30;
}

function Frame({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={cn("h-auto w-full", className)} style={{ fontFamily: "inherit" }}>
      {children}
    </svg>
  );
}

export function BookingTrendChart({ daily, locale, label }: { daily: DailyRow[]; locale: string; label: string }) {
  const n = daily.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...daily.map((d) => d.created)));
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const every = tickEvery(n);
  const r = Math.min(4, barW / 2);
  return (
    <Frame label={label}>
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
          <text x={PAD.left - 8} y={y(tk) + 3} textAnchor="end" fontSize={10} fill={STONE} className="num">{formatNumber(tk, locale)}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const cx = PAD.left + slot * i + slot / 2;
        const x = cx - barW / 2;
        const top = y(d.created);
        const base = y(0);
        const h = Math.max(0, base - top);
        const path = h <= 0 ? null : `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`;
        return (
          <g key={d.date}>
            {path ? <path d={path} fill={COPPER} /> : <line x1={x} x2={x + barW} y1={base} y2={base} stroke={COPPER} strokeWidth={1} opacity={0.4} />}
            {i % every === 0 ? <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} fill={STONE} className="num">{formatDate(d.date, locale, "short")}</text> : null}
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} fill="transparent" className="hover:fill-[rgba(31,27,24,0.04)]">
              <title>{`${formatDate(d.date, locale, "weekday")}: ${formatNumber(d.created, locale)}${d.cancelled ? ` (${formatNumber(d.cancelled, locale)} ✕)` : ""}`}</title>
            </rect>
          </g>
        );
      })}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
    </Frame>
  );
}

export function OccupancyChart({ daily, locale, label, peakLabel }: { daily: DailyRow[]; locale: string; label: string; peakLabel?: string }) {
  const n = daily.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, n);
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - Math.min(1, Math.max(0, v)) * plotH;
  const points = daily.map((d, i) => [x(i), y(d.occupancy)] as const);
  const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${points[points.length - 1][0].toFixed(1)},${y(0)} L${points[0][0].toFixed(1)},${y(0)} Z` : "";
  const peakIdx = daily.reduce((best, d, i) => (d.occupancy > (daily[best]?.occupancy ?? -1) ? i : best), 0);
  const peak = daily[peakIdx];
  const every = tickEvery(n);
  return (
    <Frame label={label}>
      {[0, 0.5, 1].map((tk) => (
        <g key={tk}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
          <text x={PAD.left - 8} y={y(tk) + 3} textAnchor="end" fontSize={10} fill={STONE} className="num">{formatPercent(tk, locale)}</text>
        </g>
      ))}
      {n > 0 ? <path d={area} fill={COPPER} opacity={0.1} /> : null}
      {n > 0 ? <path d={line} fill="none" stroke={COPPER} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {peak && peak.occupancy > 0 ? (
        <g>
          <circle cx={x(peakIdx)} cy={y(peak.occupancy)} r={6} fill="#fff" />
          <circle cx={x(peakIdx)} cy={y(peak.occupancy)} r={4} fill={COPPER} />
          <text x={Math.min(W - PAD.right - 4, Math.max(PAD.left + 4, x(peakIdx)))} y={Math.max(PAD.top + 10, y(peak.occupancy) - 10)} textAnchor={peakIdx > n * 0.8 ? "end" : peakIdx < n * 0.2 ? "start" : "middle"} fontSize={11} fontWeight={600} fill={INK} className="num">
            {peakLabel ?? formatPercent(peak.occupancy, locale)}
          </text>
        </g>
      ) : null}
      {daily.map((d, i) => (
        <g key={d.date}>
          {i % every === 0 ? <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} fill={STONE} className="num">{formatDate(d.date, locale, "short")}</text> : null}
          <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} fill="transparent" className="hover:fill-[rgba(31,27,24,0.04)]">
            <title>{`${formatDate(d.date, locale, "weekday")}: ${formatPercent(d.occupancy, locale)} · ${formatNumber(d.nightsSold, locale)}/${formatNumber(d.nightsAvailable, locale)}`}</title>
          </rect>
        </g>
      ))}
    </Frame>
  );
}

export function BarList({ rows, locale, currency, labelFor, countLabel }: { rows: BreakdownRow[]; locale: string; currency: string; labelFor: (row: BreakdownRow) => string; countLabel: (count: number) => string }) {
  const max = Math.max(0, ...rows.map((r) => Number(r.revenue)));
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const value = Number(row.revenue);
        const pct = max > 0 ? value / max : 0;
        return (
          <li key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 text-sm">
            <span className="truncate font-medium text-charcoal">{labelFor(row)}</span>
            <span className="num text-end text-charcoal">{formatMoney(row.revenue, currency, locale)}</span>
            <div className="h-2 overflow-hidden rounded-full bg-sand-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(row.share * 100)} aria-label={labelFor(row)}>
              <div className="h-full rounded-full bg-copper" style={{ width: `${Math.max(pct * 100, value > 0 ? 2 : 0)}%` }} />
            </div>
            <span className="num text-end text-xs text-muted-foreground">{countLabel(row.count)} · {formatPercent(row.share, locale)}</span>
          </li>
        );
      })}
    </ul>
  );
}
