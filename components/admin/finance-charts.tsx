import React from "react";
import { compactPoisha, formatPoisha } from "@/lib/finance/money";
import type { AccountBalance, CategoryTotal, ChartsData, RangeMonth, TrendPoint } from "@/lib/finance/reports";

/**
 * The Charts tab of Admin → Accounts → Reports, and its printout (/print/finance?what=charts).
 * Plain SVG and HTML, no chart library and no hooks: the same components render in the
 * client page and in the server-rendered print page. Every mark has a native tooltip
 * (SVG <title> / title attribute); the exact figures are also in the table tabs.
 *
 * Colours (checked with the dataviz palette validator, colour-blind safe as a pair):
 * income #047857 (green), expense #c2410c (burnt orange); single-series marks use
 * the green or slate. Text stays in ink colours, never the series colour.
 */

const INCOME = "#047857";
const EXPENSE = "#c2410c";
const BALANCE = "#334155";
const GRID = "#e2e8f0";
const INK_MUTED = "#64748b";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EMPTY = "No approved vouchers in these dates.";

/** Colours keep on paper (the print view). */
const printColors: React.CSSProperties = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" };

function monthLabel(ym: string, withYear: boolean): string {
  const name = MONTH_NAMES[Number(ym.slice(5, 7)) - 1] ?? ym;
  return withYear ? `${name} ’${ym.slice(2, 4)}` : name;
}

function dayLabel(ymd: string): string {
  return `${Number(ymd.slice(8, 10))} ${MONTH_NAMES[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;
}

/** A round step for `ticks` axis lines covering [min, max]. */
function niceScale(min: number, max: number, ticks = 4): { lo: number; hi: number; step: number } {
  if (min === max) max = min + 100;
  const raw = (max - min) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

/** A bar from the baseline with its data end rounded (4px), growing up or down. */
function barPath(x: number, base: number, w: number, end: number): string {
  const h = Math.abs(end - base);
  if (h === 0 || w <= 0) return "";
  const r = Math.min(4, w / 2, h);
  if (end < base) {
    // Grows up: round the top corners.
    return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`;
  }
  // Grows down (a negative value): round the bottom corners.
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

