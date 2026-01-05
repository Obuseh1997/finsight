#!/usr/bin/env python3
"""
Calculate merchant normalization confidence scores

Confidence factors:
- Dictionary match (high confidence if merchant exists with many transactions)
- Pattern strength (strong patterns like "UBER" → "uber" are high confidence)
- Ambiguity detection (complex descriptions are low confidence)

Usage: python3 calculate_confidence.py <transactions-json> [--output scored.json] [--threshold 60]
"""

import sys
import json
import re
from typing import Dict, Any, List, Tuple
from merchant_dictionary import MerchantDictionary


def calculate_pattern_strength(description: str, normalized_merchant: str) -> int:
    """
    Calculate how strong the normalization pattern is.

    High strength (80-100): Clear, unambiguous merchant name
    Medium strength (50-79): Reasonable normalization but some noise
    Low strength (0-49): Ambiguous or complex description

    Returns:
        Score 0-100
    """
    if not description or not normalized_merchant:
        return 0

    description = description.upper()
    normalized = normalized_merchant.lower()

    score = 70  # Start at medium-high (more optimistic)

    # Auto-approve transfers (not merchants, always high confidence)
    transfer_patterns = ['interac', 'transfer', 'banking', 'payment', 'preauthorized']
    if any(pattern in normalized for pattern in transfer_patterns):
        return 95  # Auto-approve all transfers with high confidence

    # Strong patterns (boost confidence) - check NORMALIZED merchant, not description
    strong_merchants = [
        'uber', 'starbucks', 'tim', 'hortons', 'mcdonalds', 'amazon',
        'netflix', 'spotify', 'apple', 'google', 'walmart', 'target',
        'shoppers', 'loblaws', 'metro', 'food', 'basics', 'sobeys',
        'wealthsimple', 'goodlife', 'fitness', 'sportchek', 'marks',
        'rexall', 'pharmacy', 'lemonade', 'starbucks'
    ]

    # Check if any strong merchant appears in normalized merchant
    for merchant in strong_merchants:
        if merchant in normalized:
            score += 25  # Big boost for known merchants
            break

    # Boost for clean single-word merchants (likely correct)
    word_count = len(normalized.split())
    if word_count == 1 and len(normalized) >= 4:
        score += 15  # Clean, single-word merchant = high confidence

    # Penalties (reduce confidence)

    # Contains numbers (like "9KJJYE" - low confidence)
    if re.search(r'\d', normalized):
        score -= 25

    # Very short normalized merchant (< 3 chars) = probably noise
    if len(normalized) < 3:
        score -= 30

    # Too many words (> 4) = probably concatenated or unclear
    if word_count > 4:
        score -= 15 * (word_count - 4)

    # Check if normalized merchant is just stopwords/noise
    if normalized in ['unknown', 'debit', 'credit', 'purchase', 'payment', 'transfer']:
        score -= 40

    # Clamp to 0-100
    return max(0, min(100, score))


def calculate_dictionary_confidence(
    normalized_merchant: str,
    dictionary: MerchantDictionary
) -> Tuple[int, Dict[str, Any]]:
    """
    Calculate confidence based on dictionary match.

    Returns:
        (confidence_score, merchant_data or None)
    """
    merchant_data = dictionary.lookup(normalized_merchant)

    if not merchant_data:
        # Not in dictionary - low confidence
        return 0, None

    # In dictionary - confidence based on transaction history
    transaction_count = merchant_data.get('transaction_count', 0)

    if transaction_count >= 10:
        return 95, merchant_data
    elif transaction_count >= 5:
        return 85, merchant_data
    elif transaction_count >= 2:
        return 70, merchant_data
    else:
        # In dictionary but only 1 transaction (could be first occurrence)
        return 55, merchant_data


def calculate_merchant_confidence(
    transaction: Dict[str, Any],
    dictionary: MerchantDictionary = None
) -> Dict[str, Any]:
    """
    Calculate overall confidence score for a transaction's merchant normalization.

    Combines:
    - Dictionary match confidence (0-95)
    - Pattern strength confidence (0-100)

    Returns:
        Dict with confidence score and details
    """
    description = transaction.get('description', '')
    normalized_merchant = transaction.get('normalized_merchant', '')

    # Calculate pattern strength
    pattern_score = calculate_pattern_strength(description, normalized_merchant)

    # Calculate dictionary confidence
    dict_score = 0
    merchant_data = None
    in_dictionary = False

    if dictionary:
        dict_score, merchant_data = calculate_dictionary_confidence(
            normalized_merchant, dictionary
        )
        in_dictionary = merchant_data is not None

    # Weighted average: dictionary (60%) + pattern (40%)
    # Dictionary gets more weight because it's based on real usage
    if in_dictionary:
        overall_score = int(dict_score * 0.6 + pattern_score * 0.4)
    else:
        # No dictionary match - rely entirely on pattern
        overall_score = pattern_score

    # Determine confidence level
    if overall_score >= 80:
        confidence_level = 'high'
    elif overall_score >= 60:
        confidence_level = 'medium'
    else:
        confidence_level = 'low'

    return {
        'confidence_score': overall_score,
        'confidence_level': confidence_level,
        'in_dictionary': in_dictionary,
        'dictionary_score': dict_score,
        'pattern_score': pattern_score,
        'merchant_data': merchant_data
    }


