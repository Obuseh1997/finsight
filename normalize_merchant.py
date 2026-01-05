#!/usr/bin/env python3
"""
Layer 1: Deterministic Merchant Normalization
Collapses transaction descriptions into stable, comparable strings
100% LOCAL - no API calls, fully deterministic
"""

import re
from typing import Dict, Any


# Bank noise patterns to remove
BANK_NOISE_PATTERNS = [
    r'\[ref\]',
    r'\[name\]',
    r'\[conversion\]',
    r'\[recipient\]',
    r'visa\s+purchase',
    r'visa\s+debit',
    r'visa\s+purchase\s*-*\s*',
    r'visa\s+debit\s*-*\s*',
    r'preauthorized\s+payment\s*-*\s*',
    r'preauthorized\s*-*\s*',
    r'contactless\s+interac',
    r'contactless',
    r'pos\s+purchase',
    r'online\s+banking\s+payment\s+to',
    r'online\s+banking',
    r'internet\s+transfer',
    r'e-transfer',
    r'interac\s+purchase',
    r'interacpurchase',
    r'onlinebankingpayment',
    r'retail\s+purchase',
    r'billpayment\s+',  # Remove BillPayment prefix
    r'payrolldeposit\s+',  # Remove PayrollDeposit prefix
    r'\s+investments\s+inc\.?',  # Remove "Investments Inc" suffix (e.g., Wealthsimple)
]

# Corporate suffixes and common words to remove
STOPWORDS = [
    'inc', 'ltd', 'llc', 'corp', 'corporation', 'company', 'co',
    'canada', 'canadian', 'the', 'and', 'of', 'for',
    'services', 'service', 'group', 'international', 'intl',
    'payment', 'purchase', 'transfer', 'deposit', 'withdrawal',
    'bill', 'payroll'  # Transaction type prefixes
]


def split_camel_case(text: str) -> str:
    """
    Split camelCase and compound words.

    Examples:
        "LaMaisonSimons" -> "La Maison Simons"
        "UniqloRideauC" -> "Uniqlo Rideau C"
        "BELLONEBILLOnlineBankingpayment" -> "BELL ONE BILL Online Bankingpayment"
    """
    # Insert space before uppercase letters that follow lowercase letters
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    # Insert space between consecutive uppercase letters followed by lowercase
    text = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', text)
    return text


def normalize_merchant(description: str) -> str:
    """
    Layer 1: Deterministic normalization

    Transforms bank description into a stable, comparable string by:
    1. Splitting camelCase words
    2. Lowercasing
    3. Removing bank noise (VISA PURCHASE, POS, etc.)
    4. Removing all digits and special characters
    5. Removing stopwords
    6. Collapsing whitespace

    Examples:
        "UBER CANADA/UBE [REF]" -> "uber"
        "Uber Canada 123456" -> "uber"
        "WEALTHSIMPLE INVESTMENTS INC" -> "wealthsimple investments"
        "GOODLIFE FITNESS CENTRES" -> "goodlife fitness centres"
        "LaMaisonSimons" -> "la maison simons"
        "BELLONEBILL14" -> "bell one bill"

    Args:
        description: Raw or PII-scrubbed transaction description

    Returns:
        Normalized merchant string (lowercase, alphanumeric, no noise)
    """
    if not description:
        return 'unknown'

    # 0. Split camelCase words first
    text = split_camel_case(description)

    # 1. Lowercase everything
    text = text.lower()

    # 2. Remove bank noise patterns
    for pattern in BANK_NOISE_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # 2.5. Special handling for "onebill" - extract company name
    if 'onebill' in text:
        # Extract the company name before "onebill"
        match = re.search(r'([a-z]+)\s*onebill', text, re.IGNORECASE)
        if match:
            text = match.group(1)

    # 3. Remove all digits (transaction IDs, reference numbers, etc.)
    text = re.sub(r'\d+', '', text)

    # 4. Remove special characters, keep only letters and spaces
    text = re.sub(r'[^a-z\s]', ' ', text)

    # 5. Split into words
    words = text.split()

    # 6. Remove stopwords and short words (less than 3 chars)
    words = [w for w in words if w not in STOPWORDS and len(w) >= 3]

    # 7. Collapse whitespace and return
    normalized = ' '.join(words).strip()

    # Return 'unknown' if nothing left after normalization
    return normalized if normalized else 'unknown'