function Legend({ items }: { items: { label: string; color: string; shape?: "dot" | "bar" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={i.shape === "dot" ? "inline-block w-2.5 h-2.5 rounded-full" : "inline-block w-3 h-2.5 rounded-sm"} style={{ background: i.color, ...printColors }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Card({ title, subtitle, legend, children }: { title: string; subtitle?: string; legend?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="chart-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {legend}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-slate-500">{EMPTY}</p>;
}

// ── Monthly income and expense ────────────────────────────────────────

export function MonthlyBars({ months }: { months: RangeMonth[] }) {
  const has = months.some((m) => m.income || m.expense);
  const totalIn = months.reduce((n, m) => n + m.income, 0);
  const totalOut = months.reduce((n, m) => n + m.expense, 0);
  const W = 640;
  const H = 240;
  const left = 52;
  const right = 8;
  const top = 10;
  const bottom = 26;
  const { lo, hi, step } = niceScale(Math.min(0, ...months.map((m) => m.surplus)), Math.max(1, ...months.map((m) => Math.max(m.income, m.expense))));
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  const slot = (W - left - right) / Math.max(1, months.length);
  const barW = Math.max(2, Math.min(18, (slot - 6) / 2 - 1));
  const multiYear = months.length > 0 && months[0].month.slice(0, 4) !== months[months.length - 1].month.slice(0, 4);
  const labelEvery = Math.ceil(months.length / 12);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);

  return (
    <Card
      title="Income and expense by month"
      subtitle={`Income ${formatPoisha(totalIn)} · Expense ${formatPoisha(totalOut)}`}
      legend={<Legend items={[{ label: "Income", color: INCOME }, { label: "Expense", color: EXPENSE }, { label: "Surplus / deficit", color: BALANCE, shape: "dot" }]} />}
    >
      {!has ? (
        <Empty />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Income and expense for each month: income ${formatPoisha(totalIn)}, expense ${formatPoisha(totalOut)}.`} style={printColors}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#94a3b8" : GRID} strokeWidth={1} />
              <text x={left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={INK_MUTED}>{compactPoisha(v)}</text>
            </g>
          ))}
          {months.map((m, i) => {
            const cx = left + slot * i + slot / 2;
            const tip = `${monthLabel(m.month, true)}: income ${formatPoisha(m.income)}, expense ${formatPoisha(m.expense)}, ${m.surplus >= 0 ? "surplus" : "deficit"} ${formatPoisha(Math.abs(m.surplus))}`;
            return (
              <g key={m.month}>
                <path d={barPath(cx - barW - 1, y(0), barW, y(m.income))} fill={INCOME} />
                <path d={barPath(cx + 1, y(0), barW, y(m.expense))} fill={EXPENSE} />
                {(m.income || m.expense) ? <circle cx={cx} cy={y(m.surplus)} r={4} fill={BALANCE} stroke="#ffffff" strokeWidth={2} /> : null}
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={10} fill={INK_MUTED}>{monthLabel(m.month, multiYear)}</text>
                )}
                {/* The hover target covers the whole month column, bigger than the bars. */}
                <rect x={cx - slot / 2} y={top} width={slot} height={H - top - bottom} fill="transparent">
                  <title>{tip}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      )}
    </Card>
  );
}

// ── Income or expense by category ─────────────────────────────────────

const TOP_CATEGORIES = 8;

export function CategoryBars({ title, items, total, tone }: { title: string; items: CategoryTotal[]; total: number; tone: "income" | "expense" }) {
  const color = tone === "income" ? INCOME : EXPENSE;
  const sorted = [...items].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const shown = sorted.slice(0, TOP_CATEGORIES).map((c) => ({ name: c.name, amount: c.amount }));
  const rest = sorted.slice(TOP_CATEGORIES).reduce((n, c) => n + c.amount, 0);
  if (rest > 0) shown.push({ name: `Other (${sorted.length - TOP_CATEGORIES})`, amount: rest });
  const max = Math.max(1, ...shown.map((c) => c.amount));

  return (
    <Card title={title} subtitle={`Total ${formatPoisha(total)}`}>
      {shown.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2.5" role="img" aria-label={`${title}: ${shown.map((c) => `${c.name} ${formatPoisha(c.amount)}`).join(", ")}.`}>
          {shown.map((c) => {
            const share = total > 0 ? Math.round((c.amount / total) * 100) : 0;
            return (
              <li key={c.name} title={`${c.name}: ${formatPoisha(c.amount)} (${share}%)`}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700 truncate">{c.name}</span>
                  <span className="tabular-nums text-slate-600 whitespace-nowrap">{formatPoisha(c.amount)} <span className="text-slate-400">· {share}%</span></span>
                </div>
                <div className="mt-1 h-2.5 bg-slate-100 rounded-full overflow-hidden" style={printColors}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(1, (c.amount / max) * 100)}%`, background: color, ...printColors }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Account balances ──────────────────────────────────────────────────

export function AccountBars({ balances, asOf }: { balances: AccountBalance[]; asOf: string }) {
  const rows = balances.filter((b) => b.isActive || b.balance !== 0);
  const total = rows.reduce((n, b) => n + b.balance, 0);
  const max = Math.max(1, ...rows.map((b) => Math.abs(b.balance)));
  const anyNegative = rows.some((b) => b.balance < 0);

  return (
    <Card title="Money in each account" subtitle={`On ${dayLabel(asOf)} · Total ${formatPoisha(total)}`}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2.5" role="img" aria-label={`Account balances on ${dayLabel(asOf)}: ${rows.map((b) => `${b.name} ${formatPoisha(b.balance)}`).join(", ")}. Total ${formatPoisha(total)}.`}>
          {rows.map((b) => {
            const pct = (Math.abs(b.balance) / max) * (anyNegative ? 50 : 100);
            return (
              <li key={b.id} title={`${b.name}: ${formatPoisha(b.balance)}`}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700 truncate">{b.name}{!b.isActive && <span className="text-slate-400 font-normal"> (closed)</span>}</span>
                  <span className={`tabular-nums whitespace-nowrap ${b.balance < 0 ? "text-orange-800 font-bold" : "text-slate-600"}`}>{formatPoisha(b.balance)}</span>
                </div>
                <div className="relative mt-1 h-2.5 bg-slate-100 rounded-full overflow-hidden" style={printColors}>
                  {anyNegative && <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />}
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      width: `${Math.max(b.balance === 0 ? 0 : 1, pct)}%`,
                      ...(anyNegative ? (b.balance < 0 ? { right: "50%" } : { left: "50%" }) : { left: 0 }),
                      background: b.balance < 0 ? EXPENSE : INCOME,
                      ...printColors,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Total balance over time ───────────────────────────────────────────

export function TrendLine({ points }: { points: TrendPoint[] }) {
  const has = points.length > 0 && points.some((p) => p.balance !== 0);
  const W = 640;
  const H = 220;
  const left = 52;
  const right = 64;
  const top = 12;
  const bottom = 26;
  const values = points.map((p) => p.balance);
  const { lo, hi, step } = niceScale(Math.min(0, ...values), Math.max(1, ...values));
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  const x = (i: number) => left + (points.length <= 1 ? (W - left - right) / 2 : (i / (points.length - 1)) * (W - left - right));
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z` : "";
  const last = points[points.length - 1];
  const first = points[0];
  const labelIdx = points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const half = points.length > 1 ? (x(1) - x(0)) / 2 : (W - left - right) / 2;

  return (
    <Card title="Total money held over time" subtitle={last ? `All accounts together · ${formatPoisha(last.balance)} on ${dayLabel(last.date)}` : undefined}>
      {!has ? (
        <Empty />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Total money held went from ${formatPoisha(first.balance)} on ${dayLabel(first.date)} to ${formatPoisha(last.balance)} on ${dayLabel(last.date)}.`} style={printColors}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#94a3b8" : GRID} strokeWidth={1} />
              <text x={left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={INK_MUTED}>{compactPoisha(v)}</text>
            </g>
          ))}
          <path d={area} fill={INCOME} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={INCOME} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(points.length - 1)} cy={y(last.balance)} r={4} fill={INCOME} stroke="#ffffff" strokeWidth={2} />
          <text x={x(points.length - 1) + 8} y={y(last.balance) + 4} fontSize={11} fontWeight={700} fill="#0f172a">{compactPoisha(last.balance)}</text>
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={10} fill={INK_MUTED}>
              {dayLabel(points[i].date)}
            </text>
          ))}
          {points.map((p, i) => (
            <rect key={p.date} x={x(i) - half} y={top} width={half * 2} height={H - top - bottom} fill="transparent">
              <title>{`${dayLabel(p.date)}: ${formatPoisha(p.balance)}`}</title>
            </rect>
          ))}
        </svg>
      )}
    </Card>
  );
}

// ── The whole tab ─────────────────────────────────────────────────────

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className={`text-lg font-black tabular-nums ${tone === "bad" ? "text-orange-800" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function ChartsReport({ data }: { data: ChartsData }) {
  const { summary } = data;
  const held = data.trend.length ? data.trend[data.trend.length - 1].balance : data.balances.reduce((n, b) => n + b.balance, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Income" value={formatPoisha(summary.totalIncome)} />
        <Stat label="Expense" value={formatPoisha(summary.totalExpense)} />
        <Stat label={summary.surplus >= 0 ? "Surplus" : "Deficit"} value={formatPoisha(Math.abs(summary.surplus))} tone={summary.surplus < 0 ? "bad" : undefined} />
        <Stat label={`Money held on ${dayLabel(data.to)}`} value={formatPoisha(held)} tone={held < 0 ? "bad" : undefined} />
      </div>
      {/* The SVG charts take the full width so their axis text stays readable. */}
      <MonthlyBars months={data.months} />
      <TrendLine points={data.trend} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBars title="Where the money came from" items={summary.income} total={summary.totalIncome} tone="income" />
        <CategoryBars title="Where the money went" items={summary.expense} total={summary.totalExpense} tone="expense" />
      </div>
      <AccountBars balances={data.balances} asOf={data.to} />
    </div>
  );
}
