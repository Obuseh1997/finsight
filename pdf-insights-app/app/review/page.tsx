'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStorage } from '@/lib/storage';
import { Transaction, StatementData } from '@/lib/types';

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

export default function ReviewPage() {
  const router = useRouter();
  const [scoredData, setScoredData] = useState<StatementData | null>(null);
  const [lowConfidence, setLowConfidence] = useState<Transaction[]>([]);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editedMerchant, setEditedMerchant] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [correctedMerchants, setCorrectedMerchants] = useState<Set<string>>(new Set());

  // Predefined spending categories
  const CATEGORIES = [
    'Groceries',
    'Dining & Restaurants',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Health & Wellness',
    'Utilities',
    'Housing',
    'Transfer',
    'Income',
    'Other'
  ];

  useEffect(() => {
    // Load scored data from localStorage
    const data = SessionStorage.getScoredData();

    if (!data) {
      // No data, redirect to home
      router.push('/');
      return;
    }

    setScoredData(data);
    // Only show debit transactions in review (exclude credits/income)
    const debitTransactions = (data.low_confidence_transactions || []).filter(t => t.type === 'debit');
    setLowConfidence(debitTransactions);
  }, [router]);

  // Categorize transaction by merchant name
  const categorizeTransaction = (merchant: string): 'transfer' | 'subscription' | 'merchant' => {
    const merchantLower = merchant.toLowerCase();

    // Transfers
    if (merchantLower.includes('transfer') ||
        merchantLower.includes('interac') ||
        merchantLower.includes('banking') ||
        merchantLower.includes('payment')) {
      return 'transfer';
    }

    // Subscriptions (common patterns)
    if (merchantLower.includes('spotify') ||
        merchantLower.includes('netflix') ||
        merchantLower.includes('subscription') ||
        merchantLower.includes('membership') ||
        merchantLower.includes('monthly')) {
      return 'subscription';
    }

    return 'merchant';
  };

  // Group transactions by normalized merchant (not description) to avoid duplicates
  const categorizedGroups = useMemo((): CategorizedGroups => {
    const groups = new Map<string, GroupedTransaction>();

    lowConfidence.forEach(txn => {
      // Use normalized_merchant as grouping key to group all transactions from same merchant
      // This prevents duplicates like "Adobe 1" and "Adobe 2" with different transaction IDs
      const groupKey = txn.normalized_merchant || txn.merchant_display || 'Unknown';
      const merchantDisplay = txn.merchant_display || txn.normalized_merchant || 'Unknown';

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          description: txn.description, // Keep first transaction's description for display
          transactions: [],
          merchant_display: merchantDisplay,
          total_amount: 0,
          count: 0,
          category: categorizeTransaction(merchantDisplay)
        });
      }

      const group = groups.get(groupKey)!;
      group.transactions.push(txn);
      group.total_amount += Math.abs(txn.amount);
      group.count++;
    });

    const allGroups = Array.from(groups.values());

    return {
      transfers: allGroups.filter(g => g.category === 'transfer').sort((a, b) => b.total_amount - a.total_amount),
      subscriptions: allGroups.filter(g => g.category === 'subscription').sort((a, b) => b.total_amount - a.total_amount),
      merchants: allGroups.filter(g => g.category === 'merchant').sort((a, b) => b.total_amount - a.total_amount),
    };
  }, [lowConfidence]);

  const handleConfirm = (normalizedMerchant: string) => {
    // Remove all transactions with this normalized merchant from low confidence list
    setLowConfidence(prev => prev.filter(t =>
      (t.normalized_merchant || t.merchant_display || 'Unknown') !== normalizedMerchant
    ));
  };

  const handleEdit = (normalizedMerchant: string, currentMerchant: string, currentCategory?: string) => {
    setEditingDescription(normalizedMerchant);
    setEditedMerchant(currentMerchant);
    setEditedCategory(currentCategory || '');
  };

  const handleSaveEdit = async (normalizedMerchantKey: string) => {
    // Validate: at least merchant OR category must be provided
    if (!editedMerchant.trim() && !editedCategory) {
      alert('Please provide either a merchant name or select a category');
      return;
    }

    // Find the first transaction with this normalized merchant to use as context
    const sampleTransaction = lowConfidence.find(txn =>
      (txn.normalized_merchant || txn.merchant_display || 'Unknown') === normalizedMerchantKey
    );

    // Calculate normalized merchant name
    const normalizedMerchant = editedMerchant.trim()
      ? editedMerchant.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      : sampleTransaction?.normalized_merchant || '';

    // Call API to learn from this merchant correction
    try {
      const response = await fetch('/api/learn-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          normalized_merchant: normalizedMerchant,
          canonical_name: editedMerchant.trim() || sampleTransaction?.merchant_display || '',
          category: editedCategory || undefined,
          transaction: sampleTransaction || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.warn('Failed to learn from merchant edit:', result.message || result.error);
        // Continue with UI update even if learning fails
      } else {
        console.log('Successfully learned from edit:', result.message);
      }
    } catch (error) {
      console.error('Error calling learn-merchant API:', error);
      // Continue with UI update even if API call fails
    }

    // Update ALL transactions with this normalized merchant
    const updated = lowConfidence.map(txn => {
      const txnKey = txn.normalized_merchant || txn.merchant_display || 'Unknown';
      if (txnKey === normalizedMerchantKey) {
        return {
          ...txn,
          merchant_display: editedMerchant.trim() || txn.merchant_display,
          normalized_merchant: normalizedMerchant || txn.normalized_merchant,
          category: editedCategory || txn.category
        };
      }
      return txn;
    });

    setLowConfidence(updated);

    // Mark this merchant as corrected
    setCorrectedMerchants(prev => new Set(prev).add(normalizedMerchantKey));

    setEditingDescription(null);
    setEditedMerchant('');
    setEditedCategory('');
  };

  const handleCancelEdit = () => {
    setEditingDescription(null);
    setEditedMerchant('');
    setEditedCategory('');
  };

  const handleExclude = (normalizedMerchant: string) => {
    // Remove all transactions with this normalized merchant
    setLowConfidence(prev => prev.filter(t =>
      (t.normalized_merchant || t.merchant_display || 'Unknown') !== normalizedMerchant
    ));
  };

  const handleContinue = () => {
    // Update localStorage with confirmed changes
    if (scoredData) {
      // Update ALL transactions in scored data (not just low confidence)
      const updatedTransactions = scoredData.transactions.map(txn => {
        // Find if this transaction was edited in lowConfidence (match by normalized merchant)
        const txnKey = txn.normalized_merchant || txn.merchant_display || 'Unknown';
        const edited = lowConfidence.find(lc => {
          const lcKey = lc.normalized_merchant || lc.merchant_display || 'Unknown';
          return lcKey === txnKey &&
            lc.merchant_display !== txn.merchant_display;
        });

        if (edited) {
          return {
            ...txn,
            merchant_display: edited.merchant_display,
            normalized_merchant: edited.normalized_merchant
          };
        }
        return txn;
      });

      const updatedData = {
        ...scoredData,
        transactions: updatedTransactions,
        low_confidence_transactions: lowConfidence
      };
      SessionStorage.saveScoredData(updatedData);
    }

    // Navigate to insights page
    router.push('/insights');
  };

  const handleSkip = () => {
    // Skip review, go straight to insights
    router.push('/insights');
  };

  if (!scoredData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
        </div>
      </div>
    );
  }

  const totalTransactions = scoredData.transactions?.length || 0;
  const highConfidence = totalTransactions - lowConfidence.length;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-8 animate-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-[hsl(var(--foreground))] tracking-tight">
              Review Transactions
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] text-lg">
            We found {totalTransactions} transactions. Please review {categorizedGroups.transfers.length + categorizedGroups.subscriptions.length + categorizedGroups.merchants.length} unique descriptions that need your attention.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-3xl font-bold text-[hsl(var(--success))] mb-1">{highConfidence}</div>
            <div className="text-sm font-medium text-[hsl(var(--foreground))]">High Confidence</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Auto-approved ✓</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-3xl font-bold text-[hsl(var(--primary))] mb-1">{categorizedGroups.transfers.length}</div>
            <div className="text-sm font-medium text-[hsl(var(--foreground))]">Transfers</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Bank transfers & payments</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-3xl font-bold text-[hsl(var(--warning))] mb-1">{categorizedGroups.subscriptions.length}</div>
            <div className="text-sm font-medium text-[hsl(var(--foreground))]">Subscriptions</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Recurring charges</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm">
            <div className="text-3xl font-bold text-[hsl(var(--chart-2))] mb-1">{categorizedGroups.merchants.length}</div>
            <div className="text-sm font-medium text-[hsl(var(--foreground))]">Merchants</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Store purchases</div>
          </div>
        </div>

        {/* Helper function to render transaction groups */}
        {(() => {
          const renderTransactionGroup = (group: GroupedTransaction, isPriority: boolean = false) => {
            const groupKey = group.transactions[0]?.normalized_merchant || group.merchant_display || 'Unknown';
            const isEditing = editingDescription === groupKey;

            return (
              <div
                key={group.description}
                className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                  isPriority
                    ? 'border-red-500/50 bg-red-500/5 hover:border-red-500'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {/* Count Badge */}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                        {group.count} transaction{group.count > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                        ${group.total_amount.toFixed(2)} total
                      </span>
                    </div>

                    {/* Merchant Name & Category */}
                    {isEditing ? (
                      <div className="space-y-3 mb-2">
                        {/* Bulk Assignment Hint */}
                        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-600 dark:text-blue-400">
                          💡 Categorizing this merchant will apply to all {group.count} transaction{group.count > 1 ? 's' : ''}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                            Merchant Name: <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional if category selected)</span>
                          </label>
                          <input
                            type="text"
                            value={editedMerchant}
                            onChange={(e) => setEditedMerchant(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-[hsl(var(--primary))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] font-medium"
                            placeholder="Enter merchant name"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                            Category: <span className="text-[hsl(var(--muted-foreground))] font-normal">(required if no merchant)</span>
                          </label>
                          <select
                            value={editedCategory}
                            onChange={(e) => setEditedCategory(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] font-medium"
                          >
                            <option value="">-- Select Category --</option>
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-1">
                        {/* Merchant Name with Confidence Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">
                            {group.merchant_display}
                          </p>
                          {group.transactions[0]?.matched ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium">
                              ⚠ Needs Review
                            </span>
                          )}
                        </div>

                        {/* Category Badge */}
                        {group.transactions[0]?.category && (
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-medium">
                              {group.transactions[0].category}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Original Description - Show FULL unscrubbed version for unmatched */}
                    <div className="mb-4 p-4 bg-[hsl(var(--muted))]/50 rounded-lg border-2 border-[hsl(var(--primary))]/20">
                      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                        {group.transactions[0]?.matched ? 'Bank Transaction' : 'Full Original Transaction (Unscrubbed)'}
                      </p>
                      <p className="text-sm font-mono text-[hsl(var(--foreground))] leading-relaxed">
                        {group.transactions[0]?.original_description || group.description}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                        {group.transactions[0]?.matched
                          ? 'Verified merchant - description may be simplified'
                          : 'Full unscrubbed transaction - use this to accurately categorize'}
                      </p>
                    </div>

                    {/* Transaction Dates */}
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Dates: {group.transactions.slice(0, 5).map(t => t.date).join(', ')}
                      {group.count > 5 && ` + ${group.count - 5} more`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(group.transactions[0]?.normalized_merchant || group.merchant_display || 'Unknown')}
                          className="px-4 py-2 bg-[hsl(var(--success))] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all"
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm font-semibold rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Check if this merchant has been corrected */}
                        {correctedMerchants.has(groupKey) ? (
                          // CORRECTED STATE - Muted styling
                          <div className="flex flex-col space-y-2">
                            <div className="px-4 py-2 bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] text-sm font-semibold rounded-lg border border-[hsl(var(--success))]/30 text-center">
                              ✓ Corrected
                            </div>
                            <button
                              onClick={() => handleEdit(groupKey, group.merchant_display, group.transactions[0]?.category)}
                              className="px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-sm font-semibold rounded-lg hover:opacity-80 transition-all"
                              title="Edit this correction"
                            >
                              Edit Again
                            </button>
                          </div>
                        ) : (
                          // UNCORRECTED STATE - Original buttons
                          <>
                            <button
                              onClick={() => handleConfirm(groupKey)}
                              className="px-4 py-2 bg-[hsl(var(--success))] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all"
                              title="Confirm this merchant name is correct"
                            >
                              ✓ Correct
                            </button>
                            <button
                              onClick={() => handleEdit(groupKey, group.merchant_display, group.transactions[0]?.category)}
                              className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all"
                              title="Edit merchant name for all similar transactions"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleExclude(groupKey)}
                              className="px-4 py-2 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-sm font-semibold rounded-lg hover:bg-[hsl(var(--destructive))]/20 transition-all"
                              title="Exclude all similar transactions from analysis"
                            >
                              🗑️ Exclude
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          const totalGroups = categorizedGroups.transfers.length + categorizedGroups.subscriptions.length + categorizedGroups.merchants.length;

          // Get priority transactions (high-value with unknown/missing categories)
          const PRIORITY_THRESHOLD = 100;
          const priorityMerchants = categorizedGroups.merchants.filter(group => {
            // Include if:
            // 1. Merchant is "Unknown" OR
            // 2. Category is missing/Other/Uncategorized
            // AND total amount >= $100
            const hasUnknownCategory = !group.transactions[0]?.category ||
                                       group.transactions[0]?.category === 'Other' ||
                                       group.transactions[0]?.category === 'Uncategorized';
            return hasUnknownCategory && group.total_amount >= PRIORITY_THRESHOLD;
          }).sort((a, b) => b.total_amount - a.total_amount);

          return totalGroups > 0 ? (
            <div className="space-y-6">
              {/* Priority Section - High-Value Unknown Transactions */}
              {priorityMerchants.length > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl border-2 border-red-500/30 shadow-md p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">
                      Priority Review
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-700 dark:text-red-300">
                      {priorityMerchants.length} high-value
                    </span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    These transactions are over ${PRIORITY_THRESHOLD} each and need categorization. Once categorized, the learning model will auto-assign future similar transactions for all users.
                  </p>
                  <div className="space-y-4">
                    {priorityMerchants.map(group => renderTransactionGroup(group, true))}
                  </div>
                </div>
              )}

              {/* Transfers Section */}
              {categorizedGroups.transfers.length > 0 && (
                <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8">
                  <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                    <span>🔄</span> Transfers & Payments
                  </h2>
                  <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    {categorizedGroups.transfers.length} transfer{categorizedGroups.transfers.length > 1 ? 's' : ''} · These are typically bank transfers, Interac, or online payments
                  </p>
                  <div className="space-y-4">
                    {categorizedGroups.transfers.map(renderTransactionGroup)}
                  </div>
                </div>
              )}

              {/* Subscriptions Section */}
              {categorizedGroups.subscriptions.length > 0 && (
                <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8">
                  <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                    <span>📱</span> Subscriptions
                  </h2>
                  <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    {categorizedGroups.subscriptions.length} subscription{categorizedGroups.subscriptions.length > 1 ? 's' : ''} · Recurring charges for services
                  </p>
                  <div className="space-y-4">
                    {categorizedGroups.subscriptions.map(renderTransactionGroup)}
                  </div>
                </div>
              )}

              {/* Merchants Section */}
              {categorizedGroups.merchants.length > 0 && (
                <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8">
                  <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                    <span>🏪</span> Merchant Purchases
                  </h2>
                  <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    {categorizedGroups.merchants.length} merchant{categorizedGroups.merchants.length > 1 ? 's' : ''} · Store and online purchases
                  </p>
                  <div className="space-y-4">
                    {categorizedGroups.merchants.map(renderTransactionGroup)}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8">
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-semibold rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-all"
                  >
                    Skip Review
                  </button>
                  <button
                    onClick={handleContinue}
                    className="px-8 py-3 bg-[hsl(var(--success))] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-sm"
                  >
                    Continue to Insights →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-12 text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                All Transactions Confirmed!
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                All merchants have high confidence scores. No review needed.
              </p>
              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-[hsl(var(--success))] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                View Insights →
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
