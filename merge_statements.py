#!/usr/bin/env python3
"""
Merge multiple bank statement JSONs with deduplication

Deduplication Strategy (Option A):
- Auto-remove exact matches: (date, normalized_merchant, amount)
- Flag fuzzy matches: same date/merchant but amount differs by < $0.05
- Prevent same file uploads by checking source_file

Usage: python3 merge_statements.py <json1> <json2> [json3...] [--output merged.json]
"""

import sys
import json
from typing import List, Dict, Any, Tuple
from datetime import datetime
from collections import defaultdict


def load_statement_json(path: str) -> Dict[str, Any]:
    """Load and validate statement JSON."""
    with open(path, 'r') as f:
        data = json.load(f)

    if 'transactions' not in data:
        raise ValueError(f"Invalid JSON: {path} missing 'transactions' field")

    return data


def check_duplicate_files(statements: List[Dict[str, Any]]) -> List[str]:
    """Check for duplicate source files by name."""
    seen_files = {}
    duplicates = []

    for stmt in statements:
        source = stmt.get('source_file', '')
        # Extract just filename without path
        filename = source.split('/')[-1] if source else 'unknown'

        if filename in seen_files:
            duplicates.append(filename)
        else:
            seen_files[filename] = source

    return duplicates


def create_transaction_key(txn: Dict[str, Any], fuzzy: bool = False) -> Tuple:
    """
    Create deduplication key for transaction.

    Args:
        txn: Transaction dict
        fuzzy: If True, round amount to nearest $0.05 for fuzzy matching

    Returns:
        Tuple of (date, normalized_merchant, amount)
    """
    date = txn.get('date', '')
    merchant = txn.get('normalized_merchant', '').lower().strip()
    amount = txn.get('amount', 0.0)

    if fuzzy:
        # Round to nearest nickel for fuzzy matching
        amount = round(amount * 20) / 20  # 1/20 = 0.05

    return (date, merchant, amount)


