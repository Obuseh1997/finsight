#!/usr/bin/env python3
"""
Layer 2: Merchant Dictionary System
Maps normalized merchant strings to canonical merchant IDs

This is the "intelligence layer" that provides:
- Stable merchant IDs
- Canonical merchant names
- Category assignments
- Alias management

100% LOCAL - dictionary lookup, no API calls at runtime
"""

import json
import os
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dictionary_guardrails import DictionaryGuardrails


class MerchantDictionary:
    """
    Manages merchant mappings from normalized strings to canonical merchant data.

    Dictionary format:
    {
        "normalized_string": {
            "merchant_id": "merchant_uber_001",
            "canonical_name": "Uber",
            "category": "Transportation",
            "aliases": ["uber", "uber ube", "uber eats"],
            "created_at": "2025-12-17T...",
            "transaction_count": 150,
            "total_spend": 1234.56
        }
    }
    """

    def __init__(self, dictionary_path: str = 'merchant_dictionary.json'):
        self.dictionary_path = dictionary_path
        self.dictionary = self._load_dictionary()

    def _load_dictionary(self) -> Dict[str, Dict[str, Any]]:
        """Load dictionary from JSON file, or return empty dict if not exists."""
        if os.path.exists(self.dictionary_path):
            with open(self.dictionary_path, 'r') as f:
                return json.load(f)
        return {}

    def save(self):
        """Save dictionary to JSON file."""
        with open(self.dictionary_path, 'w') as f:
            json.dump(self.dictionary, f, indent=2)

    def lookup(self, normalized_merchant: str) -> Optional[Dict[str, Any]]:
        """
        Look up merchant by normalized string.
        Returns merchant data if found, None otherwise.
        """
        return self.dictionary.get(normalized_merchant)

    def add_merchant(self,
                     normalized_merchant: str,
                     canonical_name: str,
                     category: str = "Uncategorized",
                     aliases: Optional[List[str]] = None) -> str:
        """
        Add a new merchant to the dictionary.

        Args:
            normalized_merchant: The normalized string (e.g., "uber")
            canonical_name: Human-readable name (e.g., "Uber")
            category: Spending category
            aliases: List of other normalized strings for this merchant

        Returns:
            merchant_id: The generated merchant ID
        """
        # Generate merchant ID
        merchant_id = f"merchant_{normalized_merchant.replace(' ', '_')}_{len(self.dictionary) + 1:03d}"

        # Create merchant entry
        merchant_data = {
            "merchant_id": merchant_id,
            "canonical_name": canonical_name,
            "category": category,
            "aliases": aliases or [normalized_merchant],
            "created_at": datetime.now().isoformat(),
            "transaction_count": 0,
            "total_spend": 0.0
        }

        # Add to dictionary for all aliases
        for alias in merchant_data['aliases']:
            self.dictionary[alias] = merchant_data

        return merchant_id

    def update_stats(self, normalized_merchant: str, amount: float):
        """Update transaction count and total spend for a merchant."""
        merchant_data = self.lookup(normalized_merchant)
        if merchant_data:
            merchant_data['transaction_count'] += 1
            merchant_data['total_spend'] += abs(amount)
            merchant_data['last_seen'] = datetime.now().isoformat()
            merchant_data['updated_at'] = datetime.now().isoformat()

    def get_unmatched_merchants(self, transactions: List[Dict[str, Any]]) -> List[str]:
        """
        Find all normalized merchants that don't have dictionary entries.
        Returns list of unmatched normalized merchant strings.
        """
        normalized_merchants = set()
        for t in transactions:
            normalized = t.get('normalized_merchant', '')
            if normalized and normalized != 'unknown':
                normalized_merchants.add(normalized)

        unmatched = []
        for normalized in normalized_merchants:
            if not self.lookup(normalized):
                unmatched.append(normalized)

        return sorted(unmatched)

    def get_stats(self) -> Dict[str, Any]:
        """Get dictionary statistics."""
        unique_merchants = set()
        for key, merchant_data in self.dictionary.items():
            # Handle both old format (with merchant_id) and new format (without)
            if isinstance(merchant_data, dict):
                merchant_id = merchant_data.get('merchant_id') or merchant_data.get('canonical_name') or key
            else:
                merchant_id = key
            unique_merchants.add(merchant_id)

        return {
            'unique_merchants': len(unique_merchants),
            'total_aliases': len(self.dictionary),
            'average_aliases_per_merchant': len(self.dictionary) / len(unique_merchants) if unique_merchants else 0
        }

    def learn_from_user_edit(self,
                            normalized_merchant: str,
                            canonical_name: str,
                            category: Optional[str] = None,
                            transaction: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
        """
        Learn from a user's merchant correction.

        Args:
            normalized_merchant: Normalized merchant string
            canonical_name: User-provided canonical name
            category: User-provided category (optional)
            transaction: Original transaction (for validation)

        Returns:
            (success: bool, message: str)
        """
        # Apply guardrails
        if transaction:
            should_exclude, reason = DictionaryGuardrails.should_exclude_transaction(transaction)
            if should_exclude:
                return False, f"Transaction excluded: {reason}"

        should_exclude_merchant, reason = DictionaryGuardrails.should_exclude_merchant(
            normalized_merchant, canonical_name
        )
        if should_exclude_merchant:
            return False, f"Merchant excluded: {reason}"

        # Validate category
        if category and not DictionaryGuardrails.validate_category(category):
            return False, f"Invalid category: {category}"

        # Check if merchant already exists
        existing = self.lookup(normalized_merchant)

        if existing:
            # Update existing merchant
            existing['canonical_name'] = canonical_name
            if category:
                existing['category'] = category
            existing['updated_at'] = datetime.now().isoformat()
            existing['updated_by'] = 'user_edit'

            # Add to version history
            if 'version' not in existing:
                existing['version'] = 1
            existing['version'] += 1

            if 'change_history' not in existing:
                existing['change_history'] = []

            existing['change_history'].append({
                'date': datetime.now().isoformat(),
                'change': 'user_correction',
                'canonical_name': canonical_name,
                'category': category
            })

            # Keep history limited to last 10 changes
            if len(existing['change_history']) > 10:
                existing['change_history'] = existing['change_history'][-10:]

            return True, f"Updated existing merchant: {canonical_name}"

        else:
            # Create new merchant
            merchant_id = self.add_merchant(
                normalized_merchant=normalized_merchant,
                canonical_name=canonical_name,
                category=category or "Other",
                aliases=[normalized_merchant]
            )

            # Mark as user-created
            merchant_data = self.lookup(normalized_merchant)
            if merchant_data:
                merchant_data['created_by'] = 'user_edit'
                merchant_data['updated_by'] = 'user_edit'
                merchant_data['version'] = 1

            return True, f"Created new merchant: {canonical_name} (ID: {merchant_id})"

    def fuzzy_lookup(self, normalized_merchant: str, threshold: float = 0.7) -> Optional[Dict[str, Any]]:
        """
        Fuzzy lookup - find merchants that are similar to the given string.

        Args:
            normalized_merchant: Normalized merchant to search for
            threshold: Minimum similarity score (0.0 to 1.0)

        Returns:
            Best matching merchant data, or None
        """
        best_match = None
        best_score = 0.0

        for alias, merchant_data in self.dictionary.items():
            score = DictionaryGuardrails.fuzzy_match_score(normalized_merchant, alias)

            if score > best_score and score >= threshold:
                best_score = score
                best_match = merchant_data

        return best_match

    def archive_old_merchants(self) -> int:
        """
        Archive merchants that haven't been seen in a long time.

        Returns:
            Number of merchants archived
        """
        to_archive = []

        unique_merchants = {}
        for alias, merchant_data in self.dictionary.items():
            merchant_id = merchant_data['merchant_id']
            unique_merchants[merchant_id] = merchant_data

        for merchant_id, merchant_data in unique_merchants.items():
            if DictionaryGuardrails.should_archive_merchant(merchant_data):
                to_archive.append(merchant_id)

        # Remove archived merchants
        for merchant_id in to_archive:
            aliases_to_remove = []
            for alias, merchant_data in self.dictionary.items():
                if merchant_data['merchant_id'] == merchant_id:
                    aliases_to_remove.append(alias)

            for alias in aliases_to_remove:
                del self.dictionary[alias]

        return len(to_archive)


def match_transactions_to_dictionary(transactions: List[Dict[str, Any]],
                                     dictionary: MerchantDictionary) -> List[Dict[str, Any]]:
    """
    Match transactions to merchant dictionary.

    Adds to each transaction:
        - merchant_id: Canonical merchant ID
        - canonical_name: Canonical merchant name
        - category: Merchant category
        - matched: True if found in dictionary, False otherwise

    Args:
        transactions: List of transactions with normalized_merchant field
        dictionary: MerchantDictionary instance

    Returns:
        Updated transactions with merchant_id, canonical_name, category
    """
    matched_transactions = []

    for t in transactions:
        transaction = t.copy()
        normalized = transaction.get('normalized_merchant', '')

        merchant_data = dictionary.lookup(normalized)

        if merchant_data:
            # Matched in dictionary
            transaction['merchant_id'] = merchant_data['merchant_id']
            transaction['canonical_name'] = merchant_data['canonical_name']
            transaction['category'] = merchant_data['category']
            transaction['matched'] = True

            # Update stats
            amount = transaction.get('amount', 0)
            dictionary.update_stats(normalized, amount)
        else:
            # Unmatched
            transaction['merchant_id'] = f"unmatched_{normalized}"
            transaction['canonical_name'] = transaction.get('merchant_display', normalized.title())
            transaction['category'] = "Uncategorized"
            transaction['matched'] = False

        matched_transactions.append(transaction)

    return matched_transactions


if __name__ == '__main__':
    # Example usage
    print("=" * 80)
    print("MERCHANT DICTIONARY - EXAMPLE USAGE")
    print("=" * 80)

    # Create dictionary
    dictionary = MerchantDictionary('example_merchant_dictionary.json')

    # Add some merchants
    print("\n1. Adding merchants to dictionary...")
    dictionary.add_merchant("uber", "Uber", "Transportation", aliases=["uber", "uber ube", "uber eats"])
    dictionary.add_merchant("wealthsimple", "Wealthsimple", "Transfers", aliases=["wealthsimple", "wealthsimple investments"])
    dictionary.add_merchant("starbucks", "Starbucks", "Food & Dining")
    dictionary.add_merchant("goodlife fitness centres", "GoodLife Fitness", "Health & Fitness")

    print(f"✓ Added {len(dictionary.dictionary)} aliases for merchants")

    # Example transactions
    example_transactions = [
        {"normalized_merchant": "uber", "merchant_display": "Uber", "amount": -21.59},
        {"normalized_merchant": "uber ube", "merchant_display": "Uber", "amount": -18.00},
        {"normalized_merchant": "starbucks", "merchant_display": "Starbucks", "amount": -5.50},
        {"normalized_merchant": "sportchek", "merchant_display": "SportChek", "amount": -89.99},  # Unmatched
    ]

    # Match transactions
    print("\n2. Matching transactions to dictionary...")
    matched = match_transactions_to_dictionary(example_transactions, dictionary)

    print(f"\nMatched transactions:")
    for t in matched:
        status = "✓" if t['matched'] else "✗"
        print(f"  {status} {t['normalized_merchant']:20} -> {t['canonical_name']:20} ({t['category']})")

    # Save dictionary
    dictionary.save()
    print(f"\n✓ Dictionary saved to {dictionary.dictionary_path}")

    # Stats
    stats = dictionary.get_stats()
    print(f"\nDictionary stats:")
    print(f"  Unique merchants: {stats['unique_merchants']}")
    print(f"  Total aliases: {stats['total_aliases']}")
    print(f"  Avg aliases/merchant: {stats['average_aliases_per_merchant']:.1f}")
