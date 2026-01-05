#!/usr/bin/env python3
"""
Build merchant dictionary from extracted transactions
Analyzes transactions and creates initial dictionary entries

Usage: python3 build_dictionary.py <transactions-json> [dictionary-output]
"""

import sys
import json
from collections import defaultdict
from typing import Dict, Any, List
from merchant_dictionary import MerchantDictionary


def analyze_merchants(transactions: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Analyze normalized merchants from transactions.
    Returns merchant statistics for building dictionary.
    """
    merchants = defaultdict(lambda: {
        'count': 0,
        'total_debit': 0.0,
        'total_credit': 0.0,
        'display_names': set(),
        'descriptions': []
    })

    for t in transactions:
        normalized = t.get('normalized_merchant', '')
        if not normalized or normalized == 'unknown':
            continue

        display = t.get('merchant_display', normalized.title())
        desc = t.get('description', '')
        amount = t.get('amount', 0)

        merchants[normalized]['count'] += 1
        merchants[normalized]['display_names'].add(display)
        merchants[normalized]['descriptions'].append(desc[:60])

        if amount < 0:
            merchants[normalized]['total_debit'] += abs(amount)
        else:
            merchants[normalized]['total_credit'] += amount

    return merchants


def suggest_category(normalized_merchant: str, display_name: str) -> str:
    """
    Rule-based category suggestion with seed dictionary lookup.
    Checks seed dictionary first, then falls back to pattern matching.
    """
    # Layer 1: Check seed dictionary
    try:
        import json
        with open('seed_merchant_dictionary.json', 'r') as f:
            seed_dict = json.load(f)
            if normalized_merchant in seed_dict:
                return seed_dict[normalized_merchant]['category']
    except (FileNotFoundError, json.JSONDecodeError):
        pass  # If seed dictionary doesn't exist or is invalid, continue to pattern matching

    # Layer 2: Pattern matching for common terms
    merchant_lower = normalized_merchant.lower()
    display_lower = display_name.lower()

    # Combine both for better matching
    search_text = f"{merchant_lower} {display_lower}"

    # Investments (NEW - addresses user's "Unknown" issue)
    if any(term in search_text for term in ['wealthsimple', 'questrade', 'investing', 'securities', 'investment', 'brokerage', 'tfsa', 'rrsp']):
        return 'Investments'

    # Transfers (separate from investments)
    if any(term in search_text for term in ['internal transfer', 'interac', 'e-transfer', 'etransfer']):
        return 'Transfers'

    # Groceries (specific category for food stores)
    if any(term in search_text for term in ['food basics', 'loblaws', 'metro', 'sobeys', 'no frills', 'freshco', 'costco', 'grocery', 'supermarket']):
        return 'Groceries'

    # Food Delivery (NEW - separate from Dining)
    if any(term in search_text for term in ['skipthedishes', 'skip the dishes', 'doordash', 'uber eats', 'ubereats', 'food delivery']):
        return 'Food Delivery'

    # Dining (restaurants, cafes, fast food)
    if any(term in search_text for term in ['starbucks', 'tim hortons', 'mcdonalds', 'subway', 'restaurant', 'coffee', 'pizza', 'burger', 'cafe', 'thai express', 'chipotle']):
        return 'Dining'

    # Digital Services (NEW - apps, software, cloud)
    if any(term in search_text for term in ['apple.com', 'apple bill', 'adobe', 'microsoft', 'google', 'icloud', 'dropbox', 'zoom']):
        return 'Digital Services'

    # Transportation
    if any(term in search_text for term in ['uber', 'lyft', 'taxi', 'transit', 'ttc', 'presto', 'go transit', 'parking', 'petro', 'esso', 'shell', 'gas']):
        return 'Transportation'

    # Health & Fitness
    if any(term in search_text for term in ['goodlife', 'fitness', 'gym', 'yoga', 'shoppers drug', 'pharmacy', 'rexall', 'medical', 'dental', 'doctor']):
        return 'Health & Fitness'

    # Shopping
    if any(term in search_text for term in ['walmart', 'amazon', 'canadian tire', 'dollarama', 'best buy', 'ikea', 'winners', 'marshalls', 'bay', 'gap', 'old navy', 'zara', 'h&m', 'uniqlo']):
        return 'Shopping'

    # Subscriptions
    if any(term in search_text for term in ['spotify', 'netflix', 'amazon prime', 'disney', 'apple music', 'youtube premium']):
        return 'Subscriptions'

    # Utilities
    if any(term in search_text for term in ['rogers', 'bell', 'telus', 'fido', 'freedom', 'hydro', 'enbridge', 'electric', 'internet', 'phone', 'mobile']):
        return 'Utilities'

    # Travel
    if any(term in search_text for term in ['expedia', 'booking', 'airbnb', 'air canada', 'westjet', 'hotel', 'airline']):
        return 'Travel'

    # Entertainment
    if any(term in search_text for term in ['cineplex', 'movie', 'theatre', 'game', 'concert']):
        return 'Entertainment'

    # Alcohol & Tobacco
    if any(term in search_text for term in ['lcbo', 'beer store', 'liquor', 'wine', 'alcohol']):
        return 'Alcohol & Tobacco'

    return 'Uncategorized'


def build_dictionary_from_transactions(transactions_file: str,
                                       dictionary_path: str = 'merchant_dictionary.json',
                                       min_transaction_count: int = 1) -> MerchantDictionary:
    """
    Build merchant dictionary from transaction file.

    Args:
        transactions_file: Path to JSON file with transactions
        dictionary_path: Path to save dictionary
        min_transaction_count: Minimum transactions to include merchant

    Returns:
        MerchantDictionary instance
    """
    # Load transactions
    with open(transactions_file, 'r') as f:
        data = json.load(f)

    transactions = data.get('transactions', [])

    print(f"📊 Analyzing {len(transactions)} transactions...")

    # Analyze merchants
    merchant_stats = analyze_merchants(transactions)

    # Filter by minimum count
    merchant_stats = {
        k: v for k, v in merchant_stats.items()
        if v['count'] >= min_transaction_count
    }

    print(f"📈 Found {len(merchant_stats)} unique merchants (min {min_transaction_count} transactions)")

    # Create dictionary
    dictionary = MerchantDictionary(dictionary_path)

    # Sort by transaction count (most common first)
    sorted_merchants = sorted(
        merchant_stats.items(),
        key=lambda x: x[1]['count'],
        reverse=True
    )

    print(f"\n🏪 Building dictionary...")
    print(f"\n{'Normalized':<30} | {'Count':>6} | {'Display Name':<20} | {'Category':<20}")
    print("-" * 100)

    added_count = 0
    for normalized, stats in sorted_merchants:
        # Pick most common display name
        display_name = max(stats['display_names'], key=lambda x: len(x)) if stats['display_names'] else normalized.title()

        # Suggest category
        category = suggest_category(normalized, display_name)

        # Add to dictionary
        merchant_id = dictionary.add_merchant(
            normalized_merchant=normalized,
            canonical_name=display_name,
            category=category,
            aliases=[normalized]
        )

        print(f"{normalized[:30]:<30} | {stats['count']:>6} | {display_name:<20} | {category:<20}")
        added_count += 1

    # Save dictionary
    dictionary.save()

    print(f"\n✓ Dictionary built with {added_count} merchants")
    print(f"✓ Saved to {dictionary_path}")

    # Show stats
    dict_stats = dictionary.get_stats()
    print(f"\nDictionary stats:")
    print(f"  Unique merchants: {dict_stats['unique_merchants']}")
    print(f"  Total aliases: {dict_stats['total_aliases']}")

    return dictionary


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 build_dictionary.py <transactions-json> [dictionary-output]")
        print("Example: python3 build_dictionary.py scrubbed-CIBC-Statement---Nov-25.json")
        sys.exit(1)

    transactions_file = sys.argv[1]
    dictionary_path = sys.argv[2] if len(sys.argv) > 2 else 'merchant_dictionary.json'

    build_dictionary_from_transactions(transactions_file, dictionary_path, min_transaction_count=1)