def extract_merchant_display_name(description: str) -> str:
    """
    Extract a human-readable merchant name from the description.
    This is less aggressive than normalize_merchant() - keeps some context.

    Used for display purposes while normalized_merchant is used for grouping.

    Examples:
        "UBER CANADA/UBE [REF]" -> "Uber"
        "WEALTHSIMPLE INVESTMENTS INC" -> "Wealthsimple Investments"
        "GOODLIFE FITNESS CENTRES" -> "Goodlife Fitness"
        "LaMaisonSimons Interacpurchase-7088" -> "La Maison Simons"
        "BELLONEBILL14" -> "Bell"
        "INTERNET TRANSFER [REF]" -> "Internal Transfer"
        "PREAUTHORIZED DEBIT 1234 CIBC Securities Inc." -> "CIBC Securities"
    """
    if not description:
        return 'Unknown'

    # Handle special transfer types BEFORE other processing
    desc_lower = description.lower()

    # Internal transfers (within same bank)
    if 'internet transfer' in desc_lower or 'fulfill request' in desc_lower:
        return 'Internal Transfer'

    # Interac e-Transfers (to other people)
    if 'e-transfer' in desc_lower or 'interac e-transfer' in desc_lower:
        return 'Interac e-Transfer'

    # Preauthorized debits - extract the actual merchant after the reference number
    if 'preauthorized debit' in desc_lower or 'preauthorized payment' in desc_lower:
        # Pattern: PREAUTHORIZED DEBIT 1234567890 Merchant Name
        # OR: PREAUTHORIZED DEBIT Merchant Name (no number)
        match = re.search(r'preauthorized (?:debit|payment)\s+(?:\d+\s+)?(.+)', description, re.IGNORECASE)
        if match:
            merchant_part = match.group(1).strip()
            if merchant_part:  # Only use if we extracted something
                # Continue processing the merchant part
                description = merchant_part

    # Split camelCase first
    text = split_camel_case(description)

    # Remove bank noise patterns
    for pattern in BANK_NOISE_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Remove [REF], [NAME], etc.
    text = re.sub(r'\[.*?\]', '', text)

    # Remove trailing reference codes like -7088, -0642
    text = re.sub(r'-\d{4}$', '', text)

    # Remove leading dashes and whitespace
    text = re.sub(r'^[\s\-]+', '', text)

    # Remove long digit sequences (8+ digits)
    text = re.sub(r'\d{8,}', '', text)

    # Special case: "BELLONEBILL14" or similar -> extract "Bell"
    if 'onebill' in text.lower():
        # Extract the company name before "onebill"
        match = re.search(r'([A-Za-z\s]+)(?:onebill)', text, re.IGNORECASE)
        if match:
            text = match.group(1)

    # Clean up whitespace
    text = ' '.join(text.split()).strip()

    # Remove stopwords from display (only obvious transaction types, not company suffixes)
    display_stopwords = ['bill', 'payroll', 'payment', 'deposit']
    words_temp = text.split()
    words_cleaned = [w for w in words_temp if w.lower() not in display_stopwords or len(words_temp) == 1]
    text = ' '.join(words_cleaned)

    # Title case for display
    # But handle common all-caps merchants specially
    words = text.split()
    display_words = []

    # Known merchant dictionary for proper casing
    proper_case_merchants = {
        'uber': 'Uber',
        'spotify': 'Spotify',
        'netflix': 'Netflix',
        'amazon': 'Amazon',
        'google': 'Google',
        'apple': 'Apple',
        'starbucks': 'Starbucks',
        'mcdonalds': "McDonald's",
        'goodlife': 'GoodLife',
        'wealthsimple': 'Wealthsimple',
        'cibc': 'CIBC',
        'rbc': 'RBC',
        'bell': 'Bell',
        'rogers': 'Rogers',
        'telus': 'Telus',
        'uniqlo': 'Uniqlo',
        'simons': 'Simons'
    }

    for word in words:
        # Keep known merchants in their proper case
        word_lower = word.lower()
        if word_lower in proper_case_merchants:
            display_words.append(proper_case_merchants[word_lower])
        elif word.isupper() and len(word) > 3:
            # Likely a merchant name in all caps - title case it
            display_words.append(word.capitalize())
        else:
            display_words.append(word)

    display_name = ' '.join(display_words[:5])  # Limit to first 5 words

    return display_name if display_name else 'Unknown'


def add_normalization_to_transaction(transaction: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add normalized merchant fields to a transaction.

    Adds:
        - normalized_merchant: For grouping/matching (e.g., "uber")
        - merchant_display: For human display (e.g., "Uber")

    Keeps existing 'merchant' field for backward compatibility.
    """
    # IMPORTANT: Use the 'merchant' field if available (extracted before PII scrubbing)
    # Fall back to description only if merchant is missing or "Unknown"
    merchant = transaction.get('merchant', '')
    description = transaction.get('description', '')

    # Choose source for normalization
    # Prefer merchant field (already extracted) over description (may be scrubbed)
    source = merchant if merchant and merchant != 'Unknown' else description

    # Add normalized merchant (for grouping)
    transaction['normalized_merchant'] = normalize_merchant(source)

    # Add display name (for UI)
    transaction['merchant_display'] = extract_merchant_display_name(source)

    return transaction


if __name__ == '__main__':
    # Test examples
    test_descriptions = [
        "UBER CANADA/UBE [REF]",
        "Uber Canada 123456",
        "WEALTHSIMPLE INVESTMENTS INC",
        "GOODLIFE FITNESS CENTRES",
        "VISA PURCHASE - STARBUCKS 12345",
        "PREAUTHORIZED PAYMENT - SPOTIFY",
        "E-TRANSFER [REF] [RECIPIENT]",
        "CIBC VISA DEBIT PURCHASE - MARKS",
        "SPORTCHEK #1234",
        "Online Banking payment to Wealthsimple",
    ]

    print("=" * 80)
    print("MERCHANT NORMALIZATION TESTS")
    print("=" * 80)

    for desc in test_descriptions:
        normalized = normalize_merchant(desc)
        display = extract_merchant_display_name(desc)
        print(f"\nOriginal:   {desc}")
        print(f"Normalized: {normalized}")
        print(f"Display:    {display}")
