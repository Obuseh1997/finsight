#!/usr/bin/env python3
"""
Match transactions to merchant dictionary
Applies dictionary lookups to add merchant_id and category

Usage: python3 match_merchants.py <transactions-json> [output-json] [dictionary-path]
"""

import sys
import json
from merchant_dictionary import MerchantDictionary, match_transactions_to_dictionary


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 match_merchants.py <transactions-json> [output-json] [dictionary-path]")
        print("Example: python3 match_merchants.py scrubbed-transactions.json matched-transactions.json")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.json', '-matched.json')
    dictionary_path = sys.argv[3] if len(sys.argv) > 3 else 'merchant_dictionary.json'

    # Load dictionary
    print(f"📚 Loading dictionary from {dictionary_path}...")
    dictionary = MerchantDictionary(dictionary_path)

    dict_stats = dictionary.get_stats()
    print(f"✓ Loaded dictionary: {dict_stats['unique_merchants']} merchants, {dict_stats['total_aliases']} aliases")

    # Load transactions
    print(f"\n📄 Loading transactions from {input_path}...")
    with open(input_path, 'r') as f:
        data = json.load(f)

    transactions = data.get('transactions', [])
    print(f"✓ Loaded {len(transactions)} transactions")

    # Match transactions
    print(f"\n🔍 Matching transactions to dictionary...")
    matched_transactions = match_transactions_to_dictionary(transactions, dictionary)

    # Calculate match rate
    matched_count = sum(1 for t in matched_transactions if t.get('matched', False))
    match_rate = (matched_count / len(matched_transactions) * 100) if matched_transactions else 0

    print(f"✓ Matched {matched_count}/{len(matched_transactions)} transactions ({match_rate:.1f}%)")

    # Find unmatched
    unmatched_merchants = set()
    for t in matched_transactions:
        if not t.get('matched', False):
            normalized = t.get('normalized_merchant', '')
            if normalized and normalized != 'unknown':
                unmatched_merchants.add(normalized)

    if unmatched_merchants:
        print(f"\n⚠ {len(unmatched_merchants)} unmatched merchants:")
        for merchant in sorted(unmatched_merchants)[:10]:
            print(f"  - {merchant}")
        if len(unmatched_merchants) > 10:
            print(f"  ... and {len(unmatched_merchants) - 10} more")

    # Save matched transactions
    output_data = {
        **data,
        'transactions': matched_transactions,
        'matching_stats': {
            'matched_count': matched_count,
            'unmatched_count': len(matched_transactions) - matched_count,
            'match_rate': match_rate,
            'dictionary_path': dictionary_path
        }
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\n✓ Matched transactions saved to {output_path}")

    # Show category breakdown
    category_stats = {}
    category_spend = {}
    for t in matched_transactions:
        category = t.get('category', 'Uncategorized')
        category_stats[category] = category_stats.get(category, 0) + 1

        amount = t.get('amount', 0)
        if amount < 0:  # Debit
            category_spend[category] = category_spend.get(category, 0) + abs(amount)

    print(f"\n📊 Spending by category:")
    print(f"{'Category':<25} | {'Count':>6} | {'Total Spend':>12}")
    print("-" * 50)
    for category in sorted(category_spend.keys(), key=lambda x: category_spend[x], reverse=True):
        count = category_stats[category]
        spend = category_spend[category]
        print(f"{category:<25} | {count:>6} | ${spend:>11.2f}")

    # Save updated dictionary (with updated stats)
    dictionary.save()
    print(f"\n✓ Dictionary stats updated and saved")


if __name__ == '__main__':
    main()
