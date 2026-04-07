'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStorage } from '@/lib/storage';
import { InsightsData } from '@/lib/types';
import { AppHeader } from '@/components/AppHeader';

// Vibrant, accessible chart colour palette
const CATEGORY_COLORS = [
  'hsl(221,83%,53%)',   // blue
  'hsl(142,71%,45%)',   // emerald
  'hsl(32,95%,50%)',    // amber
  'hsl(262,83%,58%)',   // purple
  'hsl(330,81%,60%)',   // rose
  'hsl(186,90%,40%)',   // teal
  'hsl(25,95%,53%)',    // orange
  'hsl(199,89%,48%)',   // sky
  'hsl(158,64%,52%)',   // green
  'hsl(291,64%,42%)',   // violet
  'hsl(349,89%,60%)',   // pink
  'hsl(45,93%,47%)',    // yellow
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// ── Donut Chart ────────────────────────────────────────────────────
function CategoryDonutChart({
  categories,
  totalSpent,
  onCategoryClick,
}: {
  categories: any[];
  totalSpent: number;
  onCategoryClick: (category: string) => void;
}) {
  const size = 260;
  const strokeWidth = 52;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {categories.map((cat, index) => {
          const pct = (cat.total_spend / totalSpent) * 100;
          const segLen = (pct / 100) * circumference;
          const offset = circumference - (accumulated / 100) * circumference;
          accumulated += pct;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={getCategoryColor(index)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circumference}`}
              strokeDashoffset={-offset}
              className="transition-opacity duration-200 hover:opacity-80 cursor-pointer"
              onClick={() => onCategoryClick(cat.category)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Spent</p>
        <p className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">
          ${totalSpent.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Category merchant breakdown ────────────────────────────────────
function CategoryMerchantBreakdown({
  categories,
  expandedCategory,
  setExpandedCategory,
}: {
  categories: any[];
  expandedCategory: string | null;
  setExpandedCategory: (c: string | null) => void;
}) {
  const enriched = categories.map((cat) => {
    const merchantMap = new Map<string, any>();
    (cat.transactions || []).forEach((txn: any) => {
      const key = txn.merchant || 'Unknown';
      if (!merchantMap.has(key)) {
        merchantMap.set(key, { merchant_display: key, transaction_count: 0, total_spend: 0 });
      }
      const m = merchantMap.get(key)!;
      m.transaction_count++;
      m.total_spend += Math.abs(txn.amount);
    });
    const merchants = Array.from(merchantMap.values())
      .map((m) => ({ ...m, average_transaction: m.total_spend / m.transaction_count }))
      .sort((a, b) => b.total_spend - a.total_spend);
    return { ...cat, merchants };
  });

  return (
    <div className="space-y-2">
      {enriched.map((cat, index) => {
        const isExpanded = expandedCategory === cat.category;
        const color = getCategoryColor(index);

        return (
          <div
            key={index}
            className="border border-[hsl(var(--border))] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
              className="w-full px-4 py-3.5 hover:bg-[hsl(var(--muted))]/30 transition-colors text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-semibold text-[hsl(var(--foreground))] text-sm">{cat.category}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {cat.merchants?.length || 0} merchant{cat.merchants?.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-[hsl(var(--foreground))]">
                  ${cat.total_spend.toLocaleString()}
                </span>
                <svg
                  className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-4 py-3 space-y-2 animate-slide-in">
                {cat.merchants.length > 0 ? (
                  cat.merchants.map((m: any, mi: number) => {
                    const pct = (m.total_spend / cat.total_spend) * 100;
                    return (
                      <div key={mi} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/60 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{m.merchant_display}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {m.transaction_count} txn · avg ${m.average_transaction.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-[hsl(var(--foreground))]">${m.total_spend.toLocaleString()}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{pct.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-2">No merchants in this category</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  accentColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="bg-[hsl(var(--surface-card))] rounded-xl shadow-ambient overflow-hidden flex"
    >
      <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</p>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + '1a' }}>
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        </div>
        <p className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Insights Panel ─────────────────────────────────────────────────
function InsightItem({ icon, text, type }: { icon: React.ReactNode; text: string; type: 'info' | 'warning' | 'success' }) {
  const colors = {
    info:    { bg: 'bg-[hsl(var(--primary))]/8',     icon: 'text-[hsl(var(--primary))]' },
    warning: { bg: 'bg-[hsl(var(--warning))]/15',     icon: 'text-amber-600' },
    success: { bg: 'bg-[hsl(var(--success))]/10',    icon: 'text-[hsl(var(--success-bright))]' },
  }[type];
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl ${colors.bg}`}>
      <span className={`mt-0.5 shrink-0 ${colors.icon}`}>{icon}</span>
      <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed">{text}</p>
    </div>
  );
}

function SpendingInsightsPanel({ insights }: { insights: InsightsData }) {
  const items: { icon: React.ReactNode; text: string; type: 'info' | 'warning' | 'success' }[] = [];
  const { summary, top_merchants, recurring_charges, recurring_summary, spending_by_category } = insights;

  if (recurring_charges.length > 0) {
    items.push({
      type: 'warning',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
      text: `${recurring_summary.count} recurring charge${recurring_summary.count !== 1 ? 's' : ''} detected — $${recurring_summary.total_monthly_cost.toFixed(0)}/mo or $${recurring_summary.total_annual_cost.toLocaleString()}/yr.`,
    });
  }

  if (top_merchants.length > 0) {
    const top = top_merchants[0];
    const pct = ((top.total_spend / summary.total_spent) * 100).toFixed(0);
    items.push({
      type: 'info',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      text: `${top.merchant_display} is your top expense at $${top.total_spend.toLocaleString()} — ${pct}% of total spending.`,
    });
  }

  if (spending_by_category) {
    const topCat = spending_by_category[0];
    if (topCat) {
      items.push({
        type: 'info',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5l5.5 5.5a2 2 0 010 2.83l-5.5 5.5H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
        text: `${topCat.category} is your largest category with $${topCat.total_spend.toLocaleString()} across ${topCat.transaction_count} transactions.`,
      });
    }
  }

  if (summary.net_change > 0) {
    items.push({
      type: 'success',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
      text: `You received $${summary.net_change.toLocaleString()} more than you spent this period.`,
    });
  } else if (summary.net_change < 0) {
    items.push({
      type: 'warning',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
      text: `You spent $${Math.abs(summary.net_change).toLocaleString()} more than you received this period.`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-[hsl(var(--surface-card))] rounded-2xl shadow-ambient p-6 mb-6">
      <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-4">Spending Insights</h2>
      <div className="space-y-2.5">
        {items.map((item, i) => <InsightItem key={i} {...item} />)}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [privateMode, setPrivateMode] = useState(false);

  useEffect(() => {
    const data = SessionStorage.getInsights();
    if (!data) {
      router.push('/');
      return;
    }
    setInsights(data);
  }, [router]);

  const handleStartOver = () => {
    SessionStorage.clearSession();
    router.push('/');
  };

  const handleDownloadReport = () => {
    if (!insights) return;

    const rows: string[] = [
      'FinSight Spending Report',
      `Generated: ${new Date().toLocaleString()}`,
      `Period: ${insights.summary.period.start} to ${insights.summary.period.end} (${insights.summary.period.months} months)`,
      '',
      'SUMMARY',
      'Metric,Amount',
      `Total Spent,$${insights.summary.total_spent.toLocaleString()}`,
      `Total Received,$${insights.summary.total_received.toLocaleString()}`,
      `Net Change,$${insights.summary.net_change.toLocaleString()}`,
      `Average Per Month,$${insights.summary.average_per_month.toLocaleString()}`,
      `Total Transactions,${insights.summary.total_transactions}`,
      '',
    ];

    if (insights.spending_by_category?.length) {
      rows.push('SPENDING BY CATEGORY', 'Category,Total Spend,Transaction Count,Average Transaction');
      insights.spending_by_category.forEach((c) =>
        rows.push(`${c.category},$${c.total_spend.toFixed(2)},${c.transaction_count},$${c.average_transaction.toFixed(2)}`)
      );
      rows.push('');
    }

    rows.push('TOP MERCHANTS', 'Merchant,Total Spend,Transaction Count,Average Transaction');
    insights.top_merchants.forEach((m) =>
      rows.push(`${m.merchant_display},$${m.total_spend.toFixed(2)},${m.transaction_count},$${m.average_transaction.toFixed(2)}`)
    );
    rows.push('');

    if (insights.recurring_charges.length > 0) {
      rows.push(
        'RECURRING CHARGES',
        'Merchant,Amount,Frequency,Occurrences,Estimated Annual Cost'
      );
      insights.recurring_charges.forEach((r) =>
        rows.push(`${r.merchant_display},$${r.amount.toFixed(2)},${r.frequency},${r.occurrences},$${r.estimated_annual_cost.toFixed(2)}`)
      );
      rows.push(
        '',
        'RECURRING SUMMARY',
        'Metric,Value',
        `Total Monthly Recurring,$${insights.recurring_summary.total_monthly_cost.toFixed(2)}`,
        `Total Annual Recurring,$${insights.recurring_summary.total_annual_cost.toLocaleString()}`,
        `Number of Subscriptions,${insights.recurring_summary.count}`
      );
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finsight-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!insights) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--primary))] mx-auto mb-4" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading insights…</p>
        </div>
      </div>
    );
  }

  const { summary, top_merchants, recurring_charges, recurring_summary, spending_by_category } = insights;

  const netColor =
    summary.net_change >= 0 ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)';

  // Blur helper for private mode
  const amt = (val: string) =>
    privateMode ? (
      <span className="select-none" style={{ filter: 'blur(8px)', transition: 'filter 0.2s' }}>{val}</span>
    ) : (
      <span>{val}</span>
    );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <AppHeader currentStep={3} />

      <main className="max-w-6xl mx-auto px-6 py-10 animate-in">

        {/* Page heading + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
              Spending Insights
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {summary.period.start} → {summary.period.end} · {summary.period.months} month{summary.period.months !== 1 ? 's' : ''} · {summary.total_transactions} transactions
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Private Mode toggle */}
            <button
              onClick={() => setPrivateMode((p) => !p)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all border ${
                privateMode
                  ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30'
                  : 'bg-[hsl(var(--surface-card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]/60 hover:text-[hsl(var(--foreground))]'
              }`}
              title={privateMode ? 'Show amounts' : 'Hide amounts'}
            >
              {privateMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
              {privateMode ? 'Private' : 'Private Mode'}
            </button>
            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-2 px-4 py-2 btn-primary-gradient text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-ambient"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleStartOver}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--surface-card))] text-[hsl(var(--foreground))] text-sm font-semibold rounded-lg hover:bg-[hsl(var(--surface-low))] transition-colors border border-[hsl(var(--border))]/60 shadow-ambient"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New Analysis
            </button>
          </div>
        </div>

        {/* Insights panel */}
        <SpendingInsightsPanel insights={insights} />

        {/* KPI cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Total Spent"
            value={`$${summary.total_spent.toLocaleString()}`}
            sub={`${summary.debit_count} transactions`}
            accentColor="hsl(0,84%,60%)"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            }
          />
          <KpiCard
            label="Total Received"
            value={`$${summary.total_received.toLocaleString()}`}
            sub={`${summary.credit_count} transactions`}
            accentColor="hsl(142,71%,45%)"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            }
          />
          <KpiCard
            label="Net Change"
            value={`${summary.net_change >= 0 ? '+' : ''}$${summary.net_change.toLocaleString()}`}
            accentColor={netColor}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            }
          />
          <KpiCard
            label="Avg / Month"
            value={`$${summary.average_per_month.toLocaleString()}`}
            sub={`over ${summary.period.months} month${summary.period.months !== 1 ? 's' : ''}`}
            accentColor="hsl(221,83%,53%)"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        {/* Spending by category */}
        {spending_by_category && spending_by_category.length > 0 && (
          <div className="bg-[hsl(var(--surface-card))] rounded-2xl shadow-ambient p-6 mb-6">
            <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-6">Spending by Category</h2>

            <div className="grid lg:grid-cols-2 gap-8 mb-6">
              {/* Donut */}
              <div className="flex items-center justify-center">
                <CategoryDonutChart
                  categories={spending_by_category}
                  totalSpent={summary.total_spent}
                  onCategoryClick={(cat) => {
                    setExpandedCategory(expandedCategory === cat ? null : cat);
                    setTimeout(() => {
                      document.getElementById('merchant-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                  }}
                />
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {spending_by_category.map((cat, index) => {
                  const pct = (cat.total_spend / summary.total_spent) * 100;
                  const color = getCategoryColor(index);

                  return (
                    <button
                      key={index}
                      onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[hsl(var(--muted))]/30 transition-colors text-left"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">{cat.category}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] w-10 text-right">{pct.toFixed(1)}%</span>
                      <span className="font-display font-bold text-sm text-[hsl(var(--foreground))] w-20 text-right">
                        ${cat.total_spend.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expandable merchant breakdown */}
            <div id="merchant-breakdown" className="border-t border-[hsl(var(--border))] pt-5">
              <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                Merchant Breakdown
              </h3>
              <CategoryMerchantBreakdown
                categories={spending_by_category}
                expandedCategory={expandedCategory}
                setExpandedCategory={setExpandedCategory}
              />
            </div>
          </div>
        )}

        {/* Top merchants */}
        <div className="bg-[hsl(var(--surface-card))] rounded-2xl shadow-ambient p-6 mb-6">
          <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-5">Top Merchants</h2>

          <div className="space-y-4">
            {top_merchants.slice(0, 10).map((merchant, index) => {
              const pct = (merchant.total_spend / summary.total_spent) * 100;

              return (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-6 text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0 text-right">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm text-[hsl(var(--foreground))] truncate">{merchant.merchant_display}</p>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
                          {merchant.transaction_count} txn · avg ${merchant.average_transaction.toFixed(2)}
                        </p>
                        <p className="font-display font-bold text-sm text-[hsl(var(--foreground))]">
                          ${merchant.total_spend.toLocaleString()}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] w-10 text-right">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1.5">
                      <div
                        className="bg-[hsl(var(--primary))] h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recurring charges */}
        {recurring_charges.length > 0 && (
          <div className="bg-[hsl(var(--surface-card))] rounded-2xl shadow-ambient p-6 mb-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))]">Recurring Charges</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Subscriptions and recurring payments detected</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-display text-xl font-bold text-[hsl(var(--foreground))]">
                  ${recurring_summary.total_monthly_cost.toFixed(2)}<span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">/mo</span>
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  ${recurring_summary.total_annual_cost.toLocaleString()}/yr · {recurring_summary.count} subscriptions
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {recurring_charges.map((charge, index) => (
                <div
                  key={index}
                  className="border border-[hsl(var(--border))]/60 rounded-xl p-4 hover:border-[hsl(var(--primary))]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{charge.merchant_display}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        ${charge.amount.toFixed(2)}/{charge.frequency} · {charge.occurrences} charges
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-sm text-[hsl(var(--destructive))]">
                        ${charge.estimated_annual_cost.toLocaleString()}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">per year</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            All data processed locally — nothing stored on servers
          </p>
          <button
            onClick={handleStartOver}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary-gradient text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-ambient"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Analyse Another Period
          </button>
        </div>
      </main>
    </div>
  );
}