def flag_low_confidence_transactions(
    transactions: List[Dict[str, Any]],
    dictionary: MerchantDictionary = None,
    threshold: int = 60
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Separate transactions into high/low confidence groups.

    Args:
        transactions: List of transactions
        dictionary: Merchant dictionary for lookups
        threshold: Confidence threshold (default 60)

    Returns:
        (low_confidence_transactions, high_confidence_transactions)
    """
    low_confidence = []
    high_confidence = []

    for txn in transactions:
        confidence_data = calculate_merchant_confidence(txn, dictionary)

        # Add confidence data to transaction
        txn_with_confidence = {
            **txn,
            'confidence': confidence_data
        }

        if confidence_data['confidence_score'] < threshold:
            low_confidence.append(txn_with_confidence)
        else:
            high_confidence.append(txn_with_confidence)

    return low_confidence, high_confidence


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 calculate_confidence.py <transactions-json> [--output scored.json] [--threshold 60]")
        print("Example: python3 calculate_confidence.py merged-statements.json --output scored-statements.json")
        sys.exit(1)

    # Parse arguments
    args = sys.argv[1:]
    input_path = args[0]
    output_path = input_path.replace('.json', '-scored.json')
    threshold = 60
    dictionary_path = 'merchant_dictionary.json'

    i = 1
    while i < len(args):
        if args[i] == '--output' and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        elif args[i] == '--threshold' and i + 1 < len(args):
            threshold = int(args[i + 1])
            i += 2
        elif args[i] == '--dictionary' and i + 1 < len(args):
            dictionary_path = args[i + 1]
            i += 2
        else:
            i += 1

    # Load transactions
    print(f"📄 Loading transactions from {input_path}...")
    with open(input_path, 'r') as f:
        data = json.load(f)

    transactions = data.get('transactions', [])
    print(f"✓ Loaded {len(transactions)} transactions")

    # Load dictionary
    print(f"\n📚 Loading merchant dictionary from {dictionary_path}...")
    try:
        dictionary = MerchantDictionary(dictionary_path)
        dict_stats = dictionary.get_stats()
        print(f"✓ Dictionary loaded: {dict_stats['unique_merchants']} merchants")
    except FileNotFoundError:
        print(f"⚠️  Dictionary not found, using pattern matching only")
        dictionary = None

    # Calculate confidence scores
    print(f"\n🔍 Calculating confidence scores (threshold: {threshold})...")
    low_confidence, high_confidence = flag_low_confidence_transactions(
        transactions, dictionary, threshold
    )

    print(f"✓ High confidence: {len(high_confidence)} transactions")
    print(f"✓ Low confidence: {len(low_confidence)} transactions")

    # Show low confidence examples
    if low_confidence:
        print(f"\n⚠️  Low confidence transactions (showing first 10):")
        print(f"{'Date':<10} | {'Merchant':<30} | {'Score':>5} | {'Reason'}")
        print("-" * 80)

        for txn in low_confidence[:10]:
            date = txn.get('date', 'N/A')[:10].ljust(10)
            merchant = (txn.get('merchant_display') or txn.get('normalized_merchant', 'Unknown'))[:30].ljust(30)
            score = txn['confidence']['confidence_score']
            level = txn['confidence']['confidence_level']

            # Determine reason
            if not txn['confidence']['in_dictionary']:
                reason = "Not in dictionary"
            elif txn['confidence']['pattern_score'] < 50:
                reason = "Weak pattern"
            else:
                reason = "Low usage"

            print(f"{date} | {merchant} | {score:>5} | {reason}")

        if len(low_confidence) > 10:
            print(f"... and {len(low_confidence) - 10} more")

    # Calculate confidence distribution
    confidence_levels = {
        'high': sum(1 for t in high_confidence if t['confidence']['confidence_level'] == 'high'),
        'medium': sum(1 for t in high_confidence if t['confidence']['confidence_level'] == 'medium'),
        'low': len(low_confidence)
    }

    # Save scored transactions
    output_data = {
        **data,
        'transactions': high_confidence + low_confidence,  # All transactions with confidence
        'confidence_stats': {
            'threshold': threshold,
            'high_confidence_count': len(high_confidence),
            'low_confidence_count': len(low_confidence),
            'confidence_distribution': confidence_levels,
            'needs_review': len(low_confidence)
        },
        'low_confidence_transactions': low_confidence  # Separate list for easy access
    }

    print(f"\n💾 Saving scored transactions to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"✓ Saved successfully")

    # Summary
    print("\n" + "="*50)
    print("📊 CONFIDENCE SUMMARY")
    print("="*50)
    print(f"Total transactions: {len(transactions)}")
    print(f"High confidence: {len(high_confidence)} ({len(high_confidence)/len(transactions)*100:.1f}%)")
    print(f"Low confidence: {len(low_confidence)} ({len(low_confidence)/len(transactions)*100:.1f}%)")
    print(f"\nConfidence distribution:")
    print(f"  High (80-100): {confidence_levels['high']}")
    print(f"  Medium (60-79): {confidence_levels['medium']}")
    print(f"  Low (0-59): {confidence_levels['low']}")
    print("="*50)


if __name__ == '__main__':
    main()
