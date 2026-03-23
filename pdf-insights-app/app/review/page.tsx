'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStorage } from '@/lib/storage';
import { Transaction, StatementData } from '@/lib/types';
import { AppHeader } from '@/components/AppHeader';

interface GroupedTransaction {
  description: string;
  transactions: Transaction[];
  merchant_display: string;
  total_amount: number;
  count: number;
  category: 'transfer' | 'subscription' | 'merchant';
}

interface CategorizedGroups {
  transfers: GroupedTransaction[];
  subscriptions: GroupedTransaction[];
  merchants: GroupedTransaction[];
}

// ── Transaction group card ─────────────────────────────────────────
function TransactionGroupCard({
  group,
  isPriority,
  isEditing,
  editedMerchant,
  editedCategory,
  isCorrected,
  categories,
  onEdit,
  onConfirm,
  onExclude,
  onSave,
  onCancel,
  onMerchantChange,
  onCategoryChange,
}: {
  group: GroupedTransaction;
  isPriority: boolean;
  isEditing: boolean;
  editedMerchant: string;
  editedCategory: string;
  isCorrected: boolean;
  categories: string[];
  onEdit: () => void;
  onConfirm: () => void;
  onExclude: () => void;
  onSave: () => void;
  onCancel: () => void;
  onMerchantChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isPriority
          ? 'border-[hsl(0,84%,60%)]/40 bg-[hsl(0,84%,60%)]/5'
          : isCorrected
          ? 'border-[hsl(142,71%,45%)]/30 bg-[hsl(142,71%,45%)]/5'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-lg px-3 py-2">
                Changes will apply to all {group.count} transaction{group.count > 1 ? 's' : ''} from this merchant.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1">
                  Merchant Name <span className="font-normal">(optional if category set)</span>
                </label>
                <input
                  type="text"
                  value={editedMerchant}
                  onChange={(e) => onMerchantChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-[hsl(var(--primary))] rounded-lg bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none"
                  placeholder="Enter merchant name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1">
                  Category
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]"
                >
                  <option value="">— Select category —</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-semibold text-[hsl(var(--foreground))]">
                  {group.merchant_display}
                </p>
                {group.transactions[0]?.matched ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[hsl(43,74%,66%)]/20 text-[hsl(32,95%,40%)] font-medium">
                    Needs review
                  </span>
                )}
                {isCorrected && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] font-medium">
                    Corrected
                  </span>
                )}
                {group.transactions[0]?.category && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium">
                    {group.transactions[0].category}
                  </span>
                )}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {group.count} transaction{group.count > 1 ? 's' : ''} · ${group.total_amount.toFixed(2)} total
              </p>
            </>
          )}
        </div>
      </div>

      {/* Raw transaction detail (collapsed) */}
      {!isEditing && (
        <details className="mb-3 group/detail">
          <summary className="cursor-pointer text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors select-none list-none flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 transition-transform group-open/detail:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Raw transaction
          </summary>
          <div className="mt-2 px-3 py-2.5 bg-[hsl(var(--muted))]/40 rounded-lg border border-[hsl(var(--border))]/60 animate-slide-in">
            <p className="text-xs font-mono text-[hsl(var(--foreground))] leading-relaxed break-all">
              {group.transactions[0]?.description || group.description}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
              Dates: {group.transactions.slice(0, 5).map((t) => t.date).join(', ')}
              {group.count > 5 ? ` + ${group.count - 5} more` : ''}
            </p>
          </div>
        </details>
      )}

      {/* Actions */}
      {isEditing ? (
        <div className="flex gap-2 mt-1">
          <button
            onClick={onSave}
            className="flex-1 py-2 bg-[hsl(142,71%,45%)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm font-semibold rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : isCorrected ? (
        <div className="flex gap-2">
          <div className="flex-1 py-1.5 text-center text-xs font-semibold text-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10 rounded-lg border border-[hsl(142,71%,45%)]/20">
            ✓ Corrected
          </div>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/50 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Edit again
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-1.5 bg-[hsl(142,71%,45%)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            ✓ Correct
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Edit
          </button>
          <button
            onClick={onExclude}
            className="flex-1 py-1.5 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-xs font-semibold rounded-lg hover:bg-[hsl(var(--destructive))]/20 transition-colors"
          >
            Exclude
          </button>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-6">
      <h2 className="font-display text-lg font-bold text-[hsl(var(--foreground))] mb-1">{title}</h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        {count} item{count !== 1 ? 's' : ''}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
const CATEGORIES = [
  'Groceries', 'Dining & Restaurants', 'Transportation', 'Entertainment',
  'Shopping', 'Health & Wellness', 'Utilities', 'Housing',
  'Transfer', 'Income', 'Other',
];

export default function ReviewPage() {
  const router = useRouter();
  const [scoredData, setScoredData] = useState<StatementData | null>(null);
  const [lowConfidence, setLowConfidence] = useState<Transaction[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedMerchant, setEditedMerchant] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [correctedMerchants, setCorrectedMerchants] = useState<Set<string>>(new Set());
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    const data = SessionStorage.getScoredData();
    if (!data) { router.push('/'); return; }
    setScoredData(data);
    const debitTxns = (data.low_confidence_transactions || []).filter((t: Transaction) => t.type === 'debit');
    setLowConfidence(debitTxns);
  }, [router]);

  const categorizeTransaction = (merchant: string): 'transfer' | 'subscription' | 'merchant' => {
    const m = merchant.toLowerCase();
    if (m.includes('transfer') || m.includes('interac') || m.includes('banking') || m.includes('payment')) return 'transfer';
    if (m.includes('spotify') || m.includes('netflix') || m.includes('subscription') || m.includes('membership') || m.includes('monthly')) return 'subscription';
    return 'merchant';
  };

  const categorizedGroups = useMemo((): CategorizedGroups => {
    const map = new Map<string, GroupedTransaction>();
    lowConfidence.forEach((txn) => {
      const key = txn.normalized_merchant || txn.merchant_display || 'Unknown';
      const display = txn.merchant_display || txn.normalized_merchant || 'Unknown';
      if (!map.has(key)) {
        map.set(key, { description: txn.description, transactions: [], merchant_display: display, total_amount: 0, count: 0, category: categorizeTransaction(display) });
      }
      const g = map.get(key)!;
      g.transactions.push(txn);
      g.total_amount += Math.abs(txn.amount);
      g.count++;
    });
    const all = Array.from(map.values());
    return {
      transfers: all.filter((g) => g.category === 'transfer').sort((a, b) => b.total_amount - a.total_amount),
      subscriptions: all.filter((g) => g.category === 'subscription').sort((a, b) => b.total_amount - a.total_amount),
      merchants: all.filter((g) => g.category === 'merchant').sort((a, b) => b.total_amount - a.total_amount),
    };
  }, [lowConfidence]);

  const totalGroups =
    categorizedGroups.transfers.length +
    categorizedGroups.subscriptions.length +
    categorizedGroups.merchants.length;

  const getGroupKey = (g: GroupedTransaction) =>
    g.transactions[0]?.normalized_merchant || g.merchant_display || 'Unknown';

  const handleConfirm = (key: string) => {
    setLowConfidence((prev) => prev.filter((t) => (t.normalized_merchant || t.merchant_display || 'Unknown') !== key));
    setReviewed((n) => n + 1);
  };

  const handleEdit = (key: string, merchant: string, category?: string) => {
    setEditingKey(key);
    setEditedMerchant(merchant);
    setEditedCategory(category || '');
  };

  const handleSave = async (key: string) => {
    if (!editedMerchant.trim() && !editedCategory) {
      alert('Please provide either a merchant name or select a category');
      return;
    }
    const sample = lowConfidence.find((t) => (t.normalized_merchant || t.merchant_display || 'Unknown') === key);
    const normalized = editedMerchant.trim()
      ? editedMerchant.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      : sample?.normalized_merchant || '';

    try {
      const res = await fetch('/api/learn-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normalized_merchant: normalized,
          canonical_name: editedMerchant.trim() || sample?.merchant_display || '',
          category: editedCategory || undefined,
          transaction: sample || undefined,
        }),
      });
      if (!res.ok) console.warn('learn-merchant failed:', await res.json());
    } catch (err) {
      console.error('learn-merchant error:', err);
    }

    setLowConfidence((prev) =>
      prev.map((t) => {
        const tKey = t.normalized_merchant || t.merchant_display || 'Unknown';
        if (tKey !== key) return t;
        return {
          ...t,
          merchant_display: editedMerchant.trim() || t.merchant_display,
          normalized_merchant: normalized || t.normalized_merchant,
          category: editedCategory || t.category,
        };
      })
    );
    setCorrectedMerchants((prev) => new Set(prev).add(key));
    setReviewed((n) => n + 1);
    setEditingKey(null);
    setEditedMerchant('');
    setEditedCategory('');
  };

  const handleExclude = (key: string) => {
    setLowConfidence((prev) => prev.filter((t) => (t.normalized_merchant || t.merchant_display || 'Unknown') !== key));
    setReviewed((n) => n + 1);
  };

  const handleContinue = () => {
    if (scoredData) {
      const updated = scoredData.transactions.map((t) => {
        const tKey = t.normalized_merchant || t.merchant_display || 'Unknown';
        const edited = lowConfidence.find((lc) => {
          const lcKey = lc.normalized_merchant || lc.merchant_display || 'Unknown';
          return lcKey === tKey && lc.merchant_display !== t.merchant_display;
        });
        return edited ? { ...t, merchant_display: edited.merchant_display, normalized_merchant: edited.normalized_merchant } : t;
      });
      SessionStorage.saveScoredData({ ...scoredData, transactions: updated, low_confidence_transactions: lowConfidence });
    }
    router.push('/insights');
  };

  if (!scoredData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--primary))] mx-auto mb-4" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
        </div>
      </div>
    );
  }

  const totalTxns = scoredData.transactions?.length || 0;
  const highConf = totalTxns - lowConfidence.length;
  const initialTotal = totalGroups + reviewed;
  const progressPct = initialTotal > 0 ? Math.round((reviewed / initialTotal) * 100) : 100;

  const PRIORITY_THRESHOLD = 100;
  const priorityMerchants = categorizedGroups.merchants.filter((g) => {
    const unknownCat = !g.transactions[0]?.category || g.transactions[0]?.category === 'Other' || g.transactions[0]?.category === 'Uncategorized';
    return unknownCat && g.total_amount >= PRIORITY_THRESHOLD;
  }).sort((a, b) => b.total_amount - a.total_amount);

  const makeCardProps = (group: GroupedTransaction) => {
    const key = getGroupKey(group);
    return {
      group,
      isPriority: priorityMerchants.includes(group),
      isEditing: editingKey === key,
      editedMerchant,
      editedCategory,
      isCorrected: correctedMerchants.has(key),
      categories: CATEGORIES,
      onEdit: () => handleEdit(key, group.merchant_display, group.transactions[0]?.category),
      onConfirm: () => handleConfirm(key),
      onExclude: () => handleExclude(key),
      onSave: () => handleSave(key),
      onCancel: () => { setEditingKey(null); setEditedMerchant(''); setEditedCategory(''); },
      onMerchantChange: setEditedMerchant,
      onCategoryChange: setEditedCategory,
    };
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <AppHeader currentStep={2} />

      <main className="max-w-5xl mx-auto px-6 py-8 animate-in">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
            Review Transactions
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
            {totalTxns} transactions found · {totalGroups + reviewed > 0 ? `${totalGroups} group${totalGroups !== 1 ? 's' : ''} to review` : 'all reviewed'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'High Confidence', value: highConf, color: 'hsl(142,71%,45%)', sub: 'Auto-approved' },
            { label: 'Transfers', value: categorizedGroups.transfers.length, color: 'hsl(221,83%,53%)', sub: 'Bank payments' },
            { label: 'Subscriptions', value: categorizedGroups.subscriptions.length, color: 'hsl(43,74%,55%)', sub: 'Recurring' },
            { label: 'Merchants', value: categorizedGroups.merchants.length, color: 'hsl(262,83%,58%)', sub: 'Store purchases' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]/60 p-4 shadow-sm">
              <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {initialTotal > 0 && (
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]/60 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Review Progress</p>
              <p className="text-sm font-bold text-[hsl(var(--primary))]">{progressPct}%</p>
            </div>
            <div className="w-full bg-[hsl(var(--border))] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
              {reviewed} of {initialTotal} group{initialTotal !== 1 ? 's' : ''} reviewed
            </p>
          </div>
        )}

        {totalGroups > 0 ? (
          <div className="space-y-6">
            {/* Priority section */}
            {priorityMerchants.length > 0 && (
              <div className="bg-[hsl(0,84%,60%)]/5 border-2 border-[hsl(0,84%,60%)]/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-lg font-bold text-[hsl(var(--foreground))]">Priority Review</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[hsl(0,84%,60%)]/15 text-[hsl(0,74%,45%)]">
                    {priorityMerchants.length} high-value
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  These uncategorised transactions are over ${PRIORITY_THRESHOLD} each and will most impact your insights.
                </p>
                <div className="space-y-3">
                  {priorityMerchants.map((g) => (
                    <TransactionGroupCard key={getGroupKey(g)} {...makeCardProps(g)} />
                  ))}
                </div>
              </div>
            )}

            {categorizedGroups.transfers.length > 0 && (
              <Section title="Transfers & Payments" count={categorizedGroups.transfers.length}>
                {categorizedGroups.transfers.map((g) => (
                  <TransactionGroupCard key={getGroupKey(g)} {...makeCardProps(g)} />
                ))}
              </Section>
            )}

            {categorizedGroups.subscriptions.length > 0 && (
              <Section title="Subscriptions" count={categorizedGroups.subscriptions.length}>
                {categorizedGroups.subscriptions.map((g) => (
                  <TransactionGroupCard key={getGroupKey(g)} {...makeCardProps(g)} />
                ))}
              </Section>
            )}

            {categorizedGroups.merchants.length > 0 && (
              <Section title="Merchant Purchases" count={categorizedGroups.merchants.length}>
                {categorizedGroups.merchants.map((g) => (
                  <TransactionGroupCard key={getGroupKey(g)} {...makeCardProps(g)} />
                ))}
              </Section>
            )}

            {/* Actions footer */}
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => router.push('/insights')}
                className="text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                Skip Review
              </button>
              <button
                onClick={handleContinue}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[hsl(142,71%,45%)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                View Insights
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-[hsl(142,71%,45%)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[hsl(142,71%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-2">
              All transactions confirmed
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              All merchants have high confidence scores — no review needed.
            </p>
            <button
              onClick={handleContinue}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[hsl(142,71%,45%)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              View Insights
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