def deduplicate_transactions(transactions: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Deduplicate transactions using exact match strategy.

    Returns:
        (unique_transactions, deduplication_stats)
    """
    exact_matches = {}  # key -> first occurrence
    fuzzy_groups = defaultdict(list)  # fuzzy_key -> [transactions with different amounts]

    duplicates_removed = 0
    fuzzy_matches = []

    # First pass: identify exact duplicates and fuzzy candidates
    for txn in transactions:
        exact_key = create_transaction_key(txn, fuzzy=False)

        if exact_key in exact_matches:
            # Exact duplicate - skip this one
            duplicates_removed += 1
            continue

        # Store first occurrence
        exact_matches[exact_key] = txn

        # Also track by fuzzy key for potential fuzzy matches
        fuzzy_key = create_transaction_key(txn, fuzzy=True)
        fuzzy_groups[fuzzy_key].append(txn)

    # Second pass: identify fuzzy matches (same date/merchant, different amounts within $0.05)
    for fuzzy_key, group in fuzzy_groups.items():
        if len(group) > 1:
            # Multiple transactions with same date/merchant but slightly different amounts
            # These are potential duplicates that need review
            date, merchant, _ = fuzzy_key
            amounts = [t.get('amount', 0) for t in group]

            if max(amounts) - min(amounts) <= 0.05:
                fuzzy_matches.append({
                    'date': date,
                    'merchant': merchant,
                    'transactions': group,
                    'amount_variance': round(max(amounts) - min(amounts), 2)
                })

    unique_transactions = list(exact_matches.values())

    stats = {
        'total_input': len(transactions),
        'exact_duplicates_removed': duplicates_removed,
        'unique_transactions': len(unique_transactions),
        'fuzzy_matches_flagged': len(fuzzy_matches),
        'fuzzy_match_details': fuzzy_matches
    }

    return unique_transactions, stats


def parse_date(date_str: str) -> datetime:
    """
    Parse date from various formats (Nov 3, 27Oct, etc).
    Returns datetime for sorting. Uses current year as default.
    """
    import re

    # Current year as fallback
    current_year = datetime.now().year

    # Format: "Nov 3" or "Nov 15"
    match = re.match(r'([A-Za-z]+)\s*(\d+)', date_str)
    if match:
        month_str, day_str = match.groups()
        try:
            date_obj = datetime.strptime(f"{month_str} {day_str} {current_year}", "%b %d %Y")
            return date_obj
        except ValueError:
            pass

    # Format: "27Oct" or "3Nov"
    match = re.match(r'(\d+)([A-Za-z]+)', date_str)
    if match:
        day_str, month_str = match.groups()
        try:
            date_obj = datetime.strptime(f"{day_str} {month_str} {current_year}", "%d %b %Y")
            return date_obj
        except ValueError:
            pass

    # Fallback: return epoch
    return datetime(1970, 1, 1)


def merge_statements(json_paths: List[str]) -> Dict[str, Any]:
    """
    Merge multiple statement JSONs with deduplication.

    Args:
        json_paths: List of paths to statement JSON files

    Returns:
        Merged JSON with metadata
    """
    print(f"📂 Loading {len(json_paths)} statement(s)...\n")

    statements = []
    for path in json_paths:
        try:
            stmt = load_statement_json(path)
            statements.append(stmt)
            txn_count = len(stmt.get('transactions', []))
            source = stmt.get('source_file', path).split('/')[-1]
            print(f"  ✓ {source}: {txn_count} transactions")
        except Exception as e:
            print(f"  ✗ Error loading {path}: {e}")
            sys.exit(1)

    # Check for duplicate files (only if multiple files)
    if len(statements) > 1:
        print("\n🔍 Checking for duplicate files...")
        duplicates = check_duplicate_files(statements)
        if duplicates:
            print(f"⚠️  WARNING: Duplicate files detected:")
            for dup in duplicates:
                print(f"  - {dup}")
            print("\n⚠️  Please upload different statements to avoid duplicate data.")
            # Non-interactive mode: just warn but continue
            print("  ⚠️  Continuing with merge...")
        else:
            print("  ✓ No duplicate files detected")
    else:
        print("\n✓ Single file - no deduplication needed")

    # Collect all transactions
    all_transactions = []
    statement_metadata = []

    for stmt in statements:
        transactions = stmt.get('transactions', [])
        all_transactions.extend(transactions)

        statement_metadata.append({
            'source_file': stmt.get('source_file', 'unknown').split('/')[-1],
            'extracted_at': stmt.get('extracted_at', ''),
            'transaction_count': len(transactions)
        })

    print(f"\n📊 Total transactions collected: {len(all_transactions)}")

    # Deduplicate
    print("\n🔄 Deduplicating transactions...")
    unique_transactions, dedup_stats = deduplicate_transactions(all_transactions)

    print(f"  ✓ Removed {dedup_stats['exact_duplicates_removed']} exact duplicates")
    print(f"  ✓ {dedup_stats['unique_transactions']} unique transactions remain")

    if dedup_stats['fuzzy_matches_flagged'] > 0:
        print(f"\n⚠️  {dedup_stats['fuzzy_matches_flagged']} fuzzy matches detected (review recommended):")
        for match in dedup_stats['fuzzy_match_details'][:5]:  # Show first 5
            print(f"    {match['date']} | {match['merchant']} | {len(match['transactions'])} txns | variance: ${match['amount_variance']}")
        if dedup_stats['fuzzy_matches_flagged'] > 5:
            print(f"    ... and {dedup_stats['fuzzy_matches_flagged'] - 5} more")

    # Sort by date
    print("\n📅 Sorting transactions chronologically...")
    unique_transactions.sort(key=lambda t: parse_date(t.get('date', '')))

    # Determine date range
    if unique_transactions:
        first_date = unique_transactions[0].get('date', 'Unknown')
        last_date = unique_transactions[-1].get('date', 'Unknown')
        date_range = f"{first_date} - {last_date}"
    else:
        date_range = "No transactions"

    print(f"  ✓ Date range: {date_range}")

    # Update statement metadata with deduplication info
    for meta in statement_metadata:
        meta['duplicates_removed'] = 0  # Will be updated if we track per-statement

    # Build merged result
    merged = {
        'merged_at': datetime.now().isoformat(),
        'statements_processed': statement_metadata,
        'period': {
            'start': unique_transactions[0].get('date', '') if unique_transactions else '',
            'end': unique_transactions[-1].get('date', '') if unique_transactions else ''
        },
        'deduplication_stats': {
            'total_input_transactions': dedup_stats['total_input'],
            'exact_duplicates_removed': dedup_stats['exact_duplicates_removed'],
            'fuzzy_matches_flagged': dedup_stats['fuzzy_matches_flagged'],
            'unique_transactions': dedup_stats['unique_transactions']
        },
        'fuzzy_matches': dedup_stats['fuzzy_match_details'],
        'transactions': unique_transactions
    }

    return merged


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 merge_statements.py <json1> <json2> [json3...] [--output merged.json]")
        print("Example: python3 merge_statements.py final-test.json rbc-test.json --output merged-statements.json")
        sys.exit(1)

    # Parse arguments
    args = sys.argv[1:]
    output_path = 'merged-statements.json'
    json_paths = []

    i = 0
    while i < len(args):
        if args[i] == '--output' and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            json_paths.append(args[i])
            i += 1

    if len(json_paths) < 2:
        print("❌ Error: Need at least 2 statement files to merge")
        sys.exit(1)

    # Merge statements
    merged_data = merge_statements(json_paths)

    # Save result
    print(f"\n💾 Saving merged results to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(merged_data, f, indent=2)

    print(f"✓ Saved successfully")

    # Summary
    print("\n" + "="*50)
    print("📊 MERGE SUMMARY")
    print("="*50)
    print(f"Statements processed: {len(merged_data['statements_processed'])}")
    print(f"Date range: {merged_data['period']['start']} → {merged_data['period']['end']}")
    print(f"Total transactions: {merged_data['deduplication_stats']['unique_transactions']}")
    print(f"Duplicates removed: {merged_data['deduplication_stats']['exact_duplicates_removed']}")
    if merged_data['deduplication_stats']['fuzzy_matches_flagged'] > 0:
        print(f"⚠️  Fuzzy matches: {merged_data['deduplication_stats']['fuzzy_matches_flagged']} (needs review)")
    print("="*50)


if __name__ == '__main__':
    main()
