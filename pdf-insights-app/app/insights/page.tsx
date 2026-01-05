'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStorage } from '@/lib/storage';
import { InsightsData } from '@/lib/types';

// Category color palette - ULTRA high contrast for light backgrounds
// Using very deep, saturated colors that never blend with white
const CATEGORY_COLORS = [
  '#1e3a8a', // deep navy blue
  '#166534', // deep forest green
  '#92400e', // deep brown/amber
  '#7f1d1d', // deep burgundy red
  '#581c87', // deep purple
  '#831843', // deep rose/magenta
  '#134e4a', // deep teal
  '#7c2d12', // deep rust/orange-brown
  '#0c4a6e', // deep steel blue
  '#3f6212', // deep olive green
  '#312e81', // deep indigo
  '#6b21a8', // deep violet
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// Donut Chart Component
function CategoryDonutChart({
  categories,
  totalSpent,
  onCategoryClick
}: {
  categories: any[],
  totalSpent: number,
  onCategoryClick: (category: string) => void
}) {
  const size = 280;
  const strokeWidth = 60;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercentage = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />

        {/* Category segments */}
        {categories.map((category, index) => {
          const percentage = (category.total_spend / totalSpent) * 100;
          const segmentLength = (percentage / 100) * circumference;
          const offset = circumference - (accumulatedPercentage / 100) * circumference;

          accumulatedPercentage += percentage;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={getCategoryColor(index)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              onClick={() => {
                console.log('Chart clicked! Category:', category.category);
                onCategoryClick(category.category);
              }}
              style={{
                strokeLinecap: 'butt',
              }}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Total Spent</div>
        <div className="font-display text-3xl font-bold text-[hsl(var(--foreground))]">${totalSpent.toLocaleString()}</div>
      </div>
    </div>
  );
}

// Category Merchant Breakdown Component
function CategoryMerchantBreakdown({
  categories,
  merchants,
  expandedCategory,
  setExpandedCategory
}: {
  categories: any[],
  merchants: any[],
  expandedCategory: string | null,
  setExpandedCategory: (category: string | null) => void
}) {

  // Group merchants by category from the category's transactions
  const merchantsByCategory = categories.map(category => {
    const transactions = category.transactions || [];

    // Aggregate transactions by merchant
    const merchantMap = new Map<string, any>();
    transactions.forEach((txn: any) => {
      const merchantKey = txn.merchant || 'Unknown';
      if (!merchantMap.has(merchantKey)) {
        merchantMap.set(merchantKey, {
          merchant_display: merchantKey,
          transaction_count: 0,
          total_spend: 0,
          transactions: []
        });
      }
      const merchantData = merchantMap.get(merchantKey)!;
      merchantData.transaction_count++;
      merchantData.total_spend += Math.abs(txn.amount);
      merchantData.transactions.push(txn);
    });

    // Convert map to array and calculate averages
    const categoryMerchants = Array.from(merchantMap.values()).map(m => ({
      ...m,
      average_transaction: m.total_spend / m.transaction_count
    })).sort((a, b) => b.total_spend - a.total_spend);

    return {
      ...category,
      merchants: categoryMerchants
    };
  });

  return (
    <div className="space-y-3">
      {merchantsByCategory.map((category, index) => {
        const isExpanded = expandedCategory === category.category;
        const hasMerchants = category.merchants && category.merchants.length > 0;
        const color = getCategoryColor(index);

        return (
          <div key={index} className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
            {/* Category Header - Clickable */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
              className="w-full p-4 hover:bg-[hsl(var(--muted))]/30 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <div className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">
                    {category.category}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    ({category.merchants?.length || 0} merchants)
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-display text-xl font-bold text-[hsl(var(--foreground))]">
                      ${category.total_spend.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[hsl(var(--muted-foreground))]">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>
            </button>

            {/* Merchants List - Expandable */}
            {isExpanded && hasMerchants && (
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4">
                <div className="space-y-2">
                  {category.merchants.map((merchant: any, mIndex: number) => {
                    const merchantPercentage = (merchant.total_spend / category.total_spend) * 100;

                    return (
                      <div key={mIndex} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-[hsl(var(--foreground))]">
                              {merchant.merchant_display}
                            </div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))]">
                              {merchant.transaction_count} transactions · Avg ${merchant.average_transaction.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-display text-lg font-bold text-[hsl(var(--foreground))]">
                              ${merchant.total_spend.toLocaleString()}
                            </div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))]">
                              {merchantPercentage.toFixed(1)}% of category
                            </div>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(merchantPercentage, 100)}%`,
                              backgroundColor: color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isExpanded && !hasMerchants && (
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4 text-center text-[hsl(var(--muted-foreground))]">
                No merchants in this category
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Load insights from localStorage
    const data = SessionStorage.getInsights();

    if (!data) {
      // No insights, redirect to home
      router.push('/');
      return;
    }

    setInsights(data);
  }, [router]);

  const handleStartOver = () => {
    // Clear session and start fresh
    SessionStorage.clearSession();
    router.push('/');
  };

  const handleDownloadReport = () => {
    if (!insights) return;

    // Create CSV content
    const csvRows: string[] = [];

    // Header section
    csvRows.push('FinSight Spending Report');
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push(`Period: ${insights.summary.period.start} to ${insights.summary.period.end} (${insights.summary.period.months} months)`);
    csvRows.push('');

    // Summary section
    csvRows.push('SUMMARY');
    csvRows.push('Metric,Amount');
    csvRows.push(`Total Spent,$${insights.summary.total_spent.toLocaleString()}`);
    csvRows.push(`Total Received,$${insights.summary.total_received.toLocaleString()}`);
    csvRows.push(`Net Change,$${insights.summary.net_change.toLocaleString()}`);
    csvRows.push(`Average Per Month,$${insights.summary.average_per_month.toLocaleString()}`);
    csvRows.push(`Total Transactions,${insights.summary.total_transactions}`);
    csvRows.push('');

    // Spending by Category
    if (insights.spending_by_category && insights.spending_by_category.length > 0) {
      csvRows.push('SPENDING BY CATEGORY');
      csvRows.push('Category,Total Spend,Transaction Count,Average Transaction');
      insights.spending_by_category.forEach(cat => {
        csvRows.push(`${cat.category},$${cat.total_spend.toFixed(2)},${cat.transaction_count},$${cat.average_transaction.toFixed(2)}`);
      });
      csvRows.push('');
    }

    // Top Merchants
    csvRows.push('TOP MERCHANTS');
    csvRows.push('Merchant,Total Spend,Transaction Count,Average Transaction');
    insights.top_merchants.forEach(m => {
      csvRows.push(`${m.merchant_display},$${m.total_spend.toFixed(2)},${m.transaction_count},$${m.average_transaction.toFixed(2)}`);
    });
    csvRows.push('');

    // Recurring Charges
    if (insights.recurring_charges.length > 0) {
      csvRows.push('RECURRING CHARGES');
      csvRows.push('Merchant,Amount,Frequency,Occurrences,Estimated Annual Cost');
      insights.recurring_charges.forEach(r => {
        csvRows.push(`${r.merchant_display},$${r.amount.toFixed(2)},${r.frequency},${r.occurrences},$${r.estimated_annual_cost.toFixed(2)}`);
      });
      csvRows.push('');
      csvRows.push('RECURRING SUMMARY');
      csvRows.push('Metric,Value');
      csvRows.push(`Total Monthly Recurring,$${insights.recurring_summary.total_monthly_cost.toFixed(2)}`);
      csvRows.push(`Total Annual Recurring,$${insights.recurring_summary.total_annual_cost.toFixed(2)}`);
      csvRows.push(`Number of Subscriptions,${insights.recurring_summary.count}`);
    }

    // Create downloadable CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finsight-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!insights) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted-foreground))]">Loading insights...</p>
        </div>
      </div>
    );
  }

  const { summary, top_merchants, recurring_charges, recurring_summary, spending_by_category } = insights;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-8 animate-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <h1 className="font-display text-5xl font-bold text-[hsl(var(--foreground))] tracking-tight">
              Your Spending Insights
            </h1>
          </div>
          <p className="text-xl text-[hsl(var(--muted-foreground))] mb-4">
            {summary.period.start} to {summary.period.end} ({summary.period.months} months)
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Report
            </button>
            <button
              onClick={handleStartOver}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-semibold rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-all border border-[hsl(var(--border))]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Total Spent</div>
            <div className="font-display text-3xl font-bold text-[hsl(var(--destructive))]">${summary.total_spent.toLocaleString()}</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Total Received</div>
            <div className="font-display text-3xl font-bold text-[hsl(var(--success))]">${summary.total_received.toLocaleString()}</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Net Change</div>
            <div className={`font-display text-3xl font-bold ${summary.net_change >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
              {summary.net_change >= 0 ? '+' : ''} ${summary.net_change.toLocaleString()}
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Avg/Month</div>
            <div className="font-display text-3xl font-bold text-[hsl(var(--primary))]">${summary.average_per_month.toLocaleString()}</div>
          </div>
        </div>

        {/* Top Merchants */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏪</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">Top Merchants</h2>
          </div>

          <div className="space-y-6">
            {top_merchants.slice(0, 10).map((merchant, index) => {
              const percentage = (merchant.total_spend / summary.total_spent) * 100;

              return (
                <div key={index} className="border-b border-[hsl(var(--border))] pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10">
                        <span className="font-display text-xl font-bold text-[hsl(var(--primary))]">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">{merchant.merchant_display}</div>
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          {merchant.transaction_count} transactions · Avg ${merchant.average_transaction.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">${merchant.total_spend.toLocaleString()}</div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">{percentage.toFixed(1)}% of spending</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 mt-2">
                    <div
                      className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Spending with Visual Chart */}
        {spending_by_category && spending_by_category.length > 0 && (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">📂</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">Spending by Category</h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Visual Donut Chart */}
              <div className="flex items-center justify-center">
                <CategoryDonutChart
                  categories={spending_by_category}
                  totalSpent={summary.total_spent}
                  onCategoryClick={(category) => {
                    console.log('Category clicked:', category, 'Current expanded:', expandedCategory);
                    // Toggle category - if already expanded, collapse it
                    const newCategory = expandedCategory === category ? null : category;
                    setExpandedCategory(newCategory);
                    console.log('Setting expanded category to:', newCategory);

                    // Scroll to merchant breakdown section if expanding
                    if (newCategory) {
                      setTimeout(() => {
                        const element = document.getElementById('merchant-breakdown');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }, 100);
                    }
                  }}
                />
              </div>

              {/* Category Legend & Stats */}
              <div className="space-y-3">
                {spending_by_category.map((category, index) => {
                  const percentage = (category.total_spend / summary.total_spent) * 100;
                  const color = getCategoryColor(index);

                  return (
                    <div key={index} className="border border-[hsl(var(--border))] rounded-lg p-4 hover:border-[hsl(var(--primary))]/30 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                        <div className="flex-1">
                          <div className="font-display text-base font-semibold text-[hsl(var(--foreground))]">{category.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl font-bold text-[hsl(var(--foreground))]">${category.total_spend.toLocaleString()}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] ml-7">
                        {category.transaction_count} transactions · Avg ${category.average_transaction.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expandable Merchant Breakdown by Category */}
            <div id="merchant-breakdown" className="border-t border-[hsl(var(--border))] pt-6">
              <h3 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-4">Merchant Breakdown by Category</h3>
              <CategoryMerchantBreakdown
                categories={spending_by_category}
                merchants={top_merchants}
                expandedCategory={expandedCategory}
                setExpandedCategory={setExpandedCategory}
              />
            </div>
          </div>
        )}

        {/* Recurring Charges */}
        {recurring_charges.length > 0 && (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-[hsl(var(--warning))]/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">Recurring Charges</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-6 ml-14">
              Subscriptions and recurring payments detected
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {recurring_charges.map((charge, index) => (
                <div key={index} className="border border-[hsl(var(--border))] rounded-lg p-4 hover:border-[hsl(var(--primary))]/30 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-display text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
                        {charge.merchant_display}
                      </div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        ${charge.amount.toFixed(2)}/{charge.frequency}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {charge.occurrences} charges detected
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold text-[hsl(var(--destructive))]">
                        ${charge.estimated_annual_cost.toLocaleString()}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">per year</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recurring Summary */}
            <div className="bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">Total Recurring Spending</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">{recurring_summary.count} subscriptions</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold text-[hsl(var(--primary))]">
                    ${recurring_summary.total_monthly_cost.toFixed(2)}/month
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    ${recurring_summary.total_annual_cost.toLocaleString()}/year
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spending Breakdown */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-[hsl(var(--success))]/10 rounded-lg flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">Spending Overview</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Transaction Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted-foreground))]">Total Transactions:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{summary.total_transactions}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted-foreground))]">Debit Transactions:</span>
                  <span className="font-semibold text-[hsl(var(--destructive))]">{summary.debit_count}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[hsl(var(--muted-foreground))]">Credit Transactions:</span>
                  <span className="font-semibold text-[hsl(var(--success))]">{summary.credit_count}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Period Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted-foreground))]">Start Date:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{summary.period.start}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted-foreground))]">End Date:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{summary.period.end}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[hsl(var(--muted-foreground))]">Duration:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{summary.period.days} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleStartOver}
            className="px-8 py-4 bg-[hsl(var(--primary))] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            Analyze Another Period →
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-[hsl(var(--muted-foreground))] text-sm">
            ✓ All data processed locally - Nothing stored on servers
          </p>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">
            Want to export your data? Use browser dev tools to copy from localStorage
          </p>
        </div>
      </div>
    </div>
  );
}
