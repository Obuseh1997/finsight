#!/usr/bin/env python3
"""
Guardrails for merchant dictionary management
Ensures quality, consistency, and privacy of dictionary entries
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


class DictionaryGuardrails:
    """Guardrails for merchant dictionary management"""

    # Exclusion patterns - transactions that should NEVER go in dictionary
    EXCLUDED_TYPES = ['credit']  # No income/refunds

    EXCLUDED_MERCHANTS = [
        'unknown', 'debit', 'credit', 'payment', 'purchase',
        'interac', 'transfer', 'withdrawal', 'deposit'
    ]

    EXCLUDED_PATTERNS = [
        r'^e-transfer',
        r'^internet transfer',
        r'^interac',
        r'monthly fee',
        r'service charge',
        r'nsf fee',
        r'overdraft',
        r'interest charge',
        r'annual fee'
    ]

    # Quality thresholds
    MIN_OCCURRENCES = 2  # Must appear at least twice
    MIN_TOTAL_SPEND = 5.00  # Must have spent at least $5 total
    MAX_ALIASES_PER_MERCHANT = 10  # Prevent bloat
    MAX_DICTIONARY_SIZE = 1000  # Reasonable limit for personal finance

    # Confidence boosting
    EXACT_MATCH_BOOST = 35
    ALIAS_MATCH_BOOST = 30
    FUZZY_MATCH_BOOST = 20
    MAX_CONFIDENCE = 95  # Never 100% - always allow override

    # Archive threshold
    ARCHIVE_AFTER_DAYS = 365  # Archive merchants not seen in 1 year

    # Valid categories (must match review UI)
    VALID_CATEGORIES = [
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
    ]

    @staticmethod
    def should_exclude_transaction(transaction: Dict) -> tuple[bool, str]:
        """
        Check if transaction should be excluded from dictionary.

        Returns:
            (should_exclude: bool, reason: str)
        """
        # Exclude credits by default
        if transaction.get('type') == 'credit':
            return True, "credit_transaction"

        # Exclude transfers and similar
        desc = transaction.get('description', '').lower()
        normalized = transaction.get('normalized_merchant', '').lower()

        for pattern in DictionaryGuardrails.EXCLUDED_PATTERNS:
            if re.search(pattern, desc):
                return True, f"excluded_pattern_{pattern}"

        # Exclude generic merchants
        if normalized in DictionaryGuardrails.EXCLUDED_MERCHANTS:
            return True, f"generic_merchant_{normalized}"

        # Exclude very short normalized merchants (likely noise)
        if len(normalized) < 3:
            return True, "too_short"

        return False, ""

    @staticmethod
    def should_exclude_merchant(normalized_merchant: str, merchant_display: str) -> tuple[bool, str]:
        """
        Check if merchant name should be excluded from dictionary.

        Returns:
            (should_exclude: bool, reason: str)
        """
        normalized = normalized_merchant.lower()

        # Exclude generic terms
        if normalized in DictionaryGuardrails.EXCLUDED_MERCHANTS:
            return True, f"generic_merchant_{normalized}"

        # Exclude very short merchants
        if len(normalized) < 3:
            return True, "too_short"

        # Exclude if display name is just numbers or reference codes
        if re.match(r'^[\d\-]+$', merchant_display):
            return True, "reference_code"

        return False, ""

    @staticmethod
    def meets_quality_threshold(merchant_data: Dict) -> bool:
        """Check if merchant meets quality threshold for dictionary"""
        return (
            merchant_data.get('transaction_count', 0) >= DictionaryGuardrails.MIN_OCCURRENCES
            and merchant_data.get('total_spend', 0) >= DictionaryGuardrails.MIN_TOTAL_SPEND
        )

    @staticmethod
    def validate_category(category: str) -> bool:
        """Validate category against allowed list"""
        return category in DictionaryGuardrails.VALID_CATEGORIES

    @staticmethod
    def calculate_match_confidence(base_confidence: int, match_type: str) -> int:
        """
        Calculate confidence with dictionary match boost.

        Args:
            base_confidence: Base confidence score (0-100)
            match_type: 'exact', 'alias', or 'fuzzy'

        Returns:
            Boosted confidence score (capped at MAX_CONFIDENCE)
        """
        boost = {
            'exact': DictionaryGuardrails.EXACT_MATCH_BOOST,
            'alias': DictionaryGuardrails.ALIAS_MATCH_BOOST,
            'fuzzy': DictionaryGuardrails.FUZZY_MATCH_BOOST
        }.get(match_type, 0)

        return min(DictionaryGuardrails.MAX_CONFIDENCE, base_confidence + boost)

    @staticmethod
    def should_archive_merchant(merchant_data: Dict) -> bool:
        """
        Check if merchant should be archived (not used in long time).

        Returns:
            True if merchant should be archived
        """
        if 'last_seen' not in merchant_data:
            return False

        last_seen = datetime.fromisoformat(merchant_data['last_seen'])
        threshold = datetime.now() - timedelta(days=DictionaryGuardrails.ARCHIVE_AFTER_DAYS)

        return last_seen < threshold

    @staticmethod
    def fuzzy_match_score(normalized1: str, normalized2: str) -> float:
        """
        Calculate fuzzy match score between two normalized merchants.

        Returns:
            Score from 0.0 (no match) to 1.0 (perfect match)
        """
        # Exact match
        if normalized1 == normalized2:
            return 1.0

        # One contains the other
        if normalized1 in normalized2 or normalized2 in normalized1:
            # Calculate overlap percentage
            shorter = min(len(normalized1), len(normalized2))
            longer = max(len(normalized1), len(normalized2))
            return shorter / longer

        # Check word overlap
        words1 = set(normalized1.split())
        words2 = set(normalized2.split())

        if not words1 or not words2:
            return 0.0

        overlap = len(words1 & words2)
        total = len(words1 | words2)

        return overlap / total if total > 0 else 0.0

    @staticmethod
    def sanitize_merchant_name(merchant_name: str) -> str:
        """
        Sanitize merchant name to prevent sensitive data storage.

        - Removes potential personal names
        - Removes account numbers
        - Keeps only merchant-like names
        """
        # Remove numbers that look like account numbers (6+ consecutive digits)
        sanitized = re.sub(r'\d{6,}', '', merchant_name)

        # Remove common personal name patterns (capitalize words that are too short)
        # Keep merchant names which tend to be longer or all caps
        words = sanitized.split()
        filtered_words = []

        for word in words:
            # Keep if it's a common merchant word or longer than typical first/last name
            if len(word) > 10 or word.isupper() or word.lower() in ['uber', 'spotify', 'amazon']:
                filtered_words.append(word)
            elif len(word) >= 4:  # Keep medium-length words
                filtered_words.append(word)

        result = ' '.join(filtered_words).strip()
        return result if result else merchant_name  # Fallback to original if nothing left

    @staticmethod
    def validate_merchant_entry(merchant_data: Dict) -> tuple[bool, List[str]]:
        """
        Validate a complete merchant dictionary entry.

        Returns:
            (is_valid: bool, errors: List[str])
        """
        errors = []

        # Required fields
        required_fields = ['merchant_id', 'canonical_name', 'category', 'aliases']
        for field in required_fields:
            if field not in merchant_data:
                errors.append(f"Missing required field: {field}")

        # Validate category
        if 'category' in merchant_data:
            if not DictionaryGuardrails.validate_category(merchant_data['category']):
                errors.append(f"Invalid category: {merchant_data['category']}")

        # Validate aliases
        if 'aliases' in merchant_data:
            if not isinstance(merchant_data['aliases'], list):
                errors.append("Aliases must be a list")
            elif len(merchant_data['aliases']) > DictionaryGuardrails.MAX_ALIASES_PER_MERCHANT:
                errors.append(f"Too many aliases (max {DictionaryGuardrails.MAX_ALIASES_PER_MERCHANT})")

        # Validate counts
        if 'transaction_count' in merchant_data:
            if not isinstance(merchant_data['transaction_count'], (int, float)):
                errors.append("transaction_count must be a number")
            elif merchant_data['transaction_count'] < 0:
                errors.append("transaction_count cannot be negative")

        # Validate spend
        if 'total_spend' in merchant_data:
            if not isinstance(merchant_data['total_spend'], (int, float)):
                errors.append("total_spend must be a number")
            elif merchant_data['total_spend'] < 0:
                errors.append("total_spend cannot be negative")

        return len(errors) == 0, errors


if __name__ == '__main__':
    # Test guardrails
    print("Testing Dictionary Guardrails\n")
    print("=" * 80)

    # Test exclusions
    print("\n1. Testing Exclusions:")
    test_transactions = [
        {"type": "credit", "description": "Payroll Deposit", "normalized_merchant": "payroll"},
        {"type": "debit", "description": "E-TRANSFER sent", "normalized_merchant": "etransfer"},
        {"type": "debit", "description": "UBER CANADA", "normalized_merchant": "uber"},
        {"type": "debit", "description": "Monthly Fee", "normalized_merchant": "fee"},
    ]

    for txn in test_transactions:
        should_exclude, reason = DictionaryGuardrails.should_exclude_transaction(txn)
        status = "❌ EXCLUDE" if should_exclude else "✅ INCLUDE"
        print(f"  {status} | {txn['description'][:30]:30} | Reason: {reason}")

    # Test quality thresholds
    print("\n2. Testing Quality Thresholds:")
    test_merchants = [
        {"transaction_count": 1, "total_spend": 10.00},  # Too few occurrences
        {"transaction_count": 3, "total_spend": 2.50},   # Too low spend
        {"transaction_count": 5, "total_spend": 50.00},  # Meets threshold
    ]

    for merchant in test_merchants:
        meets = DictionaryGuardrails.meets_quality_threshold(merchant)
        status = "✅ PASS" if meets else "❌ FAIL"
        print(f"  {status} | Count: {merchant['transaction_count']}, Spend: ${merchant['total_spend']:.2f}")

    # Test fuzzy matching
    print("\n3. Testing Fuzzy Matching:")
    test_pairs = [
        ("uber", "uber"),
        ("uber", "uber ube"),
        ("amazon", "amazon prime"),
        ("starbucks", "walmart"),
    ]

    for n1, n2 in test_pairs:
        score = DictionaryGuardrails.fuzzy_match_score(n1, n2)
        print(f"  {n1:20} <-> {n2:20} = {score:.2f}")

    # Test confidence boosting
    print("\n4. Testing Confidence Boosting:")
    base = 60
    for match_type in ['exact', 'alias', 'fuzzy']:
        boosted = DictionaryGuardrails.calculate_match_confidence(base, match_type)
        print(f"  {match_type.upper():10} | Base: {base} → Boosted: {boosted}")

    print("\n" + "=" * 80)
    print("✓ All guardrail tests completed")
